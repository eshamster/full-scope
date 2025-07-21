use std::collections::HashMap;
use std::io::{BufRead, Write};
use std::path::Path;
use std::sync::{Mutex, MutexGuard, OnceLock};
use tauri::{Emitter, Manager};

const VIEWER_LABEL: &str = "viewer";
const VIEWER_PAGE: &str = "viewer";

// idとpathsを持つcommandのレスポンス用のstruct
#[derive(Clone, serde::Serialize, Debug)]
#[serde(rename_all = "camelCase")]
struct ImagePaths {
    id: i32,
    paths: Vec<String>,
}

// 直近返したIDと画像ファイルのパスを保持する
static IMAGE_PATHS: OnceLock<Mutex<ImagePaths>> = OnceLock::new();

// 画像のタグ情報をメモリに保持する
// Directory(String) > FileName(String) > Tags(Vec<String>) のマップ
type ImageTagsMap = HashMap<String, HashMap<String, Vec<String>>>;
static IMAGE_TAGS: OnceLock<Mutex<ImageTagsMap>> = OnceLock::new();

const TAG_FILE_NAME: &str = "IMAGE_TAG";
const TAG_TEMP_FILE_NAME: &str = "IMAGE_TAG_TEMP";

// メイン画面への画像ファイルのドロップを処理するTauriコマンド
// NOTE: Windows でのマルチウィンドウの問題対処のためasync関数として定義
// https://qiita.com/kemoshumai/items/f0bfff31684a157ab9f3
// 上記記事は2.0Beta版だが正式版にもKnown Issueとして記載されている
// https://docs.rs/tauri/2.2.0/tauri/webview/struct.WebviewWindowBuilder.html
#[tauri::command(async)]
async fn drop(app: tauri::AppHandle, paths: Vec<String>) -> Result<(), String> {
    let webview = app.get_webview_window(VIEWER_LABEL);
    if webview.is_none() {
        let webview = tauri::WebviewWindowBuilder::new(
            &app,
            VIEWER_LABEL,
            tauri::WebviewUrl::App(VIEWER_PAGE.to_string().into()),
        )
        .build()
        .expect("failed to build webview");

        webview.show().expect("failed to show webview");
    }

    let image_files = extract_image_files(paths);

    // Mutexでロックを取りつつIMAGE_PATHSを更新
    let mut image_paths = IMAGE_PATHS
        .get()
        .expect("failed to get IMAGE_PATHS_MUTEX")
        .lock()
        .expect("failed to lock IMAGE_PATHS_MUTEX");
    image_paths.id += 1;
    image_paths.paths = image_files.clone();

    app.emit("new-images", Some(image_paths.clone()))
        .expect("failed to emit new-images event");
    Ok(())
}

// パス文字列の配列を受け取って拡張子名から画像ファイルを抽出して返す関数
// ただし、フォルダの場合は一階層だけ中身を見て画像ファイルを抽出する
fn extract_image_files(paths: Vec<String>) -> Vec<String> {
    let mut image_files = Vec::new();
    let image_exts = ["png", "jpeg", "jpg", "gif", "webp"];

    let is_image = |path: &str| -> bool { image_exts.iter().any(|ext| path.ends_with(ext)) };

    for path in paths {
        if is_image(&path) {
            image_files.push(path);
        } else {
            let dir = std::fs::read_dir(path);
            if dir.is_err() {
                // ディレクトリでなければスキップ
                continue;
            }
            for entry in dir.unwrap() {
                let entry = entry.unwrap();
                let path = entry.path();
                if path.is_file() && is_image(path.to_str().unwrap()) {
                    image_files.push(path.to_str().unwrap().to_string());
                }
            }
        }
    }
    image_files
}

// 直近返したImagePaths を再び返すTauriコマンド
// NOTE: drop時に新規ウィンドウ作成+emitではlistenが間に合わない場合があるので
// 新規ウィンドウ側から再取得するために利用する
#[tauri::command]
fn get_prev_image_paths() -> ImagePaths {
    IMAGE_PATHS
        .get()
        .expect("failed to get IMAGE_PATHS_MUTEX")
        .lock()
        .expect("failed to lock IMAGE_PATHS_MUTEX")
        .clone()
}

// 渡されたパスのファイルをゴミ箱に移動するTauriコマンド
// TODO: クライアントに返したパスを記録してそれ以外のファイルは削除しないようにする
#[tauri::command]
fn delete_file(path: String) -> Result<(), String> {
    let path = std::path::Path::new(&path);
    if path.is_file() {
        let trash = trash::delete(path);
        if trash.is_ok() {
            Ok(())
        } else {
            Err(trash.err().unwrap().to_string())
        }
    } else {
        Err("not a file".to_string())
    }
}

// ファイル情報を取得するTauriコマンド
#[derive(serde::Serialize, Debug)]
#[serde(rename_all = "camelCase")]
struct FileInfo {
    size: u64,
    width: u32,
    height: u32,
}

#[tauri::command]
fn get_file_info(file_path: String) -> Result<FileInfo, String> {
    let path = Path::new(&file_path);

    // ファイルの存在確認
    if !path.exists() {
        return Err(format!("{file_path} does not exist"));
    }

    if !path.is_file() {
        return Err(format!("{file_path} is not a file"));
    }

    // ファイルサイズを取得
    let metadata =
        std::fs::metadata(path).map_err(|e| format!("Failed to get file metadata: {e}"))?;
    let file_size = metadata.len();

    // 画像の寸法を取得
    let (width, height) = match imagesize::size(path) {
        Ok(size) => (size.width as u32, size.height as u32),
        Err(e) => return Err(format!("Failed to get image dimensions: {e}")),
    };

    Ok(FileInfo {
        size: file_size,
        width,
        height,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    IMAGE_PATHS
        .set(Mutex::new(ImagePaths {
            id: 0,
            paths: Vec::new(),
        }))
        .expect("failed to set IMAGE_PATHS_MUTEX");

    IMAGE_TAGS
        .set(Mutex::new(HashMap::new()))
        .expect("failed to set IMAGE_TAGS_MUTEX");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            drop,
            get_prev_image_paths,
            delete_file,
            load_tags_in_dir,
            save_tags,
            get_file_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// --- タグ関連 --- //

// NOTE: 既知の問題
// 複数のウィンドウで同じディレクトリを開いている場合、
// タグファイルのロックや（最初に読み込んだ後の）同期はしていないので
// 後からタグを更新した方の情報で上書きされてしまう

// 指定されたディレクトリのタグ情報をロード・返却するTauriコマンド
#[tauri::command]
fn load_tags_in_dir(dir_path: String) -> Result<HashMap<String, Vec<String>>, String> {
    // パス検証: パストラバーサル攻撃を防ぐ
    let validated_dir_path = validate_directory_path(&dir_path)?;

    let mut tags_map = IMAGE_TAGS
        .get()
        .expect("failed to get IMAGE_TAGS_MUTEX")
        .lock()
        .expect("failed to lock IMAGE_TAGS_MUTEX");

    if !tags_map.contains_key(&validated_dir_path) {
        let tag_map = parse_tags_file(&validated_dir_path)?;
        tags_map.insert(validated_dir_path.clone(), tag_map);
    }

    let result = tags_map
        .get(&validated_dir_path)
        .cloned()
        .unwrap_or_default();
    Ok(result)
}

// 指定されたディレクトリのタグ情報を読み取って HashMap<String, Vec<String>> を返す
fn parse_tags_file(dir_path: &str) -> Result<HashMap<String, Vec<String>>, String> {
    let (tag_file_name, _) =
        get_tag_file_names(dir_path.to_string()).expect("failed to get tag file names");

    if !std::path::Path::new(&tag_file_name).exists() {
        return Ok(HashMap::new());
    }

    let file = std::fs::File::open(tag_file_name.clone())
        .unwrap_or_else(|_| panic!("failed to open tag file: {}", tag_file_name.clone()));
    let reader = std::io::BufReader::new(file);
    let mut result = HashMap::new();
    for line in reader.lines() {
        let line = line.expect("failed to read line");
        let (file_name, tags) = parse_tag_line(&line);
        result.insert(file_name, tags);
    }

    Ok(result)
}

// タグファイルの一行分の文字列をパースしてファイル名とタグのペアを返す
// 行の形式は: "file_name\ttag1,tag2,tag3"
fn parse_tag_line(line: &str) -> (String, Vec<String>) {
    let mut parts = line.split('\t');
    let file_name = parts.next().unwrap_or("").to_string();
    let tags = parts
        .next()
        .unwrap_or("")
        .split(',')
        .map(|s| s.to_string())
        .collect();
    (file_name, tags)
}

// セキュリティ: タグの入力値検証
fn validate_tag(tag: &str) -> Result<(), String> {
    // 空のタグは許可
    if tag.is_empty() {
        return Ok(());
    }

    // 長さ制限: 最大100文字
    if tag.len() > 100 {
        return Err("Tag too long (maximum 100 characters)".to_string());
    }

    // 禁止文字チェック: タブ文字、改行文字、制御文字
    if tag.contains('\t') || tag.contains('\n') || tag.contains('\r') {
        return Err("Tag contains invalid characters (tab, newline)".to_string());
    }

    // 制御文字チェック
    if tag.chars().any(|c| c.is_control()) {
        return Err("Tag contains control characters".to_string());
    }

    Ok(())
}

// セキュリティ: パストラバーサル攻撃防止のためのパス検証
fn validate_and_parse_image_path(img_path: &str) -> Result<(String, String), String> {
    let path = Path::new(img_path);

    // ファイルの存在確認
    if !path.exists() {
        return Err(format!("{img_path} does not exist"));
    }

    if !path.is_file() {
        return Err(format!("{img_path} is not a file"));
    }

    // パスの正規化（シンボリックリンクを解決し、. や .. を処理）
    let canonical_path = path
        .canonicalize()
        .map_err(|e| format!("Failed to canonicalize path {img_path}: {e}"))?;

    // ディレクトリとファイル名を取得
    let dir_path = canonical_path
        .parent()
        .ok_or_else(|| "Failed to get parent directory".to_string())?
        .to_str()
        .ok_or_else(|| "Failed to convert directory path to string".to_string())?
        .to_string();

    let file_name = canonical_path
        .file_name()
        .ok_or_else(|| "Failed to get file name".to_string())?
        .to_str()
        .ok_or_else(|| "Failed to convert file name to string".to_string())?
        .to_string();

    // ファイル名の検証: 相対パス成分がないかチェック
    if file_name.contains("..") || file_name.contains("/") || file_name.contains("\\") {
        return Err("Invalid file name".to_string());
    }

    // 画像ファイル拡張子の検証
    let image_exts = ["png", "jpeg", "jpg", "gif", "webp"];
    let path_str = canonical_path
        .to_str()
        .ok_or_else(|| "Failed to convert path to string".to_string())?;

    if !image_exts
        .iter()
        .any(|ext| path_str.to_lowercase().ends_with(ext))
    {
        return Err("File is not a supported image format".to_string());
    }

    Ok((dir_path, file_name))
}

// セキュリティ: ディレクトリパスの検証
fn validate_directory_path(dir_path: &str) -> Result<String, String> {
    let path = Path::new(dir_path);

    // ディレクトリの存在確認
    if !path.exists() {
        return Err(format!("{dir_path} does not exist"));
    }

    if !path.is_dir() {
        return Err(format!("{dir_path} is not a directory"));
    }

    // パスの正規化（シンボリックリンクを解決し、. や .. を処理）
    let canonical_path = path
        .canonicalize()
        .map_err(|e| format!("Failed to canonicalize directory path {dir_path}: {e}"))?;

    let validated_path = canonical_path
        .to_str()
        .ok_or_else(|| "Failed to convert directory path to string".to_string())?
        .to_string();

    Ok(validated_path)
}

// 指定されたディレクトリのタグファイル名と一時ファイル名を取得する
fn get_tag_file_names(dir_path: String) -> Result<(String, String), String> {
    let dir = Path::new(&dir_path);
    if dir.is_dir() {
        let tag_file_name = dir.join(TAG_FILE_NAME);
        let tag_backup_file_name = dir.join(TAG_TEMP_FILE_NAME);
        Ok((
            tag_file_name.to_str().unwrap().to_string(),
            tag_backup_file_name.to_str().unwrap().to_string(),
        ))
    } else {
        Err(format!("{dir_path} is not exist or not a directory"))
    }
}

// 指定された画像ファイル（フルパス）のタグ情報を保存するtauriコマンド
#[tauri::command]
fn save_tags(img_path: String, tags: Vec<String>) -> Result<(), String> {
    // 入力値検証: タグの検証
    for tag in &tags {
        validate_tag(tag)?;
    }

    // パス検証: パストラバーサル攻撃を防ぐ
    let (dir_path, file_name) = validate_and_parse_image_path(&img_path)?;

    let (tag_file_name, tag_backup_file_name) =
        get_tag_file_names(dir_path.to_string()).expect("failed to get tag file names");

    // タグ情報をIMAGE_TAGSに保存する
    let mut tags_map = must_lock_image_tags();
    tags_map
        .entry(dir_path.clone())
        .or_insert_with(HashMap::new)
        .insert(file_name.clone(), tags.clone());

    // 一時ファイルに書き込む
    let mut temp_file =
        std::fs::File::create(tag_backup_file_name.clone()).expect("failed to create temp file");
    for (file_name, tags) in tags_map.get(&dir_path).unwrap() {
        let tags_str = tags.join(",");
        let line = format!("{file_name}\t{tags_str}\n");
        temp_file
            .write_all(line.as_bytes())
            .expect("failed to write to temp file");
    }

    // 一時ファイルをリネーム
    std::fs::rename(tag_backup_file_name.clone(), tag_file_name.clone())
        .expect("failed to rename temp file");

    Ok(())
}

fn must_lock_image_tags<'a>() -> MutexGuard<'a, ImageTagsMap> {
    IMAGE_TAGS
        .get()
        .expect("failed to get IMAGE_TAGS_MUTEX")
        .lock()
        .expect("failed to lock IMAGE_TAGS_MUTEX")
}

#[cfg(test)]
mod tests {
    use super::*;

    /// テスト用のIMAGE_TAGS初期化ヘルパー関数
    ///
    /// CI環境などで複数テストが並行実行される際に、グローバルなOnceLock<IMAGE_TAGS>への
    /// 重複初期化を防ぐためのスレッドセーフな初期化処理。
    ///
    /// std::sync::Onceを使用することで：
    /// - 複数スレッドから同時に呼ばれても安全
    /// - 確実に一度だけ初期化される
    /// - OnceLock::set()の重複実行によるpanicを防ぐ
    fn ensure_image_tags_initialized() {
        use std::sync::Once;
        static INIT: Once = Once::new();
        INIT.call_once(|| {
            let _ = IMAGE_TAGS.set(Mutex::new(HashMap::new()));
        });
    }

    #[test]
    fn test_extract_image_files_with_valid_extensions() {
        let paths = vec![
            "test.jpg".to_string(),
            "test.png".to_string(),
            "test.gif".to_string(),
            "test.webp".to_string(),
            "test.jpeg".to_string(),
        ];

        let result = extract_image_files(paths.clone());

        assert_eq!(result.len(), 5);
        assert_eq!(result, paths);
    }

    #[test]
    fn test_extract_image_files_with_invalid_extensions() {
        let paths = vec![
            "test.txt".to_string(),
            "test.pdf".to_string(),
            "test.mp4".to_string(),
            "test".to_string(),
        ];

        let result = extract_image_files(paths);

        assert_eq!(result.len(), 0);
    }

    #[test]
    fn test_extract_image_files_mixed_extensions() {
        let paths = vec![
            "image1.jpg".to_string(),
            "document.txt".to_string(),
            "image2.png".to_string(),
            "video.mp4".to_string(),
            "image3.gif".to_string(),
        ];

        let result = extract_image_files(paths);

        assert_eq!(result.len(), 3);
        assert!(result.contains(&"image1.jpg".to_string()));
        assert!(result.contains(&"image2.png".to_string()));
        assert!(result.contains(&"image3.gif".to_string()));
    }

    #[test]
    fn test_extract_image_files_case_sensitivity() {
        // TODO: 大文字拡張子のサポートを実装後、このテストを更新
        // 現在は大文字拡張子をサポートしていないため、期待値は0
        let paths = vec![
            "test.JPG".to_string(),
            "test.PNG".to_string(),
            "test.GIF".to_string(),
        ];

        let result = extract_image_files(paths);

        // 現在は大文字拡張子未サポート（TODO: dev_doc/TODO.md 参照）
        assert_eq!(result.len(), 0);
    }

    #[test]
    fn test_extract_image_files_empty_input() {
        let paths = vec![];

        let result = extract_image_files(paths);

        assert_eq!(result.len(), 0);
    }

    #[test]
    fn test_extract_image_files_with_nonexistent_directory() {
        let paths = vec!["nonexistent_directory".to_string(), "image.jpg".to_string()];

        let result = extract_image_files(paths);

        // 存在しないディレクトリはスキップされ、有効な画像ファイルのみ残る
        assert_eq!(result.len(), 1);
        assert_eq!(result[0], "image.jpg");
    }

    #[test]
    fn test_is_image_helper_function() {
        let is_image = |path: &str| -> bool {
            let image_exts = ["png", "jpeg", "jpg", "gif", "webp"];
            image_exts.iter().any(|ext| path.ends_with(ext))
        };

        assert!(is_image("test.jpg"));
        assert!(is_image("test.png"));
        assert!(is_image("test.gif"));
        assert!(is_image("test.webp"));
        assert!(is_image("test.jpeg"));
        assert!(!is_image("test.txt"));
        assert!(!is_image("test"));
        // TODO: 大文字拡張子サポート後はtrueになる予定
        assert!(!is_image("test.JPG"));
    }

    // タグ機能のテスト
    mod tag_tests {
        use super::*;
        use std::fs;
        use tempfile::TempDir;

        fn setup_test_dir() -> TempDir {
            let temp_dir = TempDir::new().expect("Failed to create temp dir");
            temp_dir
        }

        #[test]
        fn test_parse_tag_line() {
            let line = "test.jpg\ttag1,tag2,tag3";
            let (file_name, tags) = parse_tag_line(line);

            assert_eq!(file_name, "test.jpg");
            assert_eq!(tags, vec!["tag1", "tag2", "tag3"]);
        }

        #[test]
        fn test_parse_tag_line_empty_tags() {
            let line = "test.jpg\t";
            let (file_name, tags) = parse_tag_line(line);

            assert_eq!(file_name, "test.jpg");
            assert_eq!(tags, vec![""]);
        }

        #[test]
        fn test_parse_tag_line_no_tabs() {
            let line = "test.jpg";
            let (file_name, tags) = parse_tag_line(line);

            assert_eq!(file_name, "test.jpg");
            assert_eq!(tags, vec![""]);
        }

        #[test]
        fn test_get_tag_file_names() {
            let temp_dir = setup_test_dir();
            let dir_path = temp_dir.path().to_str().unwrap().to_string();

            let result = get_tag_file_names(dir_path.clone());

            assert!(result.is_ok());
            let (tag_file, temp_file) = result.unwrap();
            assert!(tag_file.contains("IMAGE_TAG"));
            assert!(temp_file.contains("IMAGE_TAG_TEMP"));
        }

        #[test]
        fn test_get_tag_file_names_invalid_dir() {
            let dir_path = "/nonexistent/directory".to_string();

            let result = get_tag_file_names(dir_path);

            assert!(result.is_err());
            assert!(result
                .unwrap_err()
                .contains("is not exist or not a directory"));
        }

        #[test]
        fn test_parse_tags_file_empty_dir() {
            let temp_dir = setup_test_dir();
            let dir_path = temp_dir.path().to_str().unwrap();

            let result = parse_tags_file(dir_path);

            // 空のディレクトリでは空のHashMapが返される
            assert!(result.is_ok());
            assert_eq!(result.unwrap().len(), 0);
        }

        #[test]
        fn test_parse_tags_file_with_content() {
            let temp_dir = setup_test_dir();
            let dir_path = temp_dir.path().to_str().unwrap();
            let tag_file_path = temp_dir.path().join("IMAGE_TAG");

            // テスト用のタグファイルを作成
            let content = "image1.jpg\ttag1,tag2\nimage2.png\ttag3,tag4,tag5\n";
            fs::write(&tag_file_path, content).expect("Failed to write test file");

            let result = parse_tags_file(dir_path);

            assert!(result.is_ok());
            let tags_map = result.unwrap();
            assert_eq!(tags_map.len(), 2);

            assert_eq!(tags_map["image1.jpg"], vec!["tag1", "tag2"]);
            assert_eq!(tags_map["image2.png"], vec!["tag3", "tag4", "tag5"]);
        }

        #[test]
        fn test_load_tags_in_dir_command() {
            let temp_dir = setup_test_dir();
            let dir_path = temp_dir.path().to_str().unwrap().to_string();
            let tag_file_path = temp_dir.path().join("IMAGE_TAG");

            // テスト用のタグファイルを作成
            let content = "photo.jpg\tnature,landscape\nvideo.mp4\ttime,family\n";
            fs::write(&tag_file_path, content).expect("Failed to write test file");

            // IMAGE_TAGSを初期化
            ensure_image_tags_initialized();

            let result = load_tags_in_dir(dir_path);

            assert!(result.is_ok());
            let tags_map = result.unwrap();
            assert_eq!(tags_map.len(), 2);
            assert_eq!(tags_map["photo.jpg"], vec!["nature", "landscape"]);
            assert_eq!(tags_map["video.mp4"], vec!["time", "family"]);
        }

        #[test]
        fn test_save_tags_command() {
            let temp_dir = setup_test_dir();
            let test_file = temp_dir.path().join("test.jpg");

            // テスト用の画像ファイルを作成
            fs::write(&test_file, "fake image content").expect("Failed to create test file");

            let img_path = test_file.to_str().unwrap().to_string();
            let tags = vec!["nature".to_string(), "sunset".to_string()];

            // IMAGE_TAGSを初期化
            ensure_image_tags_initialized();

            let result = save_tags(img_path, tags.clone());

            assert!(result.is_ok());

            // タグファイルが作成されているか確認
            let tag_file_path = temp_dir.path().join("IMAGE_TAG");
            assert!(tag_file_path.exists());

            // タグファイルの内容を確認
            let content = fs::read_to_string(&tag_file_path).expect("Failed to read tag file");
            assert!(content.contains("test.jpg"));
            assert!(content.contains("nature,sunset"));
        }

        #[test]
        fn test_save_tags_nonexistent_file() {
            let img_path = "/nonexistent/path/test.jpg".to_string();
            let tags = vec!["tag1".to_string()];

            // IMAGE_TAGSを初期化
            ensure_image_tags_initialized();

            let result = save_tags(img_path, tags);

            assert!(result.is_err());
            assert!(result.unwrap_err().contains("does not exist"));
        }

        #[test]
        fn test_tags_cache_behavior() {
            let temp_dir = setup_test_dir();
            let dir_path = temp_dir.path().to_str().unwrap().to_string();
            let tag_file_path = temp_dir.path().join("IMAGE_TAG");

            // 初期のタグファイルを作成
            let content = "image1.jpg\ttag1\n";
            fs::write(&tag_file_path, content).expect("Failed to write test file");

            // IMAGE_TAGSを初期化
            ensure_image_tags_initialized();

            // 最初の読み込み
            let result1 = load_tags_in_dir(dir_path.clone());
            assert!(result1.is_ok());
            assert_eq!(result1.unwrap()["image1.jpg"], vec!["tag1"]);

            // ファイルを変更（ただしキャッシュは更新されない想定）
            let new_content = "image1.jpg\ttag1,tag2\n";
            fs::write(&tag_file_path, new_content).expect("Failed to write test file");

            // 2回目の読み込み（キャッシュから取得される）
            let result2 = load_tags_in_dir(dir_path);
            assert!(result2.is_ok());
            // キャッシュされた値が返される
            assert_eq!(result2.unwrap()["image1.jpg"], vec!["tag1"]);
        }

        // セキュリティテスト: タグバリデーション
        #[test]
        fn test_validate_tag_security() {
            // 正常なタグ
            assert!(validate_tag("normal_tag").is_ok());
            assert!(validate_tag("日本語タグ").is_ok());
            assert!(validate_tag("").is_ok()); // 空タグは許可

            // 長すぎるタグ
            let long_tag = "a".repeat(101);
            assert!(validate_tag(&long_tag).is_err());

            // 禁止文字: タブ
            assert!(validate_tag("tag\twith\ttab").is_err());

            // 禁止文字: 改行
            assert!(validate_tag("tag\nwith\nnewline").is_err());

            // 制御文字
            assert!(validate_tag("tag\x00with\x01control").is_err());
        }

        #[test]
        fn test_save_tags_validation_security() {
            let temp_dir = setup_test_dir();
            let test_file = temp_dir.path().join("test.jpg");

            // テスト用の画像ファイルを作成
            fs::write(&test_file, "fake image content").expect("Failed to create test file");

            let img_path = test_file.to_str().unwrap().to_string();

            // IMAGE_TAGSを初期化
            ensure_image_tags_initialized();

            // 無効なタグで保存試行: 長すぎるタグ
            let long_tag = "a".repeat(101);
            let result = save_tags(img_path.clone(), vec![long_tag]);
            assert!(result.is_err());
            assert!(result.unwrap_err().contains("Tag too long"));

            // 無効なタグで保存試行: タブ文字
            let result = save_tags(img_path.clone(), vec!["tag\twith\ttab".to_string()]);
            assert!(result.is_err());
            assert!(result.unwrap_err().contains("invalid characters"));

            // 無効なタグで保存試行: 制御文字
            let result = save_tags(img_path, vec!["tag\x00control".to_string()]);
            assert!(result.is_err());
            assert!(result.unwrap_err().contains("control characters"));
        }

        #[test]
        fn test_path_validation_security() {
            let temp_dir = setup_test_dir();

            // IMAGE_TAGSを初期化
            ensure_image_tags_initialized();

            // 存在しないディレクトリ
            let result = load_tags_in_dir("/nonexistent/directory".to_string());
            assert!(result.is_err());
            assert!(result.unwrap_err().contains("does not exist"));

            // ファイルをディレクトリとして指定
            let test_file = temp_dir.path().join("test.txt");
            fs::write(&test_file, "test content").expect("Failed to create test file");

            let result = load_tags_in_dir(test_file.to_str().unwrap().to_string());
            assert!(result.is_err());
            assert!(result.unwrap_err().contains("is not a directory"));
        }

        #[test]
        fn test_multiple_files_in_directory() {
            let temp_dir = setup_test_dir();
            let test_file1 = temp_dir.path().join("photo1.jpg");
            let test_file2 = temp_dir.path().join("photo2.png");

            // テスト用ファイルを作成
            fs::write(&test_file1, "fake content").expect("Failed to create test file");
            fs::write(&test_file2, "fake content").expect("Failed to create test file");

            // IMAGE_TAGSを初期化
            ensure_image_tags_initialized();

            // 複数のファイルにタグを保存
            let _ = save_tags(
                test_file1.to_str().unwrap().to_string(),
                vec!["nature".to_string()],
            );
            let _ = save_tags(
                test_file2.to_str().unwrap().to_string(),
                vec!["portrait".to_string()],
            );

            // ディレクトリのタグを読み込み
            let result = load_tags_in_dir(temp_dir.path().to_str().unwrap().to_string());

            assert!(result.is_ok());
            let tags_map = result.unwrap();
            assert_eq!(tags_map.len(), 2);
            assert_eq!(tags_map["photo1.jpg"], vec!["nature"]);
            assert_eq!(tags_map["photo2.png"], vec!["portrait"]);
        }
    }

    // ファイル情報取得機能のテスト
    mod file_info_tests {
        use super::*;
        use std::fs;
        use tempfile::TempDir;

        // テスト用画像の期待値定数
        const TEST_IMAGE_WIDTH: u32 = 2;
        const TEST_IMAGE_HEIGHT: u32 = 3;
        const TEST_IMAGE_SIZE: u64 = 69; // 以下のPNGデータのバイト数

        fn setup_test_dir() -> TempDir {
            let temp_dir = TempDir::new().expect("Failed to create temp dir");
            temp_dir
        }

        fn create_test_image(path: &std::path::Path) {
            // 2x3ピクセルの最小限のPNG画像データ
            let png_data = [
                0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
                0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
                0x49, 0x48, 0x44, 0x52, // IHDR chunk type
                0x00, 0x00, 0x00, 0x02, // Width (2)
                0x00, 0x00, 0x00, 0x03, // Height (3)
                0x08, 0x02, 0x00, 0x00,
                0x00, // Bit depth, color type, compression, filter, interlace
                0x12, 0x16, 0xF1, 0x4D, // CRC
                0x00, 0x00, 0x00, 0x0C, // IDAT chunk length
                0x49, 0x44, 0x41, 0x54, // IDAT chunk type
                0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00,
                0x00, // Image data
                0x02, 0x00, 0x01, 0x00, // CRC
                0x00, 0x00, 0x00, 0x00, // IEND chunk length
                0x49, 0x45, 0x4E, 0x44, // IEND chunk type
                0xAE, 0x42, 0x60, 0x82, // CRC
            ];
            fs::write(path, &png_data).expect("Failed to create test image");
        }

        #[test]
        fn test_get_file_info_success() {
            let temp_dir = setup_test_dir();
            let test_file = temp_dir.path().join("test.png");

            create_test_image(&test_file);

            let result = get_file_info(test_file.to_str().unwrap().to_string());

            assert!(result.is_ok());
            let file_info = result.unwrap();
            assert_eq!(file_info.size, TEST_IMAGE_SIZE);
            assert_eq!(file_info.width, TEST_IMAGE_WIDTH);
            assert_eq!(file_info.height, TEST_IMAGE_HEIGHT);
        }

        #[test]
        fn test_get_file_info_nonexistent_file() {
            let result = get_file_info("/nonexistent/file.png".to_string());

            assert!(result.is_err());
            assert!(result.unwrap_err().contains("does not exist"));
        }

        #[test]
        fn test_get_file_info_directory_instead_of_file() {
            let temp_dir = setup_test_dir();
            let dir_path = temp_dir.path().to_str().unwrap().to_string();

            let result = get_file_info(dir_path);

            assert!(result.is_err());
            assert!(result.unwrap_err().contains("is not a file"));
        }

        #[test]
        fn test_get_file_info_invalid_image() {
            let temp_dir = setup_test_dir();
            let test_file = temp_dir.path().join("test.txt");

            // テキストファイルを作成（画像ではない）
            fs::write(&test_file, "This is not an image").expect("Failed to create test file");

            let result = get_file_info(test_file.to_str().unwrap().to_string());

            assert!(result.is_err());
            assert!(result
                .unwrap_err()
                .contains("Failed to get image dimensions"));
        }

        #[test]
        fn test_get_file_info_file_size_consistency() {
            let temp_dir = setup_test_dir();
            let test_file = temp_dir.path().join("test.png");

            create_test_image(&test_file);

            let result = get_file_info(test_file.to_str().unwrap().to_string());

            assert!(result.is_ok());
            let file_info = result.unwrap();

            // 期待値との一致を確認
            assert_eq!(file_info.size, TEST_IMAGE_SIZE);
            assert_eq!(file_info.width, TEST_IMAGE_WIDTH);
            assert_eq!(file_info.height, TEST_IMAGE_HEIGHT);
        }

        #[test]
        fn test_get_file_info_with_different_extensions() {
            let temp_dir = setup_test_dir();

            // 異なる拡張子でテスト（全て同じPNGデータを使用）
            let extensions = ["test.png", "test.jpg", "test.jpeg", "test.gif", "test.webp"];

            for ext in extensions.iter() {
                let test_file = temp_dir.path().join(ext);
                create_test_image(&test_file);

                let result = get_file_info(test_file.to_str().unwrap().to_string());

                // 拡張子に関係なく、実際の画像データが読めれば成功
                // （この場合は全てPNGデータなので成功）
                assert!(result.is_ok(), "Failed for extension: {}", ext);

                let file_info = result.unwrap();
                assert_eq!(
                    file_info.width, TEST_IMAGE_WIDTH,
                    "Width mismatch for {}",
                    ext
                );
                assert_eq!(
                    file_info.height, TEST_IMAGE_HEIGHT,
                    "Height mismatch for {}",
                    ext
                );
                assert_eq!(file_info.size, TEST_IMAGE_SIZE, "Size mismatch for {}", ext);
            }
        }

        #[test]
        fn test_fileinfo_struct_serialization() {
            // FileInfo構造体のシリアライゼーションをテスト
            let file_info = FileInfo {
                size: TEST_IMAGE_SIZE,
                width: TEST_IMAGE_WIDTH,
                height: TEST_IMAGE_HEIGHT,
            };

            let serialized = serde_json::to_string(&file_info);
            assert!(serialized.is_ok());

            let json_str = serialized.unwrap();
            assert!(json_str.contains(&format!("\"size\":{}", TEST_IMAGE_SIZE)));
            assert!(json_str.contains(&format!("\"width\":{}", TEST_IMAGE_WIDTH)));
            assert!(json_str.contains(&format!("\"height\":{}", TEST_IMAGE_HEIGHT)));
        }
    }
}

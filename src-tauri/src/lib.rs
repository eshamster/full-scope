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
static IMAGE_TAGS: OnceLock<Mutex<HashMap<String, HashMap<String, Vec<String>>>>> = OnceLock::new();

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
    let mut tags_map = IMAGE_TAGS
        .get()
        .expect("failed to get IMAGE_TAGS_MUTEX")
        .lock()
        .expect("failed to lock IMAGE_TAGS_MUTEX");

    if !tags_map.contains_key(&dir_path) {
        let tag_map = parse_tags_file(&dir_path)?;
        tags_map.insert(dir_path.clone(), tag_map);
    }

    let result = tags_map.get(&dir_path).cloned().unwrap_or_default();
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
        .expect(format!("failed to open tag file: {}", tag_file_name.clone()).as_str());
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
        Err(format!("{} is not exist or not a directory", dir_path))
    }
}

// 指定された画像ファイル（フルパス）のタグ情報を保存するtauriコマンド
#[tauri::command]
fn save_tags(img_path: String, tags: Vec<String>) -> Result<(), String> {
    // ディレクトリパスとファイル名を分離する
    let path = Path::new(&img_path);
    if !path.is_file() {
        return Err(format!("{} is not exist or not a file", img_path));
    }
    let dir_path = path
        .parent()
        .expect("failed to get parent directory")
        .to_str()
        .expect("failed to convert path to str")
        .to_string();
    let file_name = path
        .file_name()
        .expect("failed to get file name")
        .to_str()
        .expect("failed to convert path to str")
        .to_string();

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
        let line = format!("{}\t{}\n", file_name, tags_str);
        temp_file
            .write_all(line.as_bytes())
            .expect("failed to write to temp file");
    }

    // 一時ファイルをリネーム
    std::fs::rename(tag_backup_file_name.clone(), tag_file_name.clone())
        .expect("failed to rename temp file");

    Ok(())
}

fn must_lock_image_tags<'a>() -> MutexGuard<'a, HashMap<String, HashMap<String, Vec<String>>>> {
    IMAGE_TAGS
        .get()
        .expect("failed to get IMAGE_TAGS_MUTEX")
        .lock()
        .expect("failed to lock IMAGE_TAGS_MUTEX")
}

#[cfg(test)]
mod tests {
    use super::*;

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
}

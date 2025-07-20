use std::sync::{Mutex, OnceLock};
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
static IMAGE_PATHS_MUTEX: OnceLock<Mutex<ImagePaths>> = OnceLock::new();

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
    let mut image_paths = IMAGE_PATHS_MUTEX
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
    IMAGE_PATHS_MUTEX
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
    IMAGE_PATHS_MUTEX
        .set(Mutex::new(ImagePaths {
            id: 0,
            paths: Vec::new(),
        }))
        .expect("failed to set IMAGE_PATHS_MUTEX");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            drop,
            get_prev_image_paths,
            delete_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
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

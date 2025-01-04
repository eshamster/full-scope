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
    let image_exts = vec!["png", "jpeg", "jpg", "gif", "webp"];

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
                if path.is_file() && is_image(&path.to_str().unwrap()) {
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
        .invoke_handler(tauri::generate_handler![drop, get_prev_image_paths])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn drop(paths: Vec<String>) -> Vec<String> {
    extract_image_files(paths)
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet])
        .invoke_handler(tauri::generate_handler![drop])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

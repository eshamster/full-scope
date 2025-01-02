// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// 文字列の配列を受け取って文字列の配列を返す tauri::command
#[tauri::command]
fn drop(paths: Vec<String>) -> Vec<String> {
    paths
        .iter()
        .map(|path| format!("Processed: {}", path))
        .collect()
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

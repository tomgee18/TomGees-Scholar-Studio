use std::collections::HashMap;

#[tauri::command]
fn get_system_env_vars() -> HashMap<String, String> {
    let mut vars = HashMap::new();
    for (k, v) in std::env::vars() {
        if k.ends_with("_API_KEY")
            || k.ends_with("_KEY")
            || k.contains("OLLAMA")
            || k.contains("GEMINI")
            || k.contains("DEEPSEEK")
            || k.contains("OPENROUTER")
            || k.contains("GROQ")
            || k.contains("OPENAI")
        {
            vars.insert(k, v);
        }
    }
    vars
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_system_env_vars])
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}

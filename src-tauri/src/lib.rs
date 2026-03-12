use std::env;
use std::io::{BufRead, BufReader, ErrorKind};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::thread;

use encoding_rs::GBK;
use tauri::menu::{Menu, MenuEvent, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{AppHandle, Emitter, Manager, Window};
use tauri_plugin_global_shortcut::GlobalShortcutExt;

#[cfg(target_os = "windows")]
fn apply_no_window(command: &mut Command) {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x08000000;
    command.creation_flags(CREATE_NO_WINDOW);
}

#[cfg(not(target_os = "windows"))]
fn apply_no_window(_command: &mut Command) {}

fn sanitize_input(input: &str) -> String {
    input
        .chars()
        .filter(|char| {
            char.is_ascii_alphanumeric() || "@/_-.* ".contains(*char)
        })
        .collect::<String>()
        .trim()
        .to_string()
}

fn sanitize_shortcut_input(input: &str) -> String {
    input
        .chars()
        .filter(|char| {
            char.is_ascii_alphanumeric() || "+-_ ".contains(*char)
        })
        .collect::<String>()
        .trim()
        .to_string()
}

fn strip_ansi(input: &str) -> String {
    let mut result = String::with_capacity(input.len());
    let mut in_escape = false;
    for ch in input.chars() {
        if in_escape {
            if ch.is_ascii_alphabetic() {
                in_escape = false;
            }
            continue;
        }
        if ch == '\u{1b}' {
            in_escape = true;
            continue;
        }
        result.push(ch);
    }
    result
}

fn decode_output(bytes: &[u8]) -> String {
    if let Ok(text) = String::from_utf8(bytes.to_vec()) {
        return text;
    }

    let (decoded, _, _) = GBK.decode(bytes);
    decoded.into_owned()
}

fn decode_and_strip(bytes: &[u8]) -> String {
    strip_ansi(&decode_output(bytes))
}

fn build_pnpm_dlx_args(args: &[String]) -> Vec<String> {
    let mut pnpm_args = vec!["dlx".into(), "skills".into()];
    if args.len() > 1 {
        pnpm_args.extend(args.iter().skip(1).cloned());
    }
    pnpm_args
}

fn resolve_executable(name: &str) -> Option<PathBuf> {
    let mut candidates: Vec<PathBuf> = Vec::new();
    if name == "pnpm" {
        if let Ok(pnpm_home) = env::var("PNPM_HOME") {
            candidates.push(PathBuf::from(&pnpm_home).join("pnpm.exe"));
            candidates.push(PathBuf::from(&pnpm_home).join("pnpm.cmd"));
        }
        if let Ok(userprofile) = env::var("USERPROFILE") {
            candidates.push(
                PathBuf::from(&userprofile)
                    .join("AppData")
                    .join("Local")
                    .join("pnpm")
                    .join("pnpm.exe"),
            );
            candidates.push(
                PathBuf::from(&userprofile)
                    .join("AppData")
                    .join("Local")
                    .join("pnpm")
                    .join("pnpm.cmd"),
            );
        }
    }
    if name == "npx" {
        if let Ok(appdata) = env::var("APPDATA") {
            candidates.push(PathBuf::from(&appdata).join("npm").join("npx.cmd"));
            candidates.push(PathBuf::from(&appdata).join("npm").join("npx.exe"));
        }
        if let Ok(program_files) = env::var("ProgramFiles") {
            candidates.push(
                PathBuf::from(&program_files)
                    .join("nodejs")
                    .join("npx.cmd"),
            );
            candidates.push(
                PathBuf::from(&program_files)
                    .join("nodejs")
                    .join("npx.exe"),
            );
        }
        if let Ok(program_files_x86) = env::var("ProgramFiles(x86)") {
            candidates.push(
                PathBuf::from(&program_files_x86)
                    .join("nodejs")
                    .join("npx.cmd"),
            );
            candidates.push(
                PathBuf::from(&program_files_x86)
                    .join("nodejs")
                    .join("npx.exe"),
            );
        }
        if let Ok(userprofile) = env::var("USERPROFILE") {
            candidates.push(
                PathBuf::from(&userprofile)
                    .join("AppData")
                    .join("Roaming")
                    .join("npm")
                    .join("npx.cmd"),
            );
            candidates.push(
                PathBuf::from(&userprofile)
                    .join("AppData")
                    .join("Roaming")
                    .join("npm")
                    .join("npx.exe"),
            );
        }
    }

    for candidate in candidates {
        if candidate.exists() {
            return Some(candidate);
        }
    }

    let where_output = Command::new("where")
        .args([name])
        .output()
        .ok()
        .filter(|output| output.status.success())
        .and_then(|output| {
            String::from_utf8(output.stdout)
                .ok()
                .and_then(|stdout| stdout.lines().next().map(|line| line.trim().to_string()))
        });
    where_output.map(PathBuf::from)
}

fn apply_current_dir(command: &mut Command, current_dir: &Option<String>) {
    if let Some(dir) = current_dir.as_ref().map(|value| value.trim()).filter(|value| !value.is_empty()) {
        command.current_dir(dir);
    }
}

fn command_output(name: &str, args: &[String], current_dir: &Option<String>) -> Result<std::process::Output, std::io::Error> {
    let mut command = if let Some(path) = resolve_executable(name) {
        Command::new(path)
    } else {
        Command::new(name)
    };
    apply_no_window(&mut command);
    apply_current_dir(&mut command, current_dir);
    command.args(args).output()
}

fn command_spawn(name: &str, args: &[String], current_dir: &Option<String>) -> Result<std::process::Child, std::io::Error> {
    let mut command = if let Some(path) = resolve_executable(name) {
        Command::new(path)
    } else {
        Command::new(name)
    };
    apply_no_window(&mut command);
    apply_current_dir(&mut command, current_dir);
    command.args(args).stdout(Stdio::piped()).stderr(Stdio::piped());
    command.spawn()
}

fn run_command_output(args: &[String], current_dir: &Option<String>) -> Result<String, String> {
    let output = match command_output("npx", args, current_dir) {
        Ok(output) => output,
        Err(error) if error.kind() == ErrorKind::NotFound => {
            let pnpm_args = build_pnpm_dlx_args(args);
            command_output("pnpm", &pnpm_args, current_dir).map_err(|error| {
                if error.kind() == ErrorKind::NotFound {
                    "无法定位 npx 或 pnpm，可尝试在系统 PATH 中配置或安装 Node.js。".to_string()
                } else {
                    error.to_string()
                }
            })?
        }
        Err(error) => return Err(error.to_string()),
    };

    if output.status.success() {
        Ok(decode_and_strip(&output.stdout))
    } else {
        Err(decode_and_strip(&output.stderr))
    }
}

fn run_command_output_with_logs(
    app: &AppHandle,
    id: &str,
    args: &[String],
    current_dir: &Option<String>,
) -> Result<String, String> {
    let output = match command_output("npx", args, current_dir) {
        Ok(output) => output,
        Err(error) if error.kind() == ErrorKind::NotFound => {
            let pnpm_args = build_pnpm_dlx_args(args);
            command_output("pnpm", &pnpm_args, current_dir).map_err(|error| {
                if error.kind() == ErrorKind::NotFound {
                    "无法定位 npx 或 pnpm，可尝试在系统 PATH 中配置或安装 Node.js。".to_string()
                } else {
                    error.to_string()
                }
            })?
        }
        Err(error) => return Err(error.to_string()),
    };

    let stdout = decode_and_strip(&output.stdout);
    let stderr = decode_and_strip(&output.stderr);
    if !stdout.trim().is_empty() {
        for line in stdout.lines() {
            emit_log(app, id, line);
        }
    }
    if !stderr.trim().is_empty() {
        for line in stderr.lines() {
            emit_log(app, id, line);
        }
    }

    if output.status.success() {
        Ok(stdout)
    } else {
        Err(stderr)
    }
}

fn emit_log(app: &AppHandle, id: &str, line: &str) {
    let _ = app.emit("skills-command-log", serde_json::json!({ "id": id, "line": line }));
}

fn emit_finished(app: &AppHandle, id: &str, status: &str, message: Option<String>) {
    let _ = app.emit(
        "skills-command-finished",
        serde_json::json!({ "id": id, "status": status, "message": message }),
    );
}

fn run_command_streaming(app: AppHandle, id: String, args: Vec<String>, current_dir: Option<String>) -> Result<(), String> {
    thread::spawn(move || {
        let mut child = match command_spawn("npx", &args, &current_dir) {
            Ok(child) => child,
            Err(error) if error.kind() == ErrorKind::NotFound => {
                let pnpm_args = build_pnpm_dlx_args(&args);
                match command_spawn("pnpm", &pnpm_args, &current_dir) {
                    Ok(child) => child,
                    Err(error) => {
                        let message = if error.kind() == ErrorKind::NotFound {
                            "无法定位 npx 或 pnpm，可尝试在系统 PATH 中配置或安装 Node.js。".to_string()
                        } else {
                            error.to_string()
                        };
                        emit_finished(&app, &id, "error", Some(message));
                        return;
                    }
                }
            }
            Err(error) => {
                emit_finished(&app, &id, "error", Some(error.to_string()));
                return;
            }
        };

        if let Some(stdout) = child.stdout.take() {
            let app_handle = app.clone();
            let id_clone = id.clone();
            thread::spawn(move || {
                let mut reader = BufReader::new(stdout);
                let mut buffer = Vec::new();
                while reader.read_until(b'\n', &mut buffer).unwrap_or(0) > 0 {
                    let line = decode_and_strip(&buffer);
                    let line = line.trim_end_matches(['\r', '\n']);
                    if !line.is_empty() {
                        emit_log(&app_handle, &id_clone, line);
                    }
                    buffer.clear();
                }
            });
        }

        if let Some(stderr) = child.stderr.take() {
            let app_handle = app.clone();
            let id_clone = id.clone();
            thread::spawn(move || {
                let mut reader = BufReader::new(stderr);
                let mut buffer = Vec::new();
                while reader.read_until(b'\n', &mut buffer).unwrap_or(0) > 0 {
                    let line = decode_and_strip(&buffer);
                    let line = line.trim_end_matches(['\r', '\n']);
                    if !line.is_empty() {
                        emit_log(&app_handle, &id_clone, line);
                    }
                    buffer.clear();
                }
            });
        }

        let status = child.wait().ok();
        match status {
            Some(exit) if exit.success() => emit_finished(&app, &id, "success", None),
            Some(exit) => emit_finished(
                &app,
                &id,
                "error",
                Some(format!("command failed with {}", exit)),
            ),
            None => emit_finished(&app, &id, "error", Some("command failed".to_string())),
        }
    });

    Ok(())
}

#[tauri::command]
async fn execute_npx_skills_find_with_logs(window: Window, id: String, query: String) -> Result<String, String> {
    let app_handle = window.app_handle().clone();
    let task_id = id.clone();
    let task_query = query.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let sanitized = sanitize_input(&task_query);
        let args = vec!["skills".into(), "find".into(), sanitized];
        run_command_output_with_logs(&app_handle, &task_id, &args, &None)
    })
    .await
    .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn execute_npx_skills_add_list(source: String) -> Result<String, String> {
    let task_source = source.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let sanitized = sanitize_input(&task_source);
        let args = vec!["skills".into(), "add".into(), sanitized, "-l".into()];
        run_command_output(&args, &None)
    })
    .await
    .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn execute_npx_skills_list(is_global: bool, current_dir: Option<String>) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let mut args = vec!["skills".into(), "list".into()];
        if is_global {
            args.push("-g".into());
        }
        run_command_output(&args, &current_dir)
    })
    .await
    .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn execute_npx_skills_check() -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let args = vec!["skills".into(), "check".into()];
        run_command_output(&args, &None)
    })
    .await
    .map_err(|error| error.to_string())?
}

#[tauri::command]
fn execute_npx_skills_add(
    window: Window,
    id: String,
    source: String,
    is_global: bool,
    agents: Vec<String>,
    skills: Vec<String>,
    copy_mode: bool,
    full_depth: bool,
    all_mode: bool,
    current_dir: Option<String>,
) -> Result<(), String> {
    let mut args = vec!["skills".into(), "add".into(), sanitize_input(&source)];

    if is_global {
        args.push("-g".into());
    }

    let sanitized_agents = agents
        .into_iter()
        .map(|agent| sanitize_input(&agent))
        .filter(|item| !item.is_empty())
        .collect::<Vec<String>>();
    for agent in sanitized_agents {
        args.push("-a".into());
        args.push(agent);
    }

    if all_mode {
        args.push("-s".into());
        args.push("*".into());
    } else {
        let sanitized_skills = skills
            .into_iter()
            .map(|skill| sanitize_input(&skill))
            .filter(|item| !item.is_empty())
            .collect::<Vec<String>>();
        for skill in sanitized_skills {
            args.push("-s".into());
            args.push(skill);
        }
    }

    if copy_mode {
        args.push("--copy".into());
    }

    if full_depth {
        args.push("--full-depth".into());
    }

    args.push("-y".into());

    run_command_streaming(window.app_handle().clone(), id, args, current_dir)
}

#[tauri::command]
fn execute_npx_skills_update(window: Window, id: String) -> Result<(), String> {
    let args = vec!["skills".into(), "update".into()];
    run_command_streaming(window.app_handle().clone(), id, args, None)
}


#[tauri::command]
async fn pick_project_folder() -> Result<Option<String>, String> {
    let script = r#"Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.ShowNewFolderButton = $true
if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
  Write-Output $dialog.SelectedPath
}"#;
    tauri::async_runtime::spawn_blocking(move || {
        let mut command = Command::new("powershell");
        apply_no_window(&mut command);
        let output = command
            .args(["-NoProfile", "-STA", "-Command", script])
            .output()
            .map_err(|error| error.to_string())?;

        if !output.status.success() {
            return Err(decode_and_strip(&output.stderr));
        }

        let selected = decode_and_strip(&output.stdout).trim().to_string();
        if selected.is_empty() {
            Ok(None)
        } else {
            Ok(Some(selected))
        }
    })
    .await
    .map_err(|error| error.to_string())?
}

#[tauri::command]
fn set_global_shortcut(app: AppHandle, accelerator: String) -> Result<(), String> {
    let global_shortcut = app.global_shortcut();
    let _ = global_shortcut.unregister_all();
    let sanitized = sanitize_shortcut_input(&accelerator);
    if sanitized.is_empty() {
        return Ok(());
    }
    global_shortcut
        .on_shortcut(sanitized.as_str(), move |app, _, _| {
            if let Some(window) = app.get_webview_window("main") {
                if window.is_visible().unwrap_or(true) {
                    let _ = window.hide();
                } else {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        })
        .map_err(|error| error.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            let show = MenuItem::with_id(app, "show", "显示窗口", true, None::<&str>)?;
            let hide = MenuItem::with_id(app, "hide", "隐藏窗口", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &hide, &quit])?;
            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(move |app: &AppHandle, event: MenuEvent| match event.id().as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "hide" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.hide();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .build(app)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            execute_npx_skills_find_with_logs,
            execute_npx_skills_add_list,
            execute_npx_skills_list,
            execute_npx_skills_check,
            execute_npx_skills_add,
            execute_npx_skills_update,
            pick_project_folder,
            set_global_shortcut
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

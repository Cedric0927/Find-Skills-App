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

fn command_output(name: &str, args: &[String]) -> Result<std::process::Output, std::io::Error> {
    let mut command = if let Some(path) = resolve_executable(name) {
        Command::new(path)
    } else {
        Command::new(name)
    };
    command.args(args).output()
}

fn command_spawn(name: &str, args: &[String]) -> Result<std::process::Child, std::io::Error> {
    let mut command = if let Some(path) = resolve_executable(name) {
        Command::new(path)
    } else {
        Command::new(name)
    };
    command.args(args).stdout(Stdio::piped()).stderr(Stdio::piped());
    command.spawn()
}

fn run_command_output(args: &[String]) -> Result<String, String> {
    let output = match command_output("npx", args) {
        Ok(output) => output,
        Err(error) if error.kind() == ErrorKind::NotFound => {
            let pnpm_args = build_pnpm_dlx_args(args);
            command_output("pnpm", &pnpm_args).map_err(|error| {
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
) -> Result<String, String> {
    let output = match command_output("npx", args) {
        Ok(output) => output,
        Err(error) if error.kind() == ErrorKind::NotFound => {
            let pnpm_args = build_pnpm_dlx_args(args);
            command_output("pnpm", &pnpm_args).map_err(|error| {
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

fn run_command_streaming(app: AppHandle, id: String, args: Vec<String>) -> Result<(), String> {
    thread::spawn(move || {
        let mut child = match command_spawn("npx", &args) {
            Ok(child) => child,
            Err(error) if error.kind() == ErrorKind::NotFound => {
                let pnpm_args = build_pnpm_dlx_args(&args);
                match command_spawn("pnpm", &pnpm_args) {
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
fn execute_npx_skills_find_with_logs(window: Window, id: String, query: String) -> Result<String, String> {
    let sanitized = sanitize_input(&query);
    let args = vec!["skills".into(), "find".into(), sanitized];
    run_command_output_with_logs(&window.app_handle(), &id, &args)
}

#[tauri::command]
fn execute_npx_skills_add_list(source: String) -> Result<String, String> {
    let sanitized = sanitize_input(&source);
    let args = vec!["skills".into(), "add".into(), sanitized, "-l".into()];
    run_command_output(&args)
}

#[tauri::command]
fn execute_npx_skills_list(is_global: bool) -> Result<String, String> {
    let mut args = vec!["skills".into(), "list".into()];
    if is_global {
        args.push("-g".into());
    }
    run_command_output(&args)
}

#[tauri::command]
fn execute_npx_skills_check() -> Result<String, String> {
    let args = vec!["skills".into(), "check".into()];
    run_command_output(&args)
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
) -> Result<(), String> {
    let mut args = vec!["skills".into(), "add".into(), sanitize_input(&source)];

    if is_global {
        args.push("-g".into());
    }

    if all_mode {
        args.push("--all".into());
    } else {
        if !agents.is_empty() {
            args.push("-a".into());
            args.push(
                agents
                    .into_iter()
                    .map(|agent| sanitize_input(&agent))
                    .filter(|item| !item.is_empty())
                    .collect::<Vec<String>>()
                    .join(","),
            );
        }

        if !skills.is_empty() {
            args.push("-s".into());
            args.push(
                skills
                    .into_iter()
                    .map(|skill| sanitize_input(&skill))
                    .filter(|item| !item.is_empty())
                    .collect::<Vec<String>>()
                    .join(","),
            );
        }
    }

    if copy_mode {
        args.push("--copy".into());
    }

    if full_depth {
        args.push("--full-depth".into());
    }

    args.push("-y".into());

    run_command_streaming(window.app_handle().clone(), id, args)
}

#[tauri::command]
fn execute_npx_skills_update(window: Window, id: String) -> Result<(), String> {
    let args = vec!["skills".into(), "update".into()];
    run_command_streaming(window.app_handle().clone(), id, args)
}

#[tauri::command]
fn set_global_shortcut(app: AppHandle, accelerator: String) -> Result<(), String> {
    let global_shortcut = app.global_shortcut();
    let _ = global_shortcut.unregister_all();
    let sanitized = sanitize_input(&accelerator);
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
            set_global_shortcut
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

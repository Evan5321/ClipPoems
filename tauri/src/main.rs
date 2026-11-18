// ClipPoems Tauri v2 桌面端入口
// 菜单、窗口配置与原生文件对话框（导出 / 导入语料）
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::{Emitter, Manager};
use tauri_plugin_dialog::DialogExt;

/// 保存二进制文件（导出 PNG / SVG / PDF 等）到用户选择的位置
#[tauri::command]
async fn save_file(
    app: tauri::AppHandle,
    bytes: Vec<u8>,
    default_name: String,
) -> Result<Option<String>, String> {
    let selected = app
        .dialog()
        .file()
        .set_file_name(&default_name)
        .blocking_save_file();

    let Some(path) = selected else {
        return Ok(None);
    };
    let path = path.into_path().map_err(|e| e.to_string())?;
    fs::write(&path, bytes).map_err(|e| e.to_string())?;
    Ok(Some(path.to_string_lossy().to_string()))
}

/// 打开文本文件（导入 TXT / MD / CSV 语料），返回文件名与内容
#[tauri::command]
async fn open_text_file(app: tauri::AppHandle) -> Result<Option<(String, String)>, String> {
    let selected = app
        .dialog()
        .file()
        .add_filter("语料文件", &["txt", "md", "markdown", "csv"])
        .blocking_pick_file();

    let Some(path) = selected else {
        return Ok(None);
    };
    let path = path.into_path().map_err(|e| e.to_string())?;
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let name = path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "corpus.txt".into());
    Ok(Some((name, content)))
}

fn build_menu(app: &tauri::App) -> tauri::Result<Menu<tauri::Wry>> {
    let new_work = MenuItem::with_id(app, "new", "新建作品", true, Some("CmdOrCtrl+N"))?;
    let open_work = MenuItem::with_id(app, "open", "打开作品", true, Some("CmdOrCtrl+O"))?;
    let save = MenuItem::with_id(app, "save", "保存", true, Some("CmdOrCtrl+S"))?;
    let save_as = MenuItem::with_id(app, "save-as", "另存为", true, Some("CmdOrCtrl+Shift+S"))?;
    let export = MenuItem::with_id(app, "export", "导出作品…", true, Some("CmdOrCtrl+E"))?;
    let quit = PredefinedMenuItem::quit(app, Some("退出"))?;

    let file_menu = Submenu::with_items(
        app,
        "文件",
        true,
        &[&new_work, &open_work, &save, &save_as, &export, &PredefinedMenuItem::separator(app)?, &quit],
    )?;

    let undo = PredefinedMenuItem::undo(app, Some("撤销"))?;
    let redo = PredefinedMenuItem::redo(app, Some("重做"))?;
    let cut = PredefinedMenuItem::cut(app, Some("剪切"))?;
    let copy = PredefinedMenuItem::copy(app, Some("复制"))?;
    let paste = PredefinedMenuItem::paste(app, Some("粘贴"))?;
    let select_all = PredefinedMenuItem::select_all(app, Some("全选"))?;
    let edit_menu = Submenu::with_items(
        app,
        "编辑",
        true,
        &[&undo, &redo, &PredefinedMenuItem::separator(app)?, &cut, &copy, &paste, &select_all],
    )?;

    let fullscreen = PredefinedMenuItem::fullscreen(app, Some("切换全屏"))?;
    let view_menu = Submenu::with_items(app, "视图", true, &[&fullscreen])?;

    Menu::with_items(app, &[&file_menu, &edit_menu, &view_menu])
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![save_file, open_text_file])
        .setup(|app| {
            let menu = build_menu(app)?;
            app.set_menu(menu)?;

            // 菜单事件 → 前端（window.__TAURI__.event.listen('menu', ...)）
            app.on_menu_event(|app, event| {
                let id = event.id().0.clone();
                let _ = app.emit("menu", id);
            });

            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_title("ClipPoems · 剪贴诗");
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running ClipPoems");
}

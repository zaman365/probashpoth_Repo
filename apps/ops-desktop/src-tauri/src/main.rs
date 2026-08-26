// ProbashOS assisted-service desk.
//
// The Rust side stays deliberately thin: it exists for local device access
// (scanner, receipt printer, offline queue) that a browser cannot reach. Business
// rules — eligibility, cost, verification, settlement — live in the shared packages
// and the API, never here (ADR 0001).

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running the ProbashOS desk application");
}

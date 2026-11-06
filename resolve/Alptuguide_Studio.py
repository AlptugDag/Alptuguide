#!/usr/bin/env python3
"""
Alptuguide™ Studio v3.2 — DaVinci Resolve Menu Script (Workspace > Scripts > Alptuguide Studio)
Copyright (c) 2026 Alptuğ Dağ (@alptugdag). All rights reserved.

Launches the native macOS Liquid Glass Studio window (Alptuguide.app) connected directly
to the active DaVinci Resolve timeline and Viewer.
"""
import json
import os
import subprocess

SHARE_DIR = os.path.expanduser("~/Library/Application Support/Alptuguide")
STATE_FILE = os.path.join(SHARE_DIR, "state.json")


def launch_alptuguide_studio():
    os.makedirs(SHARE_DIR, exist_ok=True)
    state = {
        "visible": True,
        "edit": False,
        "openStudio": True,
        "host": "RESOLVE",
        "rev": int(__import__("time").time()),
        "quit": False,
    }
    try:
        with open(STATE_FILE, "w", encoding="utf-8") as f:
            json.dump(state, f)
    except Exception:
        pass

    app_candidates = [
        "/Applications/Alptuguide.app",
        os.path.join(SHARE_DIR, "Alptuguide Overlay.app"),
    ]
    for app_path in app_candidates:
        if os.path.exists(app_path):
            subprocess.Popen(["open", "-a", app_path, "--args", "--studio", "--host", "RESOLVE"])
            return


if __name__ == "__main__":
    launch_alptuguide_studio()

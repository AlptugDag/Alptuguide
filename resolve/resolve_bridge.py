#!/usr/bin/env python3
"""
Alptuguide™ Studio — DaVinci Resolve Scripting Bridge (Python)
Copyright (c) 2026 Alptuğ Dağ (@alptugdag). All rights reserved.

Allows the native macOS Liquid Glass app (Alptuguide.app) and DaVinci Resolve's
Workspace > Scripts menu to query timeline resolution, capture live Viewer frames,
insert 1:1 verified Safe-Zone guides/overlays, and clean timeline layers.
"""
import importlib.machinery
import importlib.util
import json
import os
import random
import sys
import tempfile
import time


def _load_resolve():
    sdk_module = "/Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer/Scripting/Modules"
    if os.path.isdir(sdk_module) and sdk_module not in sys.path:
        sys.path.insert(0, sdk_module)
    try:
        import DaVinciResolveScript as dvr
        return dvr.scriptapp("Resolve")
    except Exception:
        pass

    lib_path = "/Applications/DaVinci Resolve/DaVinci Resolve.app/Contents/Libraries/Fusion/fusionscript.so"
    if os.path.exists(lib_path):
        try:
            loader = importlib.machinery.ExtensionFileLoader("fusionscript", lib_path)
            spec = importlib.util.spec_from_loader("fusionscript", loader)
            mod = importlib.util.module_from_spec(spec)
            loader.exec_module(mod)
            return mod.scriptapp("Resolve")
        except Exception:
            pass
    return None


def _get_context():
    resolve = _load_resolve()
    if not resolve:
        return None, None, None, "NO_RESOLVE", "DaVinci Resolve açık değil veya Scripting etkin değil."
    pm = resolve.GetProjectManager()
    if not pm:
        return resolve, None, None, "NO_PM", "Project Manager bulunamadı."
    project = pm.GetCurrentProject()
    if not project:
        return resolve, None, None, "NO_PROJECT", "DaVinci Resolve projesi açık değil."
    timeline = project.GetCurrentTimeline()
    if not timeline:
        return resolve, project, None, "NO_SEQ", "Aktif bir DaVinci Resolve timeline açın."
    return resolve, project, timeline, None, None


def get_sequence_details():
    _, project, timeline, err, msg = _get_context()
    if err:
        return json.dumps({"ok": False, "status": err, "message": msg, "host": "RESOLVE"})
    try:
        w = int(float(timeline.GetSetting("timelineResolutionWidth") or 1080))
        h = int(float(timeline.GetSetting("timelineResolutionHeight") or 1920))
    except Exception:
        w, h = 1080, 1920
    aspect = (w / h) if h > 0 else (9 / 16)
    is916 = abs(aspect - (9 / 16)) < 0.02
    is169 = abs(aspect - (16 / 9)) < 0.02
    is_sq = abs(aspect - 1.0) < 0.02
    fps = 30.0
    try:
        fps_val = float(timeline.GetSetting("timelineFrameRate") or 30.0)
        if fps_val > 0:
            fps = fps_val
    except Exception:
        pass
    start_f = int(timeline.GetStartFrame() or 0)
    end_f = int(timeline.GetEndFrame() or 0)
    dur = max(0.0, (end_f - start_f) / fps) if (end_f > start_f and fps > 0) else 0.0

    return json.dumps({
        "ok": True,
        "name": timeline.GetName() or "DaVinci Timeline",
        "width": w,
        "height": h,
        "fps": round(fps, 3),
        "duration": round(dur, 2),
        "aspect": aspect,
        "is916": is916,
        "is169": is169,
        "isSquare": is_sq,
        "typeStr": "DaVinci 9:16 Dikey" if is916 else ("DaVinci 16:9 Yatay" if is169 else "DaVinci Timeline"),
        "host": "RESOLVE",
    })


def get_playhead_state():
    _, _, timeline, err, _ = _get_context()
    if err:
        return json.dumps({"ok": False, "error": err})
    tc = str(timeline.GetCurrentTimecode() or "01:00:00:00")
    try:
        w = int(float(timeline.GetSetting("timelineResolutionWidth") or 1080))
        h = int(float(timeline.GetSetting("timelineResolutionHeight") or 1920))
    except Exception:
        w, h = 1080, 1920
    return json.dumps({
        "ok": True,
        "host": "RESOLVE",
        "ticks": tc,
        "width": w,
        "height": h,
    })


def capture_frame_to_temp_path():
    _, project, timeline, err, msg = _get_context()
    if err:
        return json.dumps({"ok": False, "error": err, "message": msg})
    temp_name = f"alptug_dr_{int(time.time() * 1000)}_{random.randint(100, 999)}.png"
    temp_path = os.path.join(tempfile.gettempdir(), temp_name)
    try:
        ok = project.ExportCurrentFrameAsStill(temp_path)
        if ok and os.path.exists(temp_path):
            return json.dumps({
                "ok": True,
                "path": temp_path,
                "candidates": [temp_path],
                "host": "RESOLVE",
                "ticks": str(timeline.GetCurrentTimecode() or ""),
            })
    except Exception as e:
        return json.dumps({"ok": False, "error": "DR_ERR", "message": str(e)})
    return json.dumps({"ok": False, "error": "DR_TIMEOUT", "message": "DaVinci Viewer karesi alınamadı."})


def insert_or_update_clip(file_path, display_name="Alptuguide Overlay"):
    _, project, timeline, err, msg = _get_context()
    if err:
        return msg
    if not file_path or not os.path.exists(file_path):
        return f"Dosya bulunamadı: {file_path}"

    media_pool = project.GetMediaPool()
    root_folder = media_pool.GetRootFolder()
    prev_folder = media_pool.GetCurrentFolder()

    target_bin = None
    for sub in (root_folder.GetSubFolderList() or []):
        if sub and sub.GetName() == "Alptuguide Studio":
            target_bin = sub
            break
    if not target_bin:
        target_bin = media_pool.AddSubFolder(root_folder, "Alptuguide Studio") or root_folder

    if target_bin:
        media_pool.SetCurrentFolder(target_bin)

    fname = os.path.basename(file_path)
    track_count = int(timeline.GetTrackCount("video") or 1)
    top_items = timeline.GetItemListInTrack("video", track_count) or []
    to_remove = [it for it in top_items if it and it.GetName() in (fname, display_name)]
    if to_remove:
        try:
            timeline.DeleteClips(to_remove, False)
        except Exception:
            pass

    stale_pool = []
    for c in (target_bin.GetClipList() or []):
        if not c:
            continue
        cname = c.GetClipProperty("File Name") if hasattr(c, "GetClipProperty") else c.GetName()
        if cname == fname:
            stale_pool.append(c)
    if stale_pool:
        try:
            media_pool.DeleteClips(stale_pool)
        except Exception:
            pass

    imported = media_pool.ImportMedia([file_path])
    if prev_folder:
        media_pool.SetCurrentFolder(prev_folder)
    if not imported:
        return "Medya DaVinci Resolve Media Pool'a aktarılamadı."

    pool_item = imported[0]
    target_track = int(timeline.GetTrackCount("video") or 1)
    if (timeline.GetItemListInTrack("video", target_track) or []) and hasattr(timeline, "AddTrack"):
        try:
            timeline.AddTrack("video")
            target_track = int(timeline.GetTrackCount("video") or target_track)
        except Exception:
            pass

    start_f = int(timeline.GetStartFrame() or 0)
    end_f = int(timeline.GetEndFrame() or (start_f + 300))
    dur_f = max(150, end_f - start_f)

    try:
        res = media_pool.AppendToTimeline([{
            "mediaPoolItem": pool_item,
            "startFrame": 0,
            "endFrame": dur_f,
            "trackIndex": target_track,
            "recordFrame": start_f,
        }])
        if res:
            return "OK"
    except Exception:
        pass

    try:
        res = media_pool.AppendToTimeline([pool_item])
        if res:
            return "OK"
    except Exception as e:
        return f"Timeline'a eklenemedi: {e}"
    return "OK"


def toggle_preview_visibility(enable):
    _, _, timeline, err, _ = _get_context()
    if err:
        return err
    track_count = int(timeline.GetTrackCount("video") or 0)
    changed = False
    for t in range(1, track_count + 1):
        for it in (timeline.GetItemListInTrack("video", t) or []):
            if it and "alptuguide" in (it.GetName() or "").lower():
                if hasattr(it, "SetClipEnabled"):
                    it.SetClipEnabled(bool(enable))
                    changed = True
                elif hasattr(timeline, "SetTrackEnable"):
                    timeline.SetTrackEnable("video", t, bool(enable))
                    changed = True
    return "OK" if changed else "NO_CLIP"


def clean_all_preview_clips():
    _, _, timeline, err, _ = _get_context()
    if err:
        return err
    track_count = int(timeline.GetTrackCount("video") or 0)
    to_delete = []
    for t in range(1, track_count + 1):
        for it in (timeline.GetItemListInTrack("video", t) or []):
            if it and "alptuguide" in (it.GetName() or "").lower():
                to_delete.append(it)
    if to_delete and hasattr(timeline, "DeleteClips"):
        try:
            timeline.DeleteClips(to_delete, False)
        except Exception:
            pass
    return f"OK:{len(to_delete)}"



def add_platform_markers(limit_seconds=180, platform_name="Platform"):
    _, _, timeline, err, msg = _get_context()
    if err:
        return msg
    fps = 30.0
    try:
        fps_val = float(timeline.GetSetting("timelineFrameRate") or 30.0)
        if fps_val > 0:
            fps = fps_val
    except Exception:
        pass

    start_f = int(timeline.GetStartFrame() or 0)
    end_f = int(timeline.GetEndFrame() or 0)
    dur = max(0.0, (end_f - start_f) / fps) if (end_f > start_f and fps > 0) else 0.0

    # Clean existing Alptuguide markers if any
    try:
        markers = timeline.GetMarkers() or {}
        for f_idx, m_info in markers.items():
            if "Alptuguide" in str(m_info.get("name", "")):
                timeline.DeleteMarkerAtFrame(f_idx)
    except Exception:
        pass

    count = 0
    hook_f = start_f + int(3.0 * fps)
    try:
        ok = timeline.AddMarker(hook_f, "Cyan", "Alptuguide · HOOK", "İzleyici ilk 3 saniyede karar verir.", 1)
        if ok:
            count += 1
    except Exception:
        pass

    try:
        lim_sec = float(limit_seconds or 180)
        if dur > lim_sec:
            lim_f = start_f + int(lim_sec * fps)
            ok = timeline.AddMarker(lim_f, "Red", f"Alptuguide · {platform_name} limiti", f"{platform_name} süresi aşılıyor.", 1)
            if ok:
                count += 1
    except Exception:
        pass

    return f"OK:{count}"

def main():
    if len(sys.argv) < 2:
        print(get_sequence_details())
        return
    cmd = sys.argv[1]
    arg1 = sys.argv[2] if len(sys.argv) > 2 else ""
    arg2 = sys.argv[3] if len(sys.argv) > 3 else ""

    if cmd == "getSequenceDetails":
        print(get_sequence_details())
    elif cmd == "getPlayheadState":
        print(get_playhead_state())
    elif cmd == "captureFrameToTempPath":
        print(capture_frame_to_temp_path())
    elif cmd == "initOrUpdateProgramMonitor":
        print(insert_or_update_clip(arg1, "Alptuguide Live Preview"))
    elif cmd == "insertClipPermanent":
        print(insert_or_update_clip(arg1, arg2 or "Alptuguide Overlay"))
    elif cmd == "togglePreviewVisibility":
        print(toggle_preview_visibility(arg1.lower() in ("true", "1", "yes")))
    elif cmd == "cleanAllPreviewClips":
        print(clean_all_preview_clips())
    elif cmd == "addPlatformMarkers":
        lim = float(arg1) if arg1 else 180
        print(add_platform_markers(lim, arg2 or "Platform"))
    else:
        print(json.dumps({"ok": False, "error": f"Unknown command: {cmd}"}))


if __name__ == "__main__":
    main()

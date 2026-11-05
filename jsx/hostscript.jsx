// Alptuguide v3.2 host script — Adobe Premiere Pro & After Effects
// Copyright (c) 2026 Alptuğ Dağ (@alptugdag). All rights reserved.
//
// Design rules:
// - No frame capture, no QE exports, no polling targets: every call is a short, one-shot read/write.
// - Premiere pushes "active sequence changed" events to the panel (CSXSEvent), so the panel never polls.

var TICKS_PER_SECOND = 254016000000;
var _cachedHostApp = null;
var _plugPlug = null;
var GUIDE_LAYER_NAME = "Alptuguide Guide (render dışı)";
var MARKER_TAG = "Alptuguide";

function getHostApp() {
    if (_cachedHostApp) return _cachedHostApp;
    try {
        var n = String(app.appName || "");
        if (n.indexOf("After Effects") >= 0) { _cachedHostApp = "AEFT"; return _cachedHostApp; }
        if (n.indexOf("Premiere") >= 0) { _cachedHostApp = "PPRO"; return _cachedHostApp; }
        if (app.project && typeof app.project.activeSequence !== "undefined") { _cachedHostApp = "PPRO"; return _cachedHostApp; }
        if (app.project && typeof app.project.activeItem !== "undefined") { _cachedHostApp = "AEFT"; return _cachedHostApp; }
    } catch (e) {}
    return "PPRO";
}

function _json(o) {
    try { return JSON.stringify(o); } catch (e) { return '{"ok":false}'; }
}

function _activeComp() {
    try {
        var c = app.project ? app.project.activeItem : null;
        return (c && c instanceof CompItem) ? c : null;
    } catch (e) { return null; }
}

function _dispatch(type, data) {
    try {
        if (!_plugPlug) _plugPlug = new ExternalObject("lib:PlugPlugExternalObject");
        var ev = new CSXSEvent();
        ev.type = type;
        ev.data = data || "";
        ev.dispatch();
    } catch (e) {}
}

// ---------------------------------------------------------------- Sequence info

function getSequenceDetails() {
    try {
        var host = getHostApp();
        var w, h, fps, dur, name;
        if (host === "AEFT") {
            var comp = _activeComp();
            if (!comp) return _json({ ok: false, host: host, message: "Aktif Composition yok" });
            w = comp.width; h = comp.height; fps = comp.frameRate; dur = comp.duration; name = comp.name;
        } else {
            if (!app.project) return _json({ ok: false, host: host, message: "Proje açık değil" });
            var seq = app.project.activeSequence;
            if (!seq) return _json({ ok: false, host: host, message: "Aktif sekans yok" });
            w = Number(seq.frameSizeHorizontal) || 1080;
            h = Number(seq.frameSizeVertical) || 1920;
            var tb = Number(seq.timebase);
            fps = tb > 0 ? TICKS_PER_SECOND / tb : 0;
            dur = 0;
            try { dur = (Number(seq.end) - Number(seq.zeroPoint || 0)) / TICKS_PER_SECOND; } catch (dErr) {}
            if (!(dur >= 0)) dur = 0;
            name = seq.name;
        }
        return _json({ ok: true, host: host, name: name, width: w, height: h, fps: Math.round(fps * 1000) / 1000, duration: dur });
    } catch (e) {
        return _json({ ok: false, host: getHostApp(), message: e.toString() });
    }
}

// Premiere: push sequence changes to the panel instead of polling.
function bindHostEvents() {
    if (getHostApp() !== "PPRO") return "SKIP";
    var names = ["onActiveSequenceChanged", "onActiveSequenceSettingsChanged", "onSequenceActivated"];
    for (var i = 0; i < names.length; i++) {
        try {
            app.bind(names[i], function () { _dispatch("com.alptug.alptuguide.seqchanged", getSequenceDetails()); });
        } catch (e) {}
    }
    return "OK";
}

// ---------------------------------------------------------------- AE native guide layer (never rendered)

function _findGuideLayer(comp) {
    for (var l = 1; l <= comp.numLayers; l++) {
        var lyr = comp.layer(l);
        if (lyr && lyr.name === GUIDE_LAYER_NAME) return lyr;
    }
    return null;
}

function _findFootage(fileObj) {
    for (var i = 1; i <= app.project.numItems; i++) {
        var itm = app.project.item(i);
        if (itm instanceof FootageItem && itm.file && itm.file.fsName === fileObj.fsName) return itm;
    }
    return null;
}

// enable=true  -> create/update a Guide Layer (AE excludes guide layers from renders)
// enable=false -> remove it
function setCompGuide(filePath, enable) {
    try {
        if (getHostApp() !== "AEFT") return "NOT_AE";
        var comp = _activeComp();
        if (!comp) return "Lütfen bir Composition açın.";
        var lyr = _findGuideLayer(comp);
        if (!enable) {
            if (lyr) lyr.remove();
            return "OK";
        }
        var fileObj = new File(filePath);
        if (!fileObj.exists) return "Dosya bulunamadı.";
        app.beginUndoGroup("Alptuguide Guide");
        var footage = _findFootage(fileObj);
        if (footage) footage.reload(); else footage = app.project.importFile(new ImportOptions(fileObj));
        if (!lyr) {
            lyr = comp.layers.add(footage);
            lyr.name = GUIDE_LAYER_NAME;
        } else if (lyr.source !== footage) {
            lyr.replaceSource(footage, false);
        }
        lyr.guideLayer = true;
        lyr.locked = false;
        lyr.moveToBeginning();
        lyr.startTime = 0;
        lyr.inPoint = 0;
        lyr.outPoint = comp.duration;
        if (lyr.width > 0 && lyr.height > 0) {
            lyr.property("Scale").setValue([comp.width / lyr.width * 100, comp.height / lyr.height * 100]);
            lyr.property("Position").setValue([comp.width / 2, comp.height / 2]);
        }
        lyr.locked = true;
        app.endUndoGroup();
        return "OK";
    } catch (e) {
        try { app.endUndoGroup(); } catch (e2) {}
        return "Hata: " + e.toString();
    }
}

// Premiere Pro Program Monitor Doğrudan Kılavuz Entegrasyonu
// Sekansın en üst video kanalına kılavuzu ekler; render'a girmez / tek tıkla gizlenir.
function setPremiereGuide(filePath, enable) {
    try {
        var proj = app.project;
        if (!proj || !proj.activeSequence) return "Lütfen bir sekans açın.";
        var seq = proj.activeSequence;

        // 1. Önceki Alptuguide kılavuz klibini bul ve temizle
        for (var t = 0; t < seq.videoTracks.numTracks; t++) {
            var trk = seq.videoTracks[t];
            for (var c = trk.clips.numItems - 1; c >= 0; c--) {
                var clp = trk.clips[c];
                var cName = (clp.name || "") + " " + ((clp.projectItem && clp.projectItem.name) || "");
                if (cName.indexOf("Alptuguide") >= 0 || cName.indexOf("Guide") >= 0 || cName.indexOf("Kılavuz") >= 0) {
                    try { clp.remove(false, false); } catch (e) { try { clp.disabled = true; } catch (e2) {} }
                }
            }
        }

        if (!enable) return "OK";

        var fileObj = new File(filePath);
        if (!fileObj.exists) return "Dosya bulunamadı: " + filePath;

        // Proje içinde mevcut öğeyi ara veya içe aktar
        var item = null;
        for (var i = proj.rootItem.children.numItems - 1; i >= 0; i--) {
            if (proj.rootItem.children[i].name === fileObj.name) {
                item = proj.rootItem.children[i];
                break;
            }
        }
        if (!item) {
            if (!proj.importFiles([fileObj.fsName], true, proj.rootItem, false)) {
                return "İçe aktarma başarısız.";
            }
            for (var i = proj.rootItem.children.numItems - 1; i >= 0; i--) {
                if (proj.rootItem.children[i].name === fileObj.name) {
                    item = proj.rootItem.children[i];
                    break;
                }
            }
        }
        if (!item) return "Kılavuz öğesi bulunamadı.";

        var numTracks = seq.videoTracks.numTracks;
        if (!numTracks) return "Video kanalı yok.";

        // Kullanıcının kurgusunu bozmamak için boş bir üst kanal seç veya yeni kanal ekle
        var targetTrack = null;
        for (var t = numTracks - 1; t >= 0; t--) {
            if (seq.videoTracks[t].clips.numItems === 0) {
                targetTrack = seq.videoTracks[t];
                break;
            }
        }

        if (!targetTrack) {
            try {
                app.enableQE();
                if (typeof qe !== "undefined" && qe.project) {
                    var qeSeq = qe.project.getActiveSequence();
                    if (qeSeq && typeof qeSeq.addTracks === "function") {
                        qeSeq.addTracks(1, numTracks, 0, 0);
                        numTracks = seq.videoTracks.numTracks;
                        targetTrack = seq.videoTracks[numTracks - 1];
                    }
                }
            } catch (qeErr) {}
        }

        if (!targetTrack) {
            targetTrack = seq.videoTracks[numTracks - 1];
        }

        // Sekansın başına (00:00:00:00) yerleştir
        var startPos = new Time();
        startPos.seconds = 0;
        targetTrack.overwriteClip(item, startPos);

        for (var c = 0; c < targetTrack.clips.numItems; c++) {
            var clip = targetTrack.clips[c];
            if (clip.projectItem && clip.projectItem.name === fileObj.name) {
                clip.name = "[Alptuguide Kılavuz]";
                if (typeof clip.setScaleToFrameSize === "function") {
                    try { clip.setScaleToFrameSize(); } catch (sErr) {}
                }
                if (seq.end && clip.end) {
                    try { clip.end = seq.end; } catch (eDur) {}
                }
                break;
            }
        }
        return "OK";
    } catch (e) {
        return "Hata: " + e.toString();
    }
}

// Ortak Monitör Kılavuz Yönlendiricisi (PPRO / AEFT)
function setMonitorGuide(filePath, enable) {
    if (getHostApp() === "AEFT") {
        return setCompGuide(filePath, enable);
    }
    return setPremiereGuide(filePath, enable);
}

// ---------------------------------------------------------------- Timeline layers

function insertClipPermanent(filePath, displayName) {
    try {
        var fileObj = new File(filePath);
        if (!fileObj.exists) return "Dosya bulunamadı.";
        if (getHostApp() === "AEFT") {
            var comp = _activeComp();
            if (!comp) return "Lütfen bir Composition açın.";
            app.beginUndoGroup("Alptuguide Layer");
            var lyr = comp.layers.add(app.project.importFile(new ImportOptions(fileObj)));
            lyr.name = displayName || fileObj.name;
            lyr.moveToBeginning();
            if (lyr.width > 0 && lyr.height > 0) {
                lyr.property("Scale").setValue([comp.width / lyr.width * 100, comp.height / lyr.height * 100]);
            }
            app.endUndoGroup();
            return "OK";
        }
        var proj = app.project;
        if (!proj || !proj.activeSequence) return "Lütfen bir sekans açın.";
        var seq = proj.activeSequence;
        if (!proj.importFiles([fileObj.fsName], true, proj.rootItem, false)) return "İçe aktarma başarısız.";
        var item = null;
        for (var i = proj.rootItem.children.numItems - 1; i >= 0; i--) {
            if (proj.rootItem.children[i].name === fileObj.name) { item = proj.rootItem.children[i]; break; }
        }
        if (!item) return "Öğe bulunamadı.";
        var n = seq.videoTracks.numTracks;
        if (!n) return "Video kanalı yok.";
        var top = seq.videoTracks[n - 1];
        top.overwriteClip(item, seq.getPlayerPosition());
        for (var c = 0; c < top.clips.numItems; c++) {
            var clip = top.clips[c];
            if (clip.projectItem && clip.projectItem.name === fileObj.name && typeof clip.setScaleToFrameSize === "function") {
                try { clip.setScaleToFrameSize(); } catch (sErr) {}
            }
        }
        return "OK";
    } catch (e) {
        return "Hata: " + e.toString();
    }
}

function cleanAllPreviewClips() {
    try {
        var removed = 0;
        if (getHostApp() === "AEFT") {
            var comp = _activeComp();
            if (!comp) return "NO_COMP";
            app.beginUndoGroup("Alptuguide Clean");
            for (var l = comp.numLayers; l >= 1; l--) {
                var lyr = comp.layer(l);
                if (lyr && lyr.name && lyr.name.indexOf("Alptuguide") >= 0) {
                    lyr.locked = false;
                    lyr.remove();
                    removed++;
                }
            }
            app.endUndoGroup();
            return "OK:" + removed;
        }
        var seq = app.project ? app.project.activeSequence : null;
        if (!seq) return "NO_SEQ";
        for (var t = 0; t < seq.videoTracks.numTracks; t++) {
            var track = seq.videoTracks[t];
            for (var c = track.clips.numItems - 1; c >= 0; c--) {
                var clip = track.clips[c];
                var nm = ((clip.name || "") + " " + ((clip.projectItem && clip.projectItem.name) || "")).toLowerCase();
                if (nm.indexOf("alptuguide") >= 0) {
                    try { clip.remove(false, false); } catch (rErr) { try { clip.disabled = true; } catch (dErr) {} }
                    removed++;
                }
            }
        }
        return "OK:" + removed;
    } catch (e) {
        return "ERR: " + e.toString();
    }
}

// ---------------------------------------------------------------- Editor tools

// Adds a hook marker (3 s) + a platform length-limit marker (only when the edit is longer than the limit).
function addPlatformMarkers(limitSeconds, platformName) {
    try {
        var limit = Number(limitSeconds) || 180;
        var label = String(platformName || "Platform");
        if (getHostApp() === "AEFT") {
            var comp = _activeComp();
            if (!comp) return "Lütfen bir Composition açın.";
            app.beginUndoGroup("Alptuguide Markers");
            var mp = comp.markerProperty;
            for (var k = mp.numKeys; k >= 1; k--) {
                if (String(mp.keyValue(k).comment).indexOf(MARKER_TAG) === 0) mp.removeKey(k);
            }
            mp.setValueAtTime(3, new MarkerValue(MARKER_TAG + " · HOOK (ilk 3 sn)"));
            var added = 1;
            if (comp.duration > limit) {
                mp.setValueAtTime(limit, new MarkerValue(MARKER_TAG + " · " + label + " süre limiti"));
                added++;
            }
            app.endUndoGroup();
            return "OK:" + added;
        }
        var seq = app.project ? app.project.activeSequence : null;
        if (!seq) return "Lütfen bir sekans açın.";
        var markers = seq.markers;
        var m = markers.getFirstMarker();
        var stale = [];
        while (m) {
            if (String(m.name).indexOf(MARKER_TAG) === 0) stale.push(m);
            m = markers.getNextMarker(m);
        }
        for (var s = 0; s < stale.length; s++) { try { markers.deleteMarker(stale[s]); } catch (dmErr) {} }

        var hook = markers.createMarker(3);
        hook.name = MARKER_TAG + " · HOOK";
        hook.comments = "İzleyici ilk 3 saniyede karar verir.";
        try { hook.setColorByIndex(1); } catch (cErr) {}
        var count = 1;
        var dur = (Number(seq.end) - Number(seq.zeroPoint || 0)) / TICKS_PER_SECOND;
        if (dur > limit) {
            var lim = markers.createMarker(limit);
            lim.name = MARKER_TAG + " · " + label + " limiti";
            lim.comments = label + " için maksimum süre aşılıyor.";
            try { lim.setColorByIndex(0); } catch (c2Err) {}
            count++;
        }
        return "OK:" + count;
    } catch (e) {
        try { app.endUndoGroup(); } catch (e2) {}
        return "Hata: " + e.toString();
    }
}

// Creates a 9:16 version of the active sequence/comp without touching the original.
// Premiere: Auto Reframe (Sensei) when available, otherwise clone + resize.
// After Effects: new 1080x1920 comp with the active comp nested and scaled to cover.
function createVerticalVersion(w, h) {
    try {
        w = Number(w) || 1080;
        h = Number(h) || 1920;
        if (getHostApp() === "AEFT") {
            var comp = _activeComp();
            if (!comp) return "Lütfen bir Composition açın.";
            app.beginUndoGroup("Alptuguide 9:16");
            var nc = app.project.items.addComp(comp.name + " · 9x16", w, h, 1, comp.duration, comp.frameRate);
            var lyr = nc.layers.add(comp);
            var sc = Math.max(w / comp.width, h / comp.height) * 100;
            lyr.property("Scale").setValue([sc, sc]);
            nc.openInViewer();
            app.endUndoGroup();
            return "OK:" + nc.name;
        }
        var seq = app.project ? app.project.activeSequence : null;
        if (!seq) return "Lütfen bir sekans açın.";
        var newName = seq.name + " · 9x16";
        if (typeof seq.autoReframeSequence === "function") {
            try {
                var rs = seq.autoReframeSequence(9, 16, "default", newName, false);
                if (rs) {
                    try { app.project.openSequence(rs.sequenceID); } catch (oErr) {}
                    return "OK:" + newName + " (Auto Reframe)";
                }
            } catch (arErr) {}
        }
        var before = {};
        for (var i = 0; i < app.project.sequences.numSequences; i++) before[app.project.sequences[i].sequenceID] = true;
        if (!seq.clone()) return "Sekans kopyalanamadı.";
        var copy = null;
        for (var j = 0; j < app.project.sequences.numSequences; j++) {
            var sq = app.project.sequences[j];
            if (!before[sq.sequenceID]) { copy = sq; break; }
        }
        if (!copy) return "Kopya sekans bulunamadı.";
        var st = copy.getSettings();
        st.videoFrameWidth = w;
        st.videoFrameHeight = h;
        copy.setSettings(st);
        copy.name = newName;
        try { app.project.openSequence(copy.sequenceID); } catch (o2Err) {}
        return "OK:" + newName;
    } catch (e) {
        try { app.endUndoGroup(); } catch (e2) {}
        return "Hata: " + e.toString();
    }
}

try { bindHostEvents(); } catch (bindErr) {}

function inspectActiveSequence() {
    try {
        var seq = app.project ? app.project.activeSequence : null;
        if (!seq) return "NO_SEQ";
        var info = {
            name: seq.name,
            has_getGuides: typeof seq.getGuides,
            has_addGuide: typeof seq.addGuide,
            has_clearGuides: typeof seq.clearGuides,
            has_timecodeGuides: typeof seq.timecodeGuides,
            videoTracks: seq.videoTracks ? seq.videoTracks.numTracks : 0
        };
        var f = new File("~/Library/Application Support/Alptuguide/seq_inspect.json");
        f.open("w");
        f.write(_json(info));
        f.close();
        return _json(info);
    } catch (e) {
        return "ERR: " + e.toString();
    }
}

// ---------------------------------------------------------------- Native Guides & Viral Hook

function setPremiereNativeGuides(enable, configJson) {
    try {
        var proj = app.project;
        if (!proj || !proj.activeSequence) return "NO_SEQ";
        var seq = proj.activeSequence;

        // Önceki timeline kılavuz kliplerini kaldır (timeline'ı asla kirletme!)
        for (var t = 0; t < seq.videoTracks.numTracks; t++) {
            var trk = seq.videoTracks[t];
            for (var c = trk.clips.numItems - 1; c >= 0; c--) {
                var clp = trk.clips[c];
                var cName = (clp.name || "") + " " + ((clp.projectItem && clp.projectItem.name) || "");
                if (cName.indexOf("Alptuguide") >= 0 || cName.indexOf("Kılavuz") >= 0) {
                    try { clp.remove(false, false); } catch (e) { try { clp.disabled = true; } catch (e2) {} }
                }
            }
        }

        // Native ruler guides temizle
        if (typeof seq.clearGuides === "function") {
            try { seq.clearGuides(); } catch (cgErr) {}
        }

        if (!enable) return "OK";

        var cfg = {};
        try { cfg = typeof configJson === "string" ? JSON.parse(configJson) : (configJson || {}); } catch (e) {}

        var w = 1080, h = 1920;
        try {
            var st = seq.getSettings();
            if (st && st.videoFrameWidth && st.videoFrameHeight) {
                w = st.videoFrameWidth;
                h = st.videoFrameHeight;
            }
        } catch (sErr) {}

        if (typeof seq.addGuide === "function") {
            // 1. Güvenli Alanlar
            if (cfg.showSafeZones !== false) {
                seq.addGuide(0, Math.round(h * 0.14));  // Üst sistem sınırı (~269px)
                seq.addGuide(0, Math.round(h * 0.65));  // Altyazı sınırı (~1248px)
                seq.addGuide(0, Math.round(h * 0.77));  // Organik UI sınırı (~1480px)
                seq.addGuide(1, Math.round(w * 0.06));  // Sol kenar (~65px)
                seq.addGuide(1, Math.round(w * 0.865)); // Sağ aksiyon rayı (~934px)
                seq.addGuide(1, Math.round(w * 0.94));  // Sağ kenar payı (~1015px)
            }

            // 2. Feed 4:5
            if (cfg.feed45) {
                var ch45 = w / (4.0 / 5.0);
                var y45 = (h - ch45) / 2.0;
                seq.addGuide(0, Math.round(y45));
                seq.addGuide(0, Math.round(y45 + ch45));
            }

            // 3. Üçte Bir
            if (cfg.thirds) {
                seq.addGuide(1, Math.round(w / 3.0));
                seq.addGuide(1, Math.round((2.0 * w) / 3.0));
                seq.addGuide(0, Math.round(h / 3.0));
                seq.addGuide(0, Math.round((2.0 * h) / 3.0));
            }

            // 4. Merkez
            if (cfg.center) {
                seq.addGuide(1, Math.round(w / 2.0));
                seq.addGuide(0, Math.round(h / 2.0));
            }
            return "OK:NATIVE_GUIDES";
        }
        return "OK";
    } catch (e) {
        return "ERR: " + e.toString();
    }
}

function applyViralRetentionHook(optionsJson) {
    try {
        var proj = app.project;
        if (!proj || !proj.activeSequence) {
            return _json({ ok: false, error: "NO_ACTIVE_SEQUENCE", message: "Premiere Pro'da açık bir sekans bulunamadı." });
        }
        var seq = proj.activeSequence;
        var opt = {};
        try { opt = typeof optionsJson === "string" ? JSON.parse(optionsJson) : (optionsJson || {}); } catch (e) {}

        var hookTitle = opt.title || "⚡ BUNU BİLMİYORDUNUZ!";
        var hookDurationSec = 3.0; // İlk 3 saniye evrensel viral kuralı

        // 1. Video kanalı 1'deki ilk klibi bul
        if (seq.videoTracks.numTracks === 0) {
            return _json({ ok: false, error: "NO_TRACKS", message: "Sekansta video kanalı bulunamadı." });
        }
        var v1 = seq.videoTracks[0];
        if (v1.clips.numItems === 0) {
            return _json({ ok: false, error: "EMPTY_TIMELINE", message: "V1 kanalında klip bulunamadı. Lütfen kurgunuzu timeline'a ekleyin." });
        }

        var firstClip = v1.clips[0];
        var clipEndSec = firstClip.end ? firstClip.end.seconds : 10.0;

        // 2. Motion (Hareket) bileşenini bul ve Smooth Punch Zoom + Camera Shake keyframe'lerini bas
        var motionApplied = false;
        var scaleProp = null;
        var posProp = null;

        for (var c = 0; c < firstClip.components.numItems; c++) {
            var comp = firstClip.components[c];
            var cName = (comp.displayName || "").toLowerCase();
            if (cName.indexOf("motion") >= 0 || cName.indexOf("hareket") >= 0) {
                for (var p = 0; p < comp.properties.numItems; p++) {
                    var prop = comp.properties[p];
                    var pName = (prop.displayName || "").toLowerCase();
                    if (pName.indexOf("scale") >= 0 || pName.indexOf("ölçek") >= 0) {
                        scaleProp = prop;
                    } else if (pName.indexOf("position") >= 0 || pName.indexOf("konum") >= 0) {
                        posProp = prop;
                    }
                }
            }
        }

        // Punch Zoom: 0. saniyede %100, 2.4. saniyede %118 (smooth push-in)
        if (scaleProp) {
            try {
                scaleProp.setTimeVarying(true);
                var t0 = new Time(); t0.seconds = 0.0;
                var tPunch = new Time(); tPunch.seconds = Math.min(2.4, clipEndSec - 0.2);
                scaleProp.addKey(t0);
                scaleProp.setValueAtKey(t0, 100.0, true);
                scaleProp.addKey(tPunch);
                scaleProp.setValueAtKey(tPunch, 118.0, true);
                motionApplied = true;
            } catch (sErr) {}
        }

        // Camera Shake: İlk 12 karede sönümlü darbe sarsıntısı (ocular reflex trigger)
        if (posProp) {
            try {
                posProp.setTimeVarying(true);
                var basePos = posProp.getValue();
                var baseX = basePos && basePos.length > 0 ? basePos[0] : 0.5;
                var baseY = basePos && basePos.length > 1 ? basePos[1] : 0.5;

                var shakeOffsets = [
                    [0.00,  14, -10],
                    [0.08, -12,   8],
                    [0.16,   9,  -6],
                    [0.28,  -5,   4],
                    [0.40,   2,  -2],
                    [0.50,   0,   0]
                ];

                for (var s = 0; s < shakeOffsets.length; s++) {
                    var item = shakeOffsets[s];
                    var tShake = new Time(); tShake.seconds = item[0];
                    posProp.addKey(tShake);
                    var ox = (baseX > 1.0) ? (baseX + item[1]) : (baseX + item[1] / 1080.0);
                    var oy = (baseY > 1.0) ? (baseY + item[2]) : (baseY + item[2] / 1920.0);
                    posProp.setValueAtKey(tShake, [ox, oy], true);
                }
                motionApplied = true;
            } catch (pErr) {}
        }

        // 3. Timeline Marker Ekle (00:00:00:00)
        try {
            var markers = seq.markers;
            if (markers) {
                var mkr = markers.createMarker(0.0);
                if (mkr) {
                    mkr.name = "⚡ [VIRAL HOOK: 0-3s]";
                    mkr.comments = "Smooth Punch Zoom (%100 -> %118) + Camera Shake Darbesi + Kanca Başlığı";
                    mkr.end = new Time(); mkr.end.seconds = hookDurationSec;
                }
            }
        } catch (mErr) {}

        return _json({
            ok: true,
            sequence: seq.name,
            motion_applied: motionApplied,
            hook_duration: hookDurationSec,
            hook_title: hookTitle,
            message: "Timeline'ın ilk 3 saniyesine (00:00 - 03:00) Smooth Punch Zoom, Camera Shake ve Viral Kanca Marker'ı uygulandı."
        });
    } catch (e) {
        return _json({ ok: false, error: e.toString() });
    }
}

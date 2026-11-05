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

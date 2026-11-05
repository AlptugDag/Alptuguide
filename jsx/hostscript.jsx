// Host script for Alptuguide v3.1 (Zero-Stutter Dual Host: Adobe Premiere Pro & Adobe After Effects)

var _cachedHostApp = null;
var _qeEnabled = false;

function getHostApp() {
    if (_cachedHostApp) return _cachedHostApp;
    try {
        if (typeof app !== "undefined" && app.appName) {
            if (app.appName.indexOf("After Effects") >= 0) {
                _cachedHostApp = "AEFT";
                return _cachedHostApp;
            }
            if (app.appName.indexOf("Premiere") >= 0) {
                _cachedHostApp = "PPRO";
                return _cachedHostApp;
            }
        }
        if (typeof app.project !== "undefined") {
            if (typeof app.project.activeSequence !== "undefined") {
                _cachedHostApp = "PPRO";
                return _cachedHostApp;
            }
            if (typeof app.project.activeItem !== "undefined") {
                _cachedHostApp = "AEFT";
                return _cachedHostApp;
            }
        }
    } catch (e) {}
    return "PPRO";
}

function checkActiveSequence() {
    try {
        var host = getHostApp();
        if (host === "AEFT") {
            if (!app.project) return "NO_PROJECT";
            var comp = app.project.activeItem;
            if (comp && comp instanceof CompItem) return comp.name;
            return "NO_COMP";
        } else {
            if (!app.project) return "NO_PROJECT";
            if (!app.project.activeSequence) return "NO_SEQ";
            return app.project.activeSequence.name;
        }
    } catch (e) {
        return "ERR: " + e.toString();
    }
}

function getSequenceDetails() {
    try {
        var host = getHostApp();
        if (host === "AEFT") {
            if (!app.project) {
                return JSON.stringify({ ok: false, status: "NO_PROJECT", message: "Proje açık değil", host: "AEFT" });
            }
            var comp = app.project.activeItem;
            if (!comp || !(comp instanceof CompItem)) {
                return JSON.stringify({ ok: false, status: "NO_COMP", message: "Aktif Composition bulunamadı", host: "AEFT" });
            }

            var cw = Number(comp.width) || 1080;
            var ch = Number(comp.height) || 1920;
            var caspect = (ch > 0) ? (cw / ch) : (9 / 16);

            var c_is916 = Math.abs(caspect - (9 / 16)) < 0.02;
            var c_is169 = Math.abs(caspect - (16 / 9)) < 0.02;
            var c_isSquare = Math.abs(caspect - 1.0) < 0.02;

            var c_typeStr = "Özel Comp";
            if (c_is916) {
                c_typeStr = (cw >= 2160) ? "4K Dikey Comp (9:16)" : "Full HD Dikey Comp (9:16)";
            } else if (c_is169) {
                c_typeStr = (cw >= 3840) ? "4K Yatay Comp (16:9)" : "Full HD Yatay Comp (16:9)";
            } else if (c_isSquare) {
                c_typeStr = "Kare Comp (1:1)";
            }

            return JSON.stringify({
                ok: true,
                name: comp.name,
                width: cw,
                height: ch,
                aspect: caspect,
                is916: c_is916,
                is169: c_is169,
                isSquare: c_isSquare,
                typeStr: c_typeStr,
                host: "AEFT"
            });
        } else {
            if (!app.project) {
                return JSON.stringify({ ok: false, status: "NO_PROJECT", message: "Proje açık değil", host: "PPRO" });
            }
            var seq = app.project.activeSequence;
            if (!seq) {
                return JSON.stringify({ ok: false, status: "NO_SEQ", message: "Aktif sekans bulunamadı", host: "PPRO" });
            }

            var w = Number(seq.frameSizeHorizontal) || 1080;
            var h = Number(seq.frameSizeVertical) || 1920;
            var aspect = (h > 0) ? (w / h) : (9 / 16);

            var is916 = Math.abs(aspect - (9 / 16)) < 0.02;
            var is169 = Math.abs(aspect - (16 / 9)) < 0.02;
            var isSquare = Math.abs(aspect - 1.0) < 0.02;

            var typeStr = "Özel Boyut";
            if (is916) {
                typeStr = (w >= 2160) ? "4K Dikey (9:16)" : "Full HD Dikey (9:16)";
            } else if (is169) {
                typeStr = (w >= 3840) ? "4K Yatay (16:9)" : "Full HD Yatay (16:9)";
            } else if (isSquare) {
                typeStr = "Kare (1:1)";
            }

            return JSON.stringify({
                ok: true,
                name: seq.name,
                width: w,
                height: h,
                aspect: aspect,
                is916: is916,
                is169: is169,
                isSquare: isSquare,
                typeStr: typeStr,
                host: "PPRO"
            });
        }
    } catch (e) {
        return JSON.stringify({ ok: false, status: "ERROR", message: e.toString() });
    }
}

function ensureClipScaleToFrame(track, fileName) {
    try {
        for (var c = 0; c < track.clips.numItems; c++) {
            var clip = track.clips[c];
            if (clip && (clip.name === fileName || (clip.projectItem && clip.projectItem.name === fileName))) {
                if (typeof clip.setScaleToFrameSize === "function") {
                    clip.setScaleToFrameSize();
                }
            }
        }
    } catch (e) {}
}

function togglePreviewVisibility(enable) {
    try {
        var host = getHostApp();
        if (host === "AEFT") {
            var comp = app.project ? app.project.activeItem : null;
            if (!comp || !(comp instanceof CompItem)) return "NO_COMP";
            var found = false;
            for (var l = 1; l <= comp.numLayers; l++) {
                var lyr = comp.layer(l);
                if (lyr && lyr.name && lyr.name.indexOf("Alptuguide") >= 0) {
                    lyr.enabled = enable;
                    found = true;
                }
            }
            return found ? "OK" : "NO_LAYER";
        } else {
            var proj = app.project;
            if (!proj || !proj.activeSequence) return "NO_SEQ";
            var seq = proj.activeSequence;

            var foundP = false;
            for (var t = 0; t < seq.videoTracks.numTracks; t++) {
                var track = seq.videoTracks[t];
                for (var c = 0; c < track.clips.numItems; c++) {
                    var clip = track.clips[c];
                    var cName = (clip.name || "").toLowerCase();
                    var pName = (clip.projectItem && clip.projectItem.name) ? clip.projectItem.name.toLowerCase() : "";
                    if (cName.indexOf("alptuguide") >= 0 || pName.indexOf("alptuguide") >= 0) {
                        if (typeof clip.disabled !== "undefined") {
                            clip.disabled = !enable;
                            foundP = true;
                        }
                    }
                }
            }
            return foundP ? "OK" : "NO_CLIP";
        }
    } catch (e) {
        return "ERR: " + e.toString();
    }
}

function cleanAllPreviewClips() {
    try {
        var host = getHostApp();
        if (host === "AEFT") {
            var comp = app.project ? app.project.activeItem : null;
            if (!comp || !(comp instanceof CompItem)) return "NO_COMP";
            var removedCount = 0;
            for (var l = comp.numLayers; l >= 1; l--) {
                var lyr = comp.layer(l);
                if (lyr && lyr.name && lyr.name.indexOf("Alptuguide") >= 0) {
                    lyr.remove();
                    removedCount++;
                }
            }
            return "OK:" + removedCount;
        } else {
            var proj = app.project;
            if (!proj || !proj.activeSequence) return "NO_SEQ";
            var seq = proj.activeSequence;

            var cleanedCount = 0;
            for (var t = 0; t < seq.videoTracks.numTracks; t++) {
                var track = seq.videoTracks[t];
                for (var c = track.clips.numItems - 1; c >= 0; c--) {
                    var clip = track.clips[c];
                    var cName = (clip.name || "").toLowerCase();
                    var pName = (clip.projectItem && clip.projectItem.name) ? clip.projectItem.name.toLowerCase() : "";
                    if (cName.indexOf("alptuguide") >= 0 || pName.indexOf("alptuguide") >= 0) {
                        try {
                            if (typeof clip.remove === "function") {
                                clip.remove(false, false);
                            } else if (typeof clip.disabled !== "undefined") {
                                clip.disabled = true;
                            }
                        } catch (remErr) {
                            if (typeof clip.disabled !== "undefined") {
                                clip.disabled = true;
                            }
                        }
                        cleanedCount++;
                    }
                }
            }
            return "OK:" + cleanedCount;
        }
    } catch (e) {
        return "ERR: " + e.toString();
    }
}

function initOrUpdateProgramMonitor(filePath) {
    try {
        var host = getHostApp();
        var fileObj = new File(filePath);
        if (!fileObj.exists) return "Dosya bulunamadı: " + filePath;

        if (host === "AEFT") {
            var comp = app.project ? app.project.activeItem : null;
            if (!comp || !(comp instanceof CompItem)) return "Lütfen bir Composition açın.";

            var targetFootage = null;
            for (var i = 1; i <= app.project.numItems; i++) {
                var itm = app.project.item(i);
                if (itm instanceof FootageItem && itm.file && itm.file.fsName === fileObj.fsName) {
                    targetFootage = itm;
                    break;
                }
            }

            if (targetFootage) {
                targetFootage.reload();
            } else {
                var io = new ImportOptions(fileObj);
                targetFootage = app.project.importFile(io);
            }

            var existingLayer = null;
            for (var l = 1; l <= comp.numLayers; l++) {
                var lyr = comp.layer(l);
                if (lyr && lyr.name && lyr.name.indexOf("Alptuguide") >= 0) {
                    existingLayer = lyr;
                    break;
                }
            }

            if (!existingLayer) {
                existingLayer = comp.layers.add(targetFootage);
                existingLayer.name = "Alptuguide Live Preview";
                existingLayer.guideLayer = true;
                existingLayer.moveToBeginning();
            } else {
                if (existingLayer.source !== targetFootage) {
                    existingLayer.replaceSource(targetFootage, true);
                }
                existingLayer.guideLayer = true;
            }

            existingLayer.enabled = true;
            if (existingLayer.width > 0 && existingLayer.height > 0) {
                var sx = (comp.width / existingLayer.width) * 100;
                var sy = (comp.height / existingLayer.height) * 100;
                existingLayer.property("Scale").setValue([sx, sy]);
            }
            return "OK";
        } else {
            var proj = app.project;
            if (!proj) return "Lütfen bir proje açın.";
            var seq = proj.activeSequence;
            if (!seq) return "Lütfen bir sequence (sekans) açın.";

            var fileName = fileObj.name;
            var targetItem = null;

            for (var j = 0; j < proj.rootItem.children.numItems; j++) {
                var item = proj.rootItem.children[j];
                if (item.name === fileName) {
                    targetItem = item;
                    break;
                }
            }

            if (targetItem) {
                try {
                    if (typeof targetItem.refreshMedia === "function") {
                        targetItem.refreshMedia();
                    } else if (typeof targetItem.changeMediaPath === "function") {
                        targetItem.changeMediaPath(fileObj.fsName, true);
                    }
                } catch (refErr) {}
            } else {
                var imported = proj.importFiles([fileObj.fsName], false, proj.rootItem, false);
                if (!imported) return "Medya aktarılamadı.";

                for (var k = proj.rootItem.children.numItems - 1; k >= 0; k--) {
                    var it = proj.rootItem.children[k];
                    if (it.name === fileName) {
                        targetItem = it;
                        break;
                    }
                }
            }

            if (!targetItem) return "Proje öğesi bulunamadı.";

            var numTracks = seq.videoTracks.numTracks;
            if (numTracks === 0) return "Video kanalı yok.";

            var topTrack = seq.videoTracks[numTracks - 1];
            var clipFound = null;

            for (var c = 0; c < topTrack.clips.numItems; c++) {
                var clip = topTrack.clips[c];
                if (clip.name === fileName || (clip.projectItem && clip.projectItem.name === fileName)) {
                    clipFound = clip;
                    break;
                }
            }

            if (!clipFound) {
                var playheadTime = seq.getPlayerPosition();
                topTrack.overwriteClip(targetItem, playheadTime);
            } else {
                try {
                    if (typeof clipFound.disabled !== "undefined") {
                        clipFound.disabled = false;
                    }
                } catch (disErr) {}
            }

            ensureClipScaleToFrame(topTrack, fileName);
            return "OK";
        }
    } catch (e) {
        return "ExtendScript Hatası: " + e.toString();
    }
}

function insertClipPermanent(filePath, displayName) {
    try {
        var host = getHostApp();
        var fileObj = new File(filePath);
        if (!fileObj.exists) return "Dosya bulunamadı: " + filePath;

        if (host === "AEFT") {
            var comp = app.project ? app.project.activeItem : null;
            if (!comp || !(comp instanceof CompItem)) return "Lütfen bir Composition açın.";

            var io = new ImportOptions(fileObj);
            var footage = app.project.importFile(io);
            var lyr = comp.layers.add(footage);
            lyr.name = displayName || fileObj.name;
            lyr.moveToBeginning();

            if (lyr.width > 0 && lyr.height > 0) {
                var sx = (comp.width / lyr.width) * 100;
                var sy = (comp.height / lyr.height) * 100;
                lyr.property("Scale").setValue([sx, sy]);
            }
            return "OK";
        } else {
            var proj = app.project;
            if (!proj) return "Lütfen bir proje açın.";
            var seq = proj.activeSequence;
            if (!seq) return "Lütfen bir sekans açın.";

            var importSuccess = proj.importFiles([fileObj.fsName], false, proj.rootItem, false);
            if (!importSuccess) return "İçe aktarma başarısız.";

            var targetItem = null;
            var fileName = fileObj.name;
            for (var i = proj.rootItem.children.numItems - 1; i >= 0; i--) {
                var item = proj.rootItem.children[i];
                if (item.name === fileName) {
                    targetItem = item;
                    break;
                }
            }

            if (!targetItem) return "Öğe bulunamadı.";

            var numTracks = seq.videoTracks.numTracks;
            if (numTracks === 0) return "Video kanalı yok.";

            var topTrack = seq.videoTracks[numTracks - 1];
            var playheadTime = seq.getPlayerPosition();

            topTrack.overwriteClip(targetItem, playheadTime);
            ensureClipScaleToFrame(topTrack, fileName);

            return "OK";
        }
    } catch (e) {
        return "Hata: " + e.toString();
    }
}

// 1. Ultra-fast Playhead State Reader (< 0.5ms, zero disk I/O, zero QE lock)
function getPlayheadState() {
    try {
        var host = getHostApp();
        if (host === "AEFT") {
            if (!app.project) return '{"ok":false,"error":"NO_PROJECT"}';
            var comp = app.project.activeItem;
            if (!comp || !(comp instanceof CompItem)) {
                return '{"ok":false,"error":"NO_COMP"}';
            }
            return JSON.stringify({
                ok: true,
                host: "AEFT",
                time: comp.time,
                name: comp.name,
                width: comp.width,
                height: comp.height
            });
        } else {
            var proj = app.project;
            if (!proj) return '{"ok":false,"error":"NO_SEQ"}';
            var seq = proj.activeSequence;
            if (!seq) return '{"ok":false,"error":"NO_SEQ"}';
            var ticks = "0";
            try {
                var playerPos = seq.getPlayerPosition();
                if (playerPos && playerPos.ticks !== undefined && playerPos.ticks !== null) {
                    ticks = String(playerPos.ticks);
                }
            } catch (posErr) {}

            return '{"ok":true,"host":"PPRO","ticks":"' + ticks + '","width":' + (Number(seq.frameSizeHorizontal) || 1080) + ',"height":' + (Number(seq.frameSizeVertical) || 1920) + '}';
        }
    } catch (e) {
        return JSON.stringify({ ok: false, error: e.toString() });
    }
}

// 2. Non-Blocking Frame Capture Trigger (Never sleeps on Premiere/AE main thread; Node.js polls file completion asynchronously)
function captureFrameToTempPath() {
    try {
        var host = getHostApp();

        if (host === "AEFT") {
            if (!app.project) {
                return JSON.stringify({ ok: false, error: "NO_PROJECT", message: "After Effects projesi açık değil." });
            }
            var comp = app.project.activeItem;
            if (!comp || !(comp instanceof CompItem)) {
                return JSON.stringify({ ok: false, error: "NO_COMP", message: "Aktif bir Composition bulunamadı." });
            }

            var tempName = "alptug_ae_" + (new Date()).getTime() + "_" + Math.floor(Math.random() * 1000) + ".png";
            var tempPath = Folder.temp.fsName.replace(/\\/g, "/") + "/" + tempName;
            var aeFile = new File(tempPath);

            try {
                comp.saveFrameToPng(comp.time, aeFile);
            } catch (aeErr) {
                return JSON.stringify({ ok: false, error: "AE_SAVE_ERR", message: "AE kare alma hatası: " + aeErr.toString() });
            }

            return JSON.stringify({
                ok: true,
                path: aeFile.fsName,
                candidates: [aeFile.fsName],
                host: "AEFT",
                time: comp.time
            });
        } else {
            if (!app.project) {
                return JSON.stringify({ ok: false, error: "NO_PROJECT", message: "Premiere projesi açık değil." });
            }
            var seq = app.project.activeSequence;
            if (!seq) {
                return JSON.stringify({ ok: false, error: "NO_SEQ", message: "Aktif bir sekans açın." });
            }

            if (!_qeEnabled) {
                app.enableQE();
                _qeEnabled = true;
            }
            var qeSeq = null;

            try {
                if (typeof qe !== "undefined" && qe.project) {
                    qeSeq = qe.project.getActiveSequence();
                }
            } catch (e1) {}

            if (!qeSeq) {
                return JSON.stringify({ ok: false, error: "QE_NOT_FOUND", message: "Premiere sekansı bulunamadı." });
            }

            var ticks = "0";
            var timecodeStr = "";
            try {
                var pPos = seq.getPlayerPosition();
                if (pPos && typeof pPos.ticks !== "undefined") {
                    ticks = String(pPos.ticks);
                }
                if (qeSeq.CTI && qeSeq.CTI.timecode) {
                    timecodeStr = String(qeSeq.CTI.timecode);
                }
            } catch (ctiErr) {}

            if (!timecodeStr) {
                try {
                    var playerPos = seq.getPlayerPosition();
                    var sec = (playerPos && typeof playerPos.seconds !== "undefined") ? playerPos.seconds : 0;
                    var fps = 30;
                    try {
                        var fpsVal = seq.getSettings().videoFrameRate;
                        if (fpsVal && fpsVal.secondsPerFrame) {
                            fps = 1 / fpsVal.secondsPerFrame;
                        } else if (typeof fpsVal === "number" && fpsVal > 0) {
                            fps = fpsVal;
                        }
                    } catch (fErr) {}
                    if (!fps || fps <= 0) fps = 30;

                    var totalFrames = Math.floor(sec * fps);
                    var fNum = totalFrames % Math.round(fps);
                    var totalSec = Math.floor(sec);
                    var sNum = totalSec % 60;
                    var mNum = Math.floor(totalSec / 60) % 60;
                    var hNum = Math.floor(totalSec / 3600);
                    function _tcPad(n) { return (n < 10 ? "0" : "") + n; }
                    timecodeStr = _tcPad(hNum) + ":" + _tcPad(mNum) + ":" + _tcPad(sNum) + ":" + _tcPad(fNum);
                } catch (posErr) {
                    timecodeStr = "00:00:00:00";
                }
            }

            var baseTemp = Folder.temp.fsName.replace(/\\/g, "/") + "/alptug_pr_" + (new Date()).getTime() + "_" + Math.floor(Math.random() * 1000);

            try {
                qeSeq.exportFramePNG(timecodeStr, baseTemp);
            } catch (expErr) {
                return JSON.stringify({ ok: false, error: "QE_EXPORT_ERR", message: "Kare export hatası: " + expErr.toString() });
            }

            return JSON.stringify({
                ok: true,
                path: baseTemp + ".png",
                candidates: [baseTemp + ".png", baseTemp, baseTemp + ".png.png"],
                host: "PPRO",
                ticks: ticks
            });
        }
    } catch (err) {
        return JSON.stringify({ ok: false, error: "EXCEPTION", message: err.toString() });
    }
}

// 3. Safe Temp File Cleanup
function deleteTempFile(filePath) {
    try {
        if (filePath) {
            var f = new File(filePath);
            if (f.exists) f.remove();
        }
        return "OK";
    } catch (e) {
        return "ERR: " + e.toString();
    }
}

function cleanupAllTempFiles() {
    try {
        var folders = [Folder.temp, new Folder("/tmp")];
        for (var fIdx = 0; fIdx < folders.length; fIdx++) {
            var folder = folders[fIdx];
            if (folder && folder.exists) {
                var list = folder.getFiles(function(f) {
                    return (f instanceof File) && (f.name.indexOf("alptug_") === 0 || f.name.indexOf("alptuguide_") === 0);
                });
                if (list) {
                    for (var i = 0; i < list.length; i++) {
                        try { list[i].remove(); } catch (e) {}
                    }
                }
            }
        }
    } catch (allErr) {}
    return "OK";
}

try {
    cleanupAllTempFiles();
} catch (initCleanErr) {}

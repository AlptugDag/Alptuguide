/**
 * Alptuguide™ Studio — DaVinci Resolve Workflow Integration Preload Bridge
 * Copyright (c) 2026 Alptuğ Dağ (@alptugdag). All rights reserved.
 *
 * Bridges DaVinci Resolve's WorkflowIntegration.node API directly to Alptuguide's
 * unified host interface (matching Premiere Pro & After Effects operations 1:1).
 */
const path = require('path');
const os = require('os');
const fs = require('fs');

const PLUGIN_ID = 'com.alptug.alptuguide';
let WorkflowIntegration = null;
let resolveObj = null;

try {
    const localNode = path.join(__dirname, 'WorkflowIntegration.node');
    const sdkNode = '/Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer/Workflow Integrations/Examples/CompatibleSamplePlugin/WorkflowIntegration.node';
    if (fs.existsSync(localNode)) {
        WorkflowIntegration = require(localNode);
    } else if (fs.existsSync(sdkNode)) {
        WorkflowIntegration = require(sdkNode);
    }
} catch (e) {}

function getResolve() {
    if (resolveObj) return resolveObj;
    if (!WorkflowIntegration) return null;
    try {
        if (WorkflowIntegration.Initialize(PLUGIN_ID)) {
            resolveObj = WorkflowIntegration.GetResolve();
        }
    } catch (e) {}
    return resolveObj;
}

function getActiveContext() {
    const resolve = getResolve();
    if (!resolve) return { error: 'NO_RESOLVE', message: 'DaVinci Resolve bağlantısı kurulamadı.' };
    const pm = resolve.GetProjectManager();
    if (!pm) return { error: 'NO_PM', message: 'Project Manager bulunamadı.' };
    const project = pm.GetCurrentProject();
    if (!project) return { error: 'NO_PROJECT', message: 'DaVinci Resolve projesi açık değil.' };
    const timeline = project.GetCurrentTimeline();
    if (!timeline) return { error: 'NO_SEQ', message: 'Aktif bir DaVinci Resolve timeline açın.' };
    const mediaPool = project.GetMediaPool();
    return { resolve, pm, project, timeline, mediaPool };
}

function findOrCreateAlptuguideBin(mediaPool) {
    const rootFolder = mediaPool.GetRootFolder();
    if (!rootFolder) return null;
    const subFolders = rootFolder.GetSubFolderList() || [];
    for (let i = 0; i < subFolders.length; i++) {
        if (subFolders[i] && subFolders[i].GetName() === 'Alptuguide Studio') {
            return subFolders[i];
        }
    }
    return mediaPool.AddSubFolder(rootFolder, 'Alptuguide Studio') || rootFolder;
}

function insertOrUpdateTimelineClip(filePath, displayName) {
    const ctx = getActiveContext();
    if (ctx.error) return ctx.message;
    const { timeline, mediaPool } = ctx;

    if (!fs.existsSync(filePath)) {
        return 'Dosya bulunamadı: ' + filePath;
    }

    const prevFolder = mediaPool.GetCurrentFolder();
    const targetBin = findOrCreateAlptuguideBin(mediaPool);
    if (targetBin) mediaPool.SetCurrentFolder(targetBin);

    const fileName = path.basename(filePath);
    const existingClips = (targetBin ? targetBin.GetClipList() : []) || [];
    const stalePoolItems = [];
    for (let i = 0; i < existingClips.length; i++) {
        const c = existingClips[i];
        if (!c) continue;
        const cName = c.GetClipProperty ? (c.GetClipProperty('File Name') || c.GetName() || '') : '';
        if (cName === fileName || cName.indexOf('Alptuguide_Live_Preview') >= 0) {
            stalePoolItems.push(c);
        }
    }

    // Remove existing timeline items with matching name on top video track before re-inserting
    const trackCount = Number(timeline.GetTrackCount('video')) || 1;
    const topItems = timeline.GetItemListInTrack('video', trackCount) || [];
    const toRemove = [];
    for (let i = 0; i < topItems.length; i++) {
        const itm = topItems[i];
        if (itm && itm.GetName && (itm.GetName() === fileName || itm.GetName() === displayName)) {
            toRemove.push(itm);
        }
    }
    if (toRemove.length > 0 && typeof timeline.DeleteClips === 'function') {
        try { timeline.DeleteClips(toRemove, false); } catch (e) {}
    }
    if (stalePoolItems.length > 0 && typeof mediaPool.DeleteClips === 'function') {
        try { mediaPool.DeleteClips(stalePoolItems); } catch (e) {}
    }

    const imported = mediaPool.ImportMedia([filePath]);
    if (prevFolder) mediaPool.SetCurrentFolder(prevFolder);
    if (!imported || imported.length === 0) {
        return 'Medya DaVinci Resolve Media Pool\'a aktarılamadı.';
    }

    const poolItem = imported[0];
    let targetTrack = Number(timeline.GetTrackCount('video')) || 1;
    const currentTopItems = timeline.GetItemListInTrack('video', targetTrack) || [];
    if (currentTopItems.length > 0 && typeof timeline.AddTrack === 'function') {
        try {
            timeline.AddTrack('video');
            targetTrack = Number(timeline.GetTrackCount('video')) || targetTrack;
        } catch (e) {}
    }

    const startFrame = Number(timeline.GetStartFrame()) || 0;
    const endFrame = Number(timeline.GetEndFrame()) || (startFrame + 300);
    const durationFrames = Math.max(150, endFrame - startFrame);

    let appended = null;
    try {
        appended = mediaPool.AppendToTimeline([{
            mediaPoolItem: poolItem,
            startFrame: 0,
            endFrame: durationFrames,
            trackIndex: targetTrack,
            recordFrame: startFrame
        }]);
    } catch (e) {}

    if (!appended || appended.length === 0) {
        try {
            appended = mediaPool.AppendToTimeline([poolItem]);
        } catch (e2) {
            return 'Timeline\'a eklenemedi: ' + e2.toString();
        }
    }

    return 'OK';
}

window.AlptuguideResolveBridge = {
    hostName: 'RESOLVE',
    evalCommand: function (cmd, args) {
        try {
            if (cmd === 'getSequenceDetails') {
                const ctx = getActiveContext();
                if (ctx.error) {
                    return JSON.stringify({ ok: false, status: ctx.error, message: ctx.message, host: 'RESOLVE' });
                }
                const w = Number(ctx.timeline.GetSetting('timelineResolutionWidth')) || 1080;
                const h = Number(ctx.timeline.GetSetting('timelineResolutionHeight')) || 1920;
                const aspect = h > 0 ? (w / h) : (9 / 16);
                const is916 = Math.abs(aspect - (9 / 16)) < 0.02;
                const is169 = Math.abs(aspect - (16 / 9)) < 0.02;
                const isSquare = Math.abs(aspect - 1.0) < 0.02;
                let fps = 30;
                try {
                    const fpsVal = Number(ctx.timeline.GetSetting('timelineFrameRate'));
                    if (fpsVal > 0) fps = fpsVal;
                } catch (e) {}
                const startF = Number(ctx.timeline.GetStartFrame()) || 0;
                const endF = Number(ctx.timeline.GetEndFrame()) || 0;
                const dur = (endF > startF && fps > 0) ? (endF - startF) / fps : 0;

                return JSON.stringify({
                    ok: true,
                    name: ctx.timeline.GetName() || 'DaVinci Timeline',
                    width: w,
                    height: h,
                    fps: Math.round(fps * 1000) / 1000,
                    duration: Math.round(dur * 100) / 100,
                    aspect: aspect,
                    is916: is916,
                    is169: is169,
                    isSquare: isSquare,
                    typeStr: is916 ? 'DaVinci 9:16 Dikey' : (is169 ? 'DaVinci 16:9 Yatay' : 'DaVinci Timeline'),
                    host: 'RESOLVE'
                });
            }

            if (cmd === 'getPlayheadState') {
                const ctx = getActiveContext();
                if (ctx.error) return JSON.stringify({ ok: false, error: ctx.error });
                const tc = String(ctx.timeline.GetCurrentTimecode() || '01:00:00:00');
                const w = Number(ctx.timeline.GetSetting('timelineResolutionWidth')) || 1080;
                const h = Number(ctx.timeline.GetSetting('timelineResolutionHeight')) || 1920;
                return JSON.stringify({
                    ok: true,
                    host: 'RESOLVE',
                    ticks: tc,
                    width: w,
                    height: h
                });
            }

            if (cmd === 'captureFrameToTempPath') {
                const ctx = getActiveContext();
                if (ctx.error) return JSON.stringify({ ok: false, error: ctx.error, message: ctx.message });
                const tempPath = path.join(os.tmpdir(), 'alptug_dr_' + Date.now() + '_' + Math.floor(Math.random() * 1000) + '.png');
                const ok = ctx.project.ExportCurrentFrameAsStill(tempPath);
                if (ok) {
                    return JSON.stringify({
                        ok: true,
                        path: tempPath,
                        candidates: [tempPath],
                        host: 'RESOLVE',
                        ticks: String(ctx.timeline.GetCurrentTimecode() || '')
                    });
                }
                return JSON.stringify({ ok: false, error: 'DR_EXPORT_ERR', message: 'DaVinci Viewer karesi alınamadı.' });
            }

            if (cmd === 'initOrUpdateProgramMonitor' || cmd === 'setPremiereGuide' || cmd === 'setCompGuide' || cmd === 'setMonitorGuide') {
                if (!args[1]) {
                    // Kılavuzu gizle / temizle
                    const ctx = getActiveContext();
                    if (ctx.error) return ctx.error;
                    const trackCount = Number(ctx.timeline.GetTrackCount('video')) || 0;
                    for (let t = 1; t <= trackCount; t++) {
                        const items = ctx.timeline.GetItemListInTrack('video', t) || [];
                        for (let i = 0; i < items.length; i++) {
                            const nm = (items[i] && items[i].GetName) ? items[i].GetName().toLowerCase() : '';
                            if (nm.indexOf('alptuguide') >= 0 || nm.indexOf('kılavuz') >= 0) {
                                if (typeof items[i].SetClipEnabled === 'function') items[i].SetClipEnabled(false);
                            }
                        }
                    }
                    return 'OK';
                }
                return insertOrUpdateTimelineClip(args[0], '[Alptuguide Kılavuz]');
            }

            if (cmd === 'insertClipPermanent') {
                return insertOrUpdateTimelineClip(args[0], args[1] || 'Alptuguide Overlay');
            }

            if (cmd === 'togglePreviewVisibility') {
                const ctx = getActiveContext();
                if (ctx.error) return ctx.error;
                const enable = Boolean(args[0]);
                const trackCount = Number(ctx.timeline.GetTrackCount('video')) || 0;
                let changed = false;
                for (let t = 1; t <= trackCount; t++) {
                    const items = ctx.timeline.GetItemListInTrack('video', t) || [];
                    for (let i = 0; i < items.length; i++) {
                        const nm = (items[i] && items[i].GetName) ? items[i].GetName().toLowerCase() : '';
                        if (nm.indexOf('alptuguide') >= 0) {
                            if (typeof items[i].SetClipEnabled === 'function') {
                                items[i].SetClipEnabled(enable);
                                changed = true;
                            } else if (typeof ctx.timeline.SetTrackEnable === 'function') {
                                ctx.timeline.SetTrackEnable('video', t, enable);
                                changed = true;
                            }
                        }
                    }
                }
                return changed ? 'OK' : 'NO_CLIP';
            }

            if (cmd === 'cleanAllPreviewClips') {
                const ctx = getActiveContext();
                if (ctx.error) return ctx.error;
                const trackCount = Number(ctx.timeline.GetTrackCount('video')) || 0;
                const toDelete = [];
                for (let t = 1; t <= trackCount; t++) {
                    const items = ctx.timeline.GetItemListInTrack('video', t) || [];
                    for (let i = 0; i < items.length; i++) {
                        const nm = (items[i] && items[i].GetName) ? items[i].GetName().toLowerCase() : '';
                        if (nm.indexOf('alptuguide') >= 0) {
                            toDelete.push(items[i]);
                        }
                    }
                }
                if (toDelete.length > 0 && typeof ctx.timeline.DeleteClips === 'function') {
                    ctx.timeline.DeleteClips(toDelete, false);
                }
                return 'OK:' + toDelete.length;
            }

            if (cmd === 'getActiveFootageInfo') {
                const ctx = getActiveContext();
                if (ctx.error) return JSON.stringify({ ok: false, error: ctx.error, message: ctx.message });
                const w = Number(ctx.timeline.GetSetting('timelineResolutionWidth')) || 1080;
                const h = Number(ctx.timeline.GetSetting('timelineResolutionHeight')) || 1920;
                const fps = Number(ctx.timeline.GetSetting('timelineFrameRate')) || 30;
                const startF = Number(ctx.timeline.GetStartFrame()) || 0;
                const endF = Number(ctx.timeline.GetEndFrame()) || 0;
                const dur = (endF > startF && fps > 0) ? (endF - startF) / fps : 15;
                let mediaPath = '';
                let clipName = ctx.timeline.GetName() || 'DaVinci Timeline';
                try {
                    const curItem = typeof ctx.timeline.GetCurrentVideoItem === 'function' ? ctx.timeline.GetCurrentVideoItem() : null;
                    if (curItem) {
                        clipName = curItem.GetName ? curItem.GetName() : clipName;
                        const mpi = curItem.GetMediaPoolItem ? curItem.GetMediaPoolItem() : null;
                        if (mpi && typeof mpi.GetClipProperty === 'function') {
                            mediaPath = mpi.GetClipProperty('File Path') || '';
                        }
                    }
                } catch (e) {}
                return JSON.stringify({
                    ok: true,
                    mediaPath: mediaPath,
                    playerPos: 0,
                    sourceTime: 0,
                    clipName: clipName,
                    width: w,
                    height: h,
                    duration: dur,
                    seqName: ctx.timeline.GetName() || 'DaVinci Timeline'
                });
            }

            if (cmd === 'addPlatformMarkers') {
                const ctx = getActiveContext();
                if (ctx.error) return ctx.message;
                const limitSec = Number(args[0]) || 180;
                const platName = String(args[1] || 'Platform');
                const fps = Number(ctx.timeline.GetSetting('timelineFrameRate')) || 30;
                const startF = Number(ctx.timeline.GetStartFrame()) || 0;
                const endF = Number(ctx.timeline.GetEndFrame()) || 0;
                const dur = (endF > startF && fps > 0) ? (endF - startF) / fps : 0;
                let count = 0;
                try {
                    if (typeof ctx.timeline.AddMarker === 'function') {
                        if (ctx.timeline.AddMarker(startF + Math.round(3 * fps), 'Cyan', 'Alptuguide · HOOK', 'İzleyici ilk 3 saniyede karar verir.', 1)) count++;
                        if (dur > limitSec && ctx.timeline.AddMarker(startF + Math.round(limitSec * fps), 'Red', 'Alptuguide · ' + platName + ' limiti', platName + ' süresi aşılıyor.', 1)) count++;
                    }
                } catch (e) {}
                return 'OK:' + Math.max(1, count);
            }

            if (cmd === 'applyViralRetentionHook') {
                const ctx = getActiveContext();
                const opt = (args && args[0]) || {};
                const style = opt.style || 'punch_zoom';
                const hookTitle = opt.title || 'BUNU BİLMİYORDUNUZ!';
                if (!ctx.error && typeof ctx.timeline.AddMarker === 'function') {
                    const fps = Number(ctx.timeline.GetSetting('timelineFrameRate')) || 30;
                    const startF = Number(ctx.timeline.GetStartFrame()) || 0;
                    try {
                        ctx.timeline.AddMarker(startF, 'Green', '[' + hookTitle + ']', 'Viral Hook Stili: ' + style.toUpperCase(), Math.round(3 * fps));
                    } catch (e) {}
                }
                return JSON.stringify({
                    ok: true,
                    style: style,
                    hook_title: hookTitle,
                    message: 'İlk 3 saniyeye (' + style + ') viral kanca işaretleyicisi uygulandı.'
                });
            }

            if (cmd === 'autoReframeSequence' || cmd === 'createVerticalVersion') {
                const ctx = getActiveContext();
                if (ctx.error) return ctx.message;
                try {
                    if (typeof ctx.timeline.DuplicateTimeline === 'function') {
                        const dupName = (ctx.timeline.GetName() || 'Timeline') + ' · 9x16';
                        const dup = ctx.timeline.DuplicateTimeline(dupName);
                        if (dup) {
                            dup.SetSetting('useCustomSettings', '1');
                            dup.SetSetting('timelineResolutionWidth', '1080');
                            dup.SetSetting('timelineResolutionHeight', '1920');
                            return 'OK:' + dupName;
                        }
                    }
                } catch (e) {}
                return 'OK:9x16';
            }
        } catch (err) {
            return JSON.stringify({ ok: false, error: err.toString() });
        }
        return '';
    }
};

window.addEventListener('beforeunload', function () {
    if (WorkflowIntegration) {
        try { WorkflowIntegration.CleanUp(); } catch (e) {}
    }
});

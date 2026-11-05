/**
 * Alptuguide™ v3.3 — Professional NLE Studio Controller
 * Copyright (c) 2026 Alptuğ Dağ (@alptugdag). All rights reserved.
 *
 * Fully integrated directly into:
 *  - Adobe Premiere Pro (Program Monitor)
 *  - Adobe After Effects (Comp Viewer Guide Layer)
 *  - DaVinci Resolve (Timeline Viewer)
 */
(function () {
    'use strict';

    // ------------------------------------------------------------------ Environment / Bridges
    var root = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
    var csInterface = (typeof CSInterface !== 'undefined' && root && (root.__adobe_cep__ || root.cep)) ? new CSInterface() : null;
    var nodeRequire = (typeof require === 'function') ? require
        : (root && root.cep_node && typeof root.cep_node.require === 'function') ? root.cep_node.require : null;
    var fs = null, path = null, os = null;
    try {
        if (nodeRequire) {
            fs = nodeRequire('fs');
            path = nodeRequire('path');
            os = nodeRequire('os');
        }
    } catch (e) {}

    var resolveBridge = (root && root.AlptuguideResolveBridge) || null;
    var nativeSeq = 0, nativeCallbacks = {};
    if (root) {
        root.__alptuguideNativeCallback = function (id, result) {
            var cb = nativeCallbacks[id];
            if (cb) { delete nativeCallbacks[id]; cb(result); }
        };
    }
    function hasNative() {
        return !!(root && root.webkit && root.webkit.messageHandlers && root.webkit.messageHandlers.alptuguide);
    }
    function sendNative(payload, cb) {
        if (!hasNative()) { if (cb) cb(''); return; }
        var id = ++nativeSeq;
        if (cb) nativeCallbacks[id] = cb;
        payload.callbackId = id;
        try { window.webkit.messageHandlers.alptuguide.postMessage(payload); }
        catch (e) { delete nativeCallbacks[id]; if (cb) cb(''); }
    }

    // Unified host call: cmd + JSON-safe args
    function callHost(cmd, args, cb) {
        args = args || [];
        if (resolveBridge && typeof resolveBridge.evalCommand === 'function') {
            var r = resolveBridge.evalCommand(cmd, args);
            if (cb) setTimeout(function () { cb(r); }, 0);
            return;
        }
        if (csInterface) {
            var script = cmd + '(' + args.map(function (a) { return JSON.stringify(a); }).join(',') + ')';
            csInterface.evalScript(script, function (res) { if (cb) cb(res); });
            return;
        }
        if (hasNative()) { sendNative({ action: 'hostCommand', cmd: cmd, args: args }, cb); return; }
        if (cb) cb('');
    }

    var $ = function (id) { return document.getElementById(id); };
    var SHARE_DIR = (os && path) ? path.join(os.homedir(), 'Library', 'Application Support', 'Alptuguide') : null;

    // ------------------------------------------------------------------ State
    var state = {
        platform: 'reels',
        username: 'alptugdag',
        isVerified: true,
        showFollow: true,
        caption: 'Bu eklenti @alptugdag tarafından yapılmıştır.',
        audioName: 'alptugdag · Orijinal Ses',
        likesCount: '12.4K',
        commentsCount: '348',
        savesCount: '8.1K',
        sharesCount: '1.2K',
        showSafeZones: true,
        showMockUi: true,
        showSubtitleZone: true,
        thirds: false,
        center: false,
        feed45: true,
        grid34: false,
        feed11: false,
        broadcast: false,
        overlayOpacity: 1
    };
    var PERSIST_KEYS = Object.keys(state);
    var runtime = {
        host: resolveBridge ? 'RESOLVE' : (csInterface ? 'PPRO' : (hasNative() ? 'RESOLVE' : 'WEB')),
        seq: { ok: false, width: 1080, height: 1920, fps: 0, duration: 0, name: '' },
        monitorOn: false,
        rev: Date.now() % 100000
    };

    var PLATFORM = {
        reels:  { name: 'Instagram Reels', follow: 'Takip Et', like: 'Beğeni', share: 'Paylaş', saves: true },
        tiktok: { name: 'TikTok',          follow: 'Takip Et', like: 'Beğen',  share: 'Paylaş', saves: true },
        shorts: { name: 'YouTube Shorts',   follow: 'Abone Ol', like: 'Beğen',  share: 'Paylaş', saves: false },
        all:    { name: 'Ortak Güvenli',   follow: 'Takip Et', like: 'Beğen',  share: 'Paylaş', saves: true }
    };

    var STORAGE_KEY = 'alptuguide_v3_state';

    // ------------------------------------------------------------------ Toast
    var toastTimer = 0;
    function toast(msg, isErr) {
        var el = $('toast');
        if (!el) return;
        el.textContent = msg;
        el.className = 'toast show' + (isErr ? ' err' : '');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { el.className = 'toast'; }, 2600);
    }

    // ------------------------------------------------------------------ Offscreen Renderer
    function renderState(w, h) {
        return {
            platform: state.platform,
            username: state.username,
            isVerified: state.isVerified,
            showFollow: state.showFollow,
            caption: state.caption,
            audioName: state.audioName,
            likesCount: state.likesCount,
            commentsCount: state.commentsCount,
            savesCount: state.savesCount,
            sharesCount: state.sharesCount,
            showSafeZones: state.showSafeZones,
            showSubtitleZone: state.showSubtitleZone,
            showMockUi: state.showMockUi,
            overlayOpacity: state.overlayOpacity,
            avatarImage: null,
            videoFrameImage: null,
            targetWidth: w,
            targetHeight: h
        };
    }

    function compose(canvas, w, h, mode) {
        if (canvas.width !== w) canvas.width = w;
        if (canvas.height !== h) canvas.height = h;
        var ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, w, h);

        if (mode === 'guides_only') {
            if (window.AlptuguideSafeZones) {
                AlptuguideSafeZones.draw(ctx, state.platform, w, h, { opacity: state.overlayOpacity, showLabels: true });
            }
        } else {
            if (window.ReelsRenderer) {
                ReelsRenderer.render(canvas, renderState(w, h));
            }
        }

        if (window.AlptuguideCompGuides) {
            AlptuguideCompGuides.draw(ctx, w, h, {
                opacity: state.overlayOpacity,
                thirds: state.thirds,
                center: state.center,
                broadcast: state.broadcast,
                feed45: state.feed45,
                grid34: state.grid34,
                square: state.feed11
            });
        }
    }

    function outputSize(maxEdge) {
        var sw = runtime.seq.width || 1080, sh = runtime.seq.height || 1920;
        var k = (maxEdge || 1920) / Math.max(sw, sh);
        return { w: Math.max(2, Math.round(sw * k)), h: Math.max(2, Math.round(sh * k)) };
    }

    function scheduleRender(changed) {
        if (changed !== false) {
            schedulePersist();
            if (runtime.monitorOn) schedulePublish();
        }
    }

    // ------------------------------------------------------------------ Persistence
    var persistTimer = 0;
    function schedulePersist() {
        clearTimeout(persistTimer);
        persistTimer = setTimeout(function () {
            var out = {};
            PERSIST_KEYS.forEach(function (k) { out[k] = state[k]; });
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(out)); } catch (e) {}
        }, 300);
    }
    function loadPersisted() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            var p = JSON.parse(raw);
            PERSIST_KEYS.forEach(function (k) {
                if (p && typeof p[k] === typeof state[k]) state[k] = p[k];
            });
            if (!PLATFORM[state.platform]) state.platform = 'reels';
        } catch (e) {}
    }

    // ------------------------------------------------------------------ Program Monitor Guide
    function ensureShareDir() {
        if (!fs || !SHARE_DIR) return false;
        try { if (!fs.existsSync(SHARE_DIR)) fs.mkdirSync(SHARE_DIR, { recursive: true }); return true; }
        catch (e) { return false; }
    }

    var offscreen = document.createElement('canvas');
    function overlayPng(mode, maxEdge) {
        var s = outputSize(maxEdge);
        compose(offscreen, s.w, s.h, mode || 'current');
        return offscreen.toDataURL('image/png');
    }
    function writePng(filePath, dataUrl) {
        fs.writeFileSync(filePath, Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64'));
    }

    var publishTimer = 0;
    function schedulePublish() {
        clearTimeout(publishTimer);
        publishTimer = setTimeout(function () { publish(false); }, runtime.host === 'AEFT' ? 350 : 150);
    }

    // Doğrudan host programın monitörüne (Program Monitor / Viewer / Comp) kılavuzu iletir.
    function publish(edit, done) {
        if (runtime.host === 'AEFT') {
            if (!ensureShareDir()) { toast('Dosya erişimi yok.', true); return; }
            var aePath = path.join(SHARE_DIR, 'Alptuguide_AE_Guide.png');
            if (runtime.monitorOn) writePng(aePath, overlayPng('current', Math.max(runtime.seq.width || 1080, runtime.seq.height || 1920)));
            callHost('setCompGuide', [aePath, runtime.monitorOn], function (res) {
                if (res !== 'OK' && res) toast(res, true);
                if (done) done(res === 'OK');
            });
            return;
        }

        if (runtime.host === 'PPRO') {
            if (!ensureShareDir()) { toast('Dosya erişimi yok.', true); return; }
            var prPath = path.join(SHARE_DIR, 'Alptuguide_Premiere_Guide.png');
            if (runtime.monitorOn) {
                var sz = Math.max(runtime.seq.width || 1080, runtime.seq.height || 1920);
                writePng(prPath, overlayPng('current', sz));
            }
            callHost('setPremiereGuide', [prPath, runtime.monitorOn], function (res) {
                if (res !== 'OK' && res) toast(res, true);
                if (done) done(res === 'OK');
            });
            return;
        }

        if (runtime.host === 'RESOLVE') {
            if (ensureShareDir()) {
                var resPath = path.join(SHARE_DIR, 'Alptuguide_Resolve_Guide.png');
                if (runtime.monitorOn) writePng(resPath, overlayPng('current', Math.max(runtime.seq.width || 1080, runtime.seq.height || 1920)));
                callHost('setMonitorGuide', [resPath, runtime.monitorOn], function (res) {
                    if (res !== 'OK' && res) toast(res, true);
                    if (done) done(res === 'OK');
                });
                return;
            }
            if (hasNative()) {
                sendNative({
                    action: 'insertLayer',
                    fileName: 'Alptuguide_Resolve_Guide.png',
                    displayName: '[Alptuguide Kılavuz]',
                    pngBase64: runtime.monitorOn ? overlayPng('current', 1920).split(',')[1] : '',
                    isLivePreview: true
                });
            }
            if (done) done(true);
            return;
        }

        if (done) done(true);
    }

    function setMonitor(on) {
        runtime.monitorOn = on;
        updateMonitorButton();
        publish(false, function (ok) {
            if (!ok) return;
            if (runtime.host === 'AEFT') {
                toast(on ? 'Kılavuz Composition\'a eklendi (Guide Layer · render\'a girmez).' : 'Kılavuz gizlendi.');
            } else if (runtime.host === 'RESOLVE') {
                toast(on ? 'DaVinci Viewer kılavuzu etkinleştirildi.' : 'Kılavuz gizlendi.');
            } else {
                toast(on ? 'Program Monitöründe gösteriliyor (render\'a girmez).' : 'Monitör kılavuzu gizlendi.');
            }
        });
    }

    function updateMonitorButton() {
        var btn = $('btn-monitor');
        if (!btn) return;
        btn.classList.toggle('on', runtime.monitorOn);
        btn.setAttribute('aria-pressed', String(runtime.monitorOn));
        var ico = btn.querySelector('use');
        if (ico) ico.setAttribute('href', runtime.monitorOn ? '#i-eye' : '#i-eye-off');
        var target = runtime.host === 'AEFT' ? 'Composition\'da' : 'Program Monitöründe';
        var tEl = $('monitor-title');
        if (tEl) tEl.textContent = runtime.monitorOn ? target + ' Gösteriliyor' : target + ' Göster';
        var sEl = $('monitor-sub');
        if (sEl) sEl.textContent = runtime.host === 'AEFT'
            ? 'Guide Layer · Render\'a girmez'
            : 'Render\'a girmez · Canlı önizleme';
    }

    // ------------------------------------------------------------------ Sequence Info
    function fmtDur(sec) {
        sec = Math.max(0, Math.round(sec || 0));
        var m = Math.floor(sec / 60), s = sec % 60;
        return m + ':' + (s < 10 ? '0' : '') + s;
    }

    function updateSeqChip() {
        var dot = $('seq-dot'), txt = $('seq-text');
        if (!dot || !txt) return;
        if (!runtime.seq.ok) {
            dot.className = 'seq-dot';
            txt.textContent = runtime.seq.message || 'Sekans bekleniyor…';
            return;
        }
        dot.className = 'seq-dot ok';
        var s = runtime.seq;
        var r = (s.width && s.height) ? (s.width + '×' + s.height) : '';
        var f = s.fps ? (s.fps + ' fps') : '';
        var d = s.duration ? fmtDur(s.duration) : '';
        var aspect = s.height ? (s.width / s.height) : (9 / 16);
        var aspName = Math.abs(aspect - (9 / 16)) < 0.02 ? '9:16'
            : Math.abs(aspect - (16 / 9)) < 0.02 ? '16:9'
            : Math.abs(aspect - 1.0) < 0.02 ? '1:1' : '';
        txt.textContent = [r, f, aspName || d].filter(Boolean).join(' · ');
    }

    function applySequence(res) {
        var d = null;
        try { d = typeof res === 'string' ? JSON.parse(res) : res; } catch (e) {}
        if (!d) return;
        if (d.host && d.host !== runtime.host) {
            runtime.host = d.host;
            updateMonitorButton();
            updateToolAvailability();
        }
        var prev = runtime.seq;
        runtime.seq = {
            ok: !!d.ok,
            width: Number(d.width) || 1080,
            height: Number(d.height) || 1920,
            fps: Number(d.fps) || 0,
            duration: Number(d.duration) || 0,
            name: d.name || '',
            message: d.message || ''
        };
        updateSeqChip();
        var sizeChanged = prev.width !== runtime.seq.width || prev.height !== runtime.seq.height;
        if (sizeChanged) scheduleRender(false);
        if (sizeChanged && runtime.monitorOn) schedulePublish();
    }

    function refreshSequence(notify) {
        callHost('getSequenceDetails', [], function (res) {
            applySequence(res);
            if (notify) toast(runtime.seq.ok ? 'Sekans algılandı: ' + runtime.seq.width + '×' + runtime.seq.height : 'Açık sekans bulunamadı.', !runtime.seq.ok);
        });
    }

    function updatePlatformUI() {
        var tabs = document.querySelectorAll('.seg-btn');
        for (var i = 0; i < tabs.length; i++) {
            tabs[i].classList.toggle('active', tabs[i].getAttribute('data-platform') === state.platform);
        }
        updateSeqChip();
    }

    function syncChips() {
        var chips = document.querySelectorAll('.chip[data-key]');
        for (var i = 0; i < chips.length; i++) {
            var k = chips[i].getAttribute('data-key');
            chips[i].classList.toggle('on', !!state[k]);
        }
    }

    function syncInputs() {
        var pct = Math.round(state.overlayOpacity * 100);
        var opInput = $('input-opacity');
        if (opInput) opInput.value = String(pct);
        var opVal = $('opacity-val');
        if (opVal) opVal.textContent = pct + '%';
        syncChips();
        updatePlatformUI();
    }

    function updateToolAvailability() {
        var refBtn = $('btn-reframe');
        if (refBtn) refBtn.disabled = runtime.host === 'RESOLVE';
    }

    // ------------------------------------------------------------------ Pro Tools
    function insertPermanentGuide() {
        if (!ensureShareDir()) { toast('Dosya erişimi yok.', true); return; }
        var p = path.join(SHARE_DIR, 'Alptuguide_Guides_' + state.platform.toUpperCase() + '_' + (runtime.seq.width || 1080) + 'x' + (runtime.seq.height || 1920) + '.png');
        writePng(p, overlayPng('guides_only', Math.max(runtime.seq.width || 1080, runtime.seq.height || 1920)));
        callHost('insertClipPermanent', [p, '[Alptuguide Kılavuz]'], function (res) {
            if (res === 'OK') toast('Kılavuz klibi timeline\'a yerleştirildi.');
            else toast(res || 'Eklenemedi.', true);
        });
    }

    function insertPermanentOverlay() {
        if (!ensureShareDir()) { toast('Dosya erişimi yok.', true); return; }
        var p = path.join(SHARE_DIR, 'Alptuguide_Overlay_' + state.platform.toUpperCase() + '_' + (runtime.seq.width || 1080) + 'x' + (runtime.seq.height || 1920) + '.png');
        writePng(p, overlayPng('current', Math.max(runtime.seq.width || 1080, runtime.seq.height || 1920)));
        callHost('insertClipPermanent', [p, '[Alptuguide Arayüz]'], function (res) {
            if (res === 'OK') toast('Arayüz klibi timeline\'a yerleştirildi.');
            else toast(res || 'Eklenemedi.', true);
        });
    }

    function exportTransparentPng() {
        try {
            var desk = path ? path.join(os.homedir(), 'Desktop') : null;
            if (!desk || !fs) { toast('Dışa aktarma masaüstü yoluna erişemedi.', true); return; }
            var outName = 'Alptuguide_' + state.platform + '_' + (runtime.seq.width || 1080) + 'x' + (runtime.seq.height || 1920) + '.png';
            var outPath = path.join(desk, outName);
            writePng(outPath, overlayPng('current', Math.max(runtime.seq.width || 1080, runtime.seq.height || 1920)));
            toast('Masaüstüne kaydedildi: ' + outName);
        } catch (e) {
            toast('Dışa aktarılamadı: ' + e.message, true);
        }
    }

    function cleanTimeline() {
        if (runtime.monitorOn) {
            runtime.monitorOn = false;
            updateMonitorButton();
        }
        callHost('cleanAllPreviewClips', [], function (res) {
            if (res && String(res).indexOf('OK:') === 0) toast('Temizlendi: ' + res.split(':')[1] + ' Alptuguide katmanı.');
            else toast('Temizlenecek kılavuz katmanı yok.', true);
        });
    }

    // ------------------------------------------------------------------ Event Bindings
    function bindEvents() {
        var platTabs = $('platform-tabs');
        if (platTabs) {
            platTabs.addEventListener('click', function (e) {
                var btn = e.target.closest('.seg-btn');
                if (!btn) return;
                state.platform = btn.getAttribute('data-platform');
                updatePlatformUI();
                scheduleRender();
            });
        }

        document.addEventListener('click', function (e) {
            var chip = e.target.closest('.chip[data-key]');
            if (!chip) return;
            var k = chip.getAttribute('data-key');
            state[k] = !state[k];
            chip.classList.toggle('on', state[k]);
            scheduleRender();
        });

        var opInput = $('input-opacity');
        if (opInput) {
            opInput.addEventListener('input', function () {
                var v = Number(this.value) || 100;
                state.overlayOpacity = Math.max(0.2, Math.min(1, v / 100));
                var opVal = $('opacity-val');
                if (opVal) opVal.textContent = v + '%';
                scheduleRender();
            });
        }

        var monBtn = $('btn-monitor');
        if (monBtn) {
            monBtn.addEventListener('click', function () { setMonitor(!runtime.monitorOn); });
        }

        var seqChip = $('seq-chip');
        if (seqChip) {
            seqChip.addEventListener('click', function () { refreshSequence(true); });
        }

        var refBtn = $('btn-reframe');
        if (refBtn) {
            refBtn.addEventListener('click', function () {
                callHost('autoReframeSequence', [], function (res) {
                    if (res === 'OK') { toast('9:16 Dikey kopya sekans oluşturuldu.'); refreshSequence(false); }
                    else toast(res || 'Reframe yapılamadı.', true);
                });
            });
        }

        var markBtn = $('btn-markers');
        if (markBtn) {
            markBtn.addEventListener('click', function () {
                var limits = { reels: 90, tiktok: 180, shorts: 60, all: 60 };
                callHost('addPlatformMarkers', [limits[state.platform] || 180, PLATFORM[state.platform].name], function (res) {
                    if (res === 'OK') toast('3sn HOOK ve süre limiti marker\'ları eklendi.');
                    else toast(res || 'Marker eklenemedi.', true);
                });
            });
        }

        var insGuideBtn = $('btn-insert-guides');
        if (insGuideBtn) insGuideBtn.addEventListener('click', insertPermanentGuide);

        var insOvlBtn = $('btn-insert-overlay');
        if (insOvlBtn) insOvlBtn.addEventListener('click', insertPermanentOverlay);

        var expPngBtn = $('btn-export-png');
        if (expPngBtn) expPngBtn.addEventListener('click', exportTransparentPng);

        var cleanBtn = $('btn-clean-timeline');
        if (cleanBtn) cleanBtn.addEventListener('click', cleanTimeline);

        window.addEventListener('focus', function () {
            refreshSequence(false);
        });

        if (csInterface) {
            try {
                csInterface.addEventListener('com.adobe.csxs.events.SequenceChanged', function () { refreshSequence(false); });
                csInterface.addEventListener('com.adobe.csxs.events.ActiveSequenceChanged', function () { refreshSequence(false); });
            } catch (e) {}
        }
    }

    // ------------------------------------------------------------------ Init
    function init() {
        loadPersisted();
        syncInputs();
        updateMonitorButton();
        updateToolAvailability();
        bindEvents();
        refreshSequence(false);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

/**
 * Alptuguide™ v3.3 — Professional NLE Studio Controller
 * Copyright (c) 2026 Alptuğ Dağ (@alptugdag). All rights reserved.
 *
 * Fully integrated directly into:
 *  - Adobe Premiere Pro (Program Monitor Native Guides + Mek Live Bridge)
 *  - Adobe After Effects (Comp Viewer Guide Layer)
 *  - DaVinci Resolve (Timeline Viewer & Native Liquid Glass Overlay)
 *  - Standalone / Web Studio Live Simulation Engine
 */
(function () {
    'use strict';

    // ------------------------------------------------------------------ Environment / Bridges
    var root = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
    var csInterface = (typeof CSInterface !== 'undefined' && root && (root.__adobe_cep__ || root.cep)) ? new CSInterface() : null;
    var nodeRequire = (typeof require === 'function') ? require
        : (root && root.cep_node && typeof root.cep_node.require === 'function') ? root.cep_node.require : null;
    var fs = null, path = null, os = null, net = null;
    try {
        if (nodeRequire) {
            fs = nodeRequire('fs');
            path = nodeRequire('path');
            os = nodeRequire('os');
            net = nodeRequire('net');
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

    var $ = function (id) { return document.getElementById(id); };
    var SHARE_DIR = (os && path) ? path.join(os.homedir(), 'Library', 'Application Support', 'Alptuguide') : null;

    // ------------------------------------------------------------------ State & Runtime
    var DEFAULT_CAPTION = 'Bu eklenti @alptugdag tarafından yapılmıştır, destek için takip edebilirsin, kolay gelsin!';
    var state = {
        platform: 'reels',
        username: 'alptugdag',
        isVerified: true,
        showFollow: true,
        caption: DEFAULT_CAPTION,
        audioName: 'alptugdag · Orijinal Ses',
        likesCount: '12.4K',
        commentsCount: '348',
        savesCount: '8.1K',
        sharesCount: '1.2K',
        avatarDataUrl: 'assets/sample_avatar.png',
        showSafeZones: false,
        showMockUi: true,
        showSubtitleZone: false,
        thirds: false,
        center: false,
        feed45: false,
        grid34: false,
        feed11: false,
        broadcast: false,
        overlayOpacity: 1
    };
    var PERSIST_KEYS = Object.keys(state);

    var runtime = {
        host: resolveBridge ? 'RESOLVE' : (csInterface ? 'PPRO' : (hasNative() ? 'RESOLVE' : 'WEB')),
        seq: { ok: true, width: 1080, height: 1920, fps: 60, duration: 15, name: 'Studio 9:16 Sekans' },
        avatarImage: null,
        monitorOn: false,
        rev: Date.now() % 100000,
        simPlaying: false,
        simTime: 0,
        simDuration: 15,
        simLastTs: 0,
        simRafId: 0,
        usingVideoFile: false,
        activeClipLabel: 'cinematic_still.png',
        webLayerCount: 0,
        hookAnim: {
            active: false,
            style: 'punch_zoom',
            title: '',
            startTime: 0,
            duration: 3.0
        }
    };

    var PLATFORM = {
        reels:  { name: 'Instagram Reels', follow: 'Takip Et', like: 'Beğeni', share: 'Paylaş', saves: true, limit: 180 },
        tiktok: { name: 'TikTok',          follow: 'Takip Et', like: 'Beğen',  share: 'Paylaş', saves: true, limit: 600 },
        shorts: { name: 'YouTube Shorts',  follow: 'Abone Ol', like: 'Beğen',  share: 'Paylaş', saves: false, limit: 180 },
        all:    { name: 'Ortak Güvenli',   follow: 'Takip Et', like: 'Beğen',  share: 'Paylaş', saves: true, limit: 180 }
    };

    var HOOK_STYLE_LABELS = {
        punch_zoom: 'Smooth Punch Zoom ve Sarsıntı',
        hormozi_title: 'Hormozi Pop Başlık ve Kanca',
        strobe_flash: 'Flaş Patlaması ve Hızlı İtiş',
        glitch_shock: 'Glitch ve Kinetik Darbe',
        jump_snap: 'Ritmik Sıçrama (Jump-Snap)',
        ai_smart: 'Otonom Kanca Seçimi'
    };

    var STORAGE_KEY = 'alptuguide_v3_state';
    var PRESETS_KEY = 'alptuguide_presets';
    var PRESET_FIELDS = ['username', 'isVerified', 'showFollow', 'caption', 'audioName', 'likesCount', 'commentsCount', 'savesCount', 'sharesCount', 'avatarDataUrl'];

    // ------------------------------------------------------------------ Web / Standalone Studio Host Fallback
    function webHostFallback(cmd, args) {
        if (cmd === 'getSequenceDetails') {
            return JSON.stringify({
                ok: true,
                host: 'WEB',
                name: runtime.seq.name || 'Studio 9:16 Sekans',
                width: runtime.seq.width || 1080,
                height: runtime.seq.height || 1920,
                fps: runtime.seq.fps || 60,
                duration: runtime.simDuration || 15
            });
        }
        if (cmd === 'getActiveFootageInfo') {
            return JSON.stringify({
                ok: true,
                mediaPath: '',
                previewAsset: 'assets/cinematic_still.png',
                playerPos: runtime.simTime || 0,
                sourceTime: runtime.simTime || 0,
                clipName: runtime.activeClipLabel || 'cinematic_still.png',
                width: runtime.seq.width || 1080,
                height: runtime.seq.height || 1920,
                duration: runtime.simDuration || 15,
                seqName: runtime.seq.name || 'Studio 9:16 Sekans'
            });
        }
        if (cmd === 'applyViralRetentionHook') {
            var opt = (args && args[0]) || {};
            var st = opt.style || 'punch_zoom';
            var lbl = HOOK_STYLE_LABELS[st] || st;
            return JSON.stringify({
                ok: true,
                sequence: runtime.seq.name || 'Studio 9:16 Sekans',
                style: st,
                style_label: lbl,
                motion_applied: true,
                hook_duration: 3.0,
                hook_title: opt.title || (st === 'hormozi_title' ? 'DİKKATLE İZLEYİN!' : 'BUNU BİLMİYORDUNUZ!'),
                message: 'İlk 3 saniyeye (00:00 - 03:00) ' + lbl + ' uygulandı.'
            });
        }
        if (cmd === 'autoReframeSequence' || cmd === 'createVerticalVersion') {
            runtime.seq.width = 1080;
            runtime.seq.height = 1920;
            runtime.seq.name = 'Studio Sekans · 9x16';
            return 'OK:' + runtime.seq.name;
        }
        if (cmd === 'addPlatformMarkers') {
            var lim = Number(args && args[0]) || 180;
            var count = (runtime.simDuration > lim) ? 2 : 1;
            return 'OK:' + count;
        }
        if (cmd === 'insertClipPermanent') {
            runtime.webLayerCount++;
            return 'OK';
        }
        if (cmd === 'cleanAllPreviewClips') {
            var removed = runtime.webLayerCount;
            runtime.webLayerCount = 0;
            return 'OK:' + removed;
        }
        if (cmd === 'setMonitorGuide' || cmd === 'setPremiereNativeGuides') {
            return 'OK';
        }
        return 'OK';
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
        if (hasNative()) {
            sendNative({ action: 'hostCommand', cmd: cmd, args: args }, cb);
            return;
        }
        var fallbackRes = webHostFallback(cmd, args);
        if (cb) setTimeout(function () { cb(fallbackRes); }, 0);
    }

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

    // ------------------------------------------------------------------ File / PNG Helpers
    var _offscreenCanvas = null;

    function ensureShareDir() {
        if (!fs || !SHARE_DIR) return false;
        try {
            if (!fs.existsSync(SHARE_DIR)) {
                fs.mkdirSync(SHARE_DIR, { recursive: true });
            }
            return true;
        } catch (e) {
            return false;
        }
    }

    function overlayPng(mode, maxEdge) {
        if (!_offscreenCanvas) {
            _offscreenCanvas = document.createElement('canvas');
        }
        var sz = outputSize(maxEdge || 1920);
        compose(_offscreenCanvas, sz.w, sz.h, mode || 'current');
        return _offscreenCanvas.toDataURL('image/png');
    }

    function dataUrlToBase64(dataUrl) {
        if (!dataUrl) return '';
        var idx = dataUrl.indexOf(',');
        return idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl;
    }

    function writePng(filePath, dataUrl) {
        if (!fs || !filePath || !dataUrl) return false;
        var b64 = dataUrlToBase64(dataUrl);
        var buf = Buffer.from(b64, 'base64');
        fs.writeFileSync(filePath, buf);
        return true;
    }

    function downloadDataUrl(filename, dataUrl) {
        var a = document.createElement('a');
        a.href = dataUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    // ------------------------------------------------------------------ Presets
    function getPresets() {
        try { return JSON.parse(localStorage.getItem(PRESETS_KEY) || '{}'); }
        catch (e) { return {}; }
    }
    function setPresets(p) {
        try { localStorage.setItem(PRESETS_KEY, JSON.stringify(p)); }
        catch (e) {}
    }

    function renderPresets(selected) {
        var sel = $('preset-selector');
        if (!sel) return;
        sel.innerHTML = '';
        var def = document.createElement('option');
        def.value = '__default__';
        def.textContent = 'Varsayılan (@alptugdag)';
        sel.appendChild(def);
        Object.keys(getPresets()).forEach(function (k) {
            var o = document.createElement('option');
            o.value = k;
            o.textContent = '@' + k;
            sel.appendChild(o);
        });
        if (selected) sel.value = selected;
    }

    function loadAvatar(src) {
        if (!src) return;
        var img = new Image();
        img.onload = function () {
            runtime.avatarImage = img;
            var prev = $('avatar-img-preview');
            if (prev) prev.src = src;
            scheduleRender(false);
        };
        img.src = src;
    }

    // ------------------------------------------------------------------ Offscreen & Live Canvas Renderer
    function renderState(w, h) {
        return {
            platform: state.platform,
            username: state.username,
            isVerified: Boolean(state.isVerified),
            showFollow: Boolean(state.showFollow),
            caption: state.caption,
            audioName: state.audioName,
            likesCount: state.likesCount,
            commentsCount: state.commentsCount,
            savesCount: state.savesCount,
            sharesCount: state.sharesCount,
            showSafeZones: Boolean(state.showSafeZones),
            showSubtitleZone: Boolean(state.showSubtitleZone),
            showMockUi: Boolean(state.showMockUi),
            overlayOpacity: state.overlayOpacity,
            avatarImage: runtime.avatarImage,
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
                AlptuguideSafeZones.draw(ctx, state.platform, w, h, {
                    opacity: state.overlayOpacity,
                    showLabels: true,
                    showSafeZones: true,
                    showUiBoxes: true
                });
            }
        } else {
            if (window.ReelsRenderer) {
                ReelsRenderer.render(canvas, renderState(w, h));
            }
        }

        if (window.AlptuguideCompGuides) {
            AlptuguideCompGuides.draw(ctx, w, h, {
                opacity: state.overlayOpacity,
                thirds: Boolean(state.thirds),
                center: Boolean(state.center),
                broadcast: Boolean(state.broadcast),
                feed45: Boolean(state.feed45),
                grid34: Boolean(state.grid34),
                square: Boolean(state.feed11)
            });
        }
    }

    function outputSize(maxEdge) {
        var sw = runtime.seq.width || 1080, sh = runtime.seq.height || 1920;
        var k = (maxEdge || 1920) / Math.max(sw, sh);
        return { w: Math.max(2, Math.round(sw * k)), h: Math.max(2, Math.round(sh * k)) };
    }

    function renderMockup() {
        var canvas = $('mockup-canvas');
        if (!canvas) return;
        var w = runtime.seq.width || 1080;
        var h = runtime.seq.height || 1920;
        compose(canvas, w, h, 'current');
    }

    // Coalesce renders via requestAnimationFrame for 60fps zero-jank UI updates
    var renderRafId = 0;
    function scheduleRender(changed) {
        if (!renderRafId) {
            if (typeof requestAnimationFrame === 'function') {
                renderRafId = requestAnimationFrame(function () {
                    renderRafId = 0;
                    renderMockup();
                });
            } else {
                renderMockup();
            }
        }
        if (changed !== false) {
            schedulePersist();
            scheduleMonitorSync();
        }
    }

    // ------------------------------------------------------------------ Host Monitor Guide Sync
    var monitorSyncTimer = 0;
    function updateMonitorButton() {
        var btn = $('btn-monitor-toggle');
        var txt = $('monitor-toggle-text');
        var badge = $('host-badge');
        if (badge) {
            badge.textContent = runtime.host === 'PPRO' ? 'PREMIERE'
                : runtime.host === 'AEFT' ? 'AFTER EFFECTS'
                : runtime.host === 'RESOLVE' ? 'RESOLVE' : 'STUDIO';
        }
        if (!btn || !txt) return;
        btn.classList.toggle('on', Boolean(runtime.monitorOn));
        txt.textContent = runtime.monitorOn ? 'Monitör Kılavuzu: Açık' : 'Monitör Kılavuzu: Kapalı';
    }

    function scheduleMonitorSync() {
        if (!runtime.monitorOn && !hasNative()) return;
        clearTimeout(monitorSyncTimer);
        monitorSyncTimer = setTimeout(function () {
            syncHostMonitor(false);
        }, 180);
    }

    function syncHostMonitor(notify) {
        runtime.rev = (runtime.rev + 1) % 1000000;
        if (window.AlptuguideMercuryStream && typeof AlptuguideMercuryStream.publishOverlayState === 'function') {
            AlptuguideMercuryStream.publishOverlayState({
                visible: Boolean(runtime.monitorOn),
                host: runtime.host,
                platform: state.platform,
                showSafeZones: Boolean(state.showSafeZones),
                showMockUi: Boolean(state.showMockUi),
                feed45: Boolean(state.feed45),
                grid34: Boolean(state.grid34),
                thirds: Boolean(state.thirds),
                center: Boolean(state.center),
                broadcast: Boolean(state.broadcast),
                opacity: Number(state.overlayOpacity) || 1,
                aspect: (runtime.seq.width && runtime.seq.height) ? (runtime.seq.width / runtime.seq.height) : (9 / 16)
            });
        }
        if (hasNative()) {
            var b64 = dataUrlToBase64(overlayPng('current', 1920));
            sendNative({
                action: 'publishOverlay',
                pngBase64: b64,
                state: {
                    visible: runtime.monitorOn,
                    host: runtime.host,
                    platform: state.platform,
                    rev: runtime.rev
                }
            }, function () {
                if (notify) toast(runtime.monitorOn ? 'Yüzen monitör kılavuzu aktif.' : 'Yüzen monitör kılavuzu gizlendi.');
            });
            return;
        }

        if (csInterface) {
            if (runtime.host === 'AEFT') {
                if (ensureShareDir()) {
                    var p = path.join(SHARE_DIR, 'Alptuguide_CompGuide.png');
                    if (runtime.monitorOn) writePng(p, overlayPng('current', Math.max(runtime.seq.width || 1080, runtime.seq.height || 1920)));
                    callHost('setCompGuide', [p, runtime.monitorOn], function (res) {
                        if (notify) {
                            if (res === 'OK') toast(runtime.monitorOn ? 'After Effects Guide Layer aktif (render dışı).' : 'Guide Layer kaldırıldı.');
                            else toast(res || 'Guide Layer güncellenemedi.', true);
                        }
                    });
                }
            } else {
                var cfgJson = JSON.stringify({
                    showSafeZones: state.showSafeZones,
                    feed45: state.feed45,
                    thirds: state.thirds,
                    center: state.center
                });
                callHost('setPremiereNativeGuides', [runtime.monitorOn, cfgJson], function (res) {
                    if (notify) {
                        if (String(res).indexOf('OK') === 0) toast(runtime.monitorOn ? 'Premiere Program Monitör kılavuzları aktif.' : 'Program Monitör kılavuzları kapatıldı.');
                        else toast(res || 'Kılavuz güncellenemedi.', true);
                    }
                });
            }
            return;
        }

        if (notify) {
            if (runtime.monitorOn && !state.showSafeZones) {
                state.showSafeZones = true;
                syncChips();
                scheduleRender(false);
            }
            toast(runtime.monitorOn ? 'Canlı Monitör Kılavuzu aktif.' : 'Canlı Monitör Kılavuzu kapatıldı.');
        }
    }

    function toggleMonitorGuide() {
        runtime.monitorOn = !runtime.monitorOn;
        if (runtime.monitorOn && !state.showSafeZones && runtime.host === 'WEB') {
            state.showSafeZones = true;
            syncChips();
            scheduleRender(false);
        }
        updateMonitorButton();
        syncHostMonitor(true);
    }

    // ------------------------------------------------------------------ Persistence
    var persistTimer = 0;
    function schedulePersist() {
        clearTimeout(persistTimer);
        persistTimer = setTimeout(function () {
            var out = {};
            PERSIST_KEYS.forEach(function (k) { out[k] = state[k]; });
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(out)); } catch (e) {}
        }, 250);
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

    // ------------------------------------------------------------------ Live Smartphone Mockup & 60fps Viral Hook Engine
    function computeViralHookTransform(style, tSec) {
        // Matches the exact keyframes in jsx/hostscript.jsx for the first 3.0 seconds
        var scale = 1.0, tx = 0, ty = 0, flashOpacity = 0, showBadge = false;
        if (tSec < 0 || tSec > 3.0) {
            return { scale: 1.0, tx: 0, ty: 0, flashOpacity: 0, showBadge: false };
        }

        if (style === 'jump_snap') {
            scale = tSec < 1.0 ? 1.04 : (tSec < 2.0 ? 1.11 : 1.18);
            var jumpPhase = tSec % 1.0;
            if (jumpPhase < 0.12) {
                var decay = 1 - (jumpPhase / 0.12);
                tx = Math.sin(jumpPhase * 90) * 6 * decay;
                ty = Math.cos(jumpPhase * 90) * -4 * decay;
            }
            showBadge = tSec < 2.2;
        } else if (style === 'strobe_flash') {
            var pFlash = Math.min(1, tSec / 2.5);
            scale = 1.14 + 0.06 * pFlash;
            if (tSec < 0.28) {
                flashOpacity = Math.abs(Math.sin(tSec * 45)) * (1 - tSec / 0.28) * 0.78;
            }
            if (tSec < 0.45) {
                var d2 = 1 - (tSec / 0.45);
                tx = Math.sin(tSec * 65) * 8 * d2;
                ty = Math.cos(tSec * 55) * -6 * d2;
            }
            showBadge = tSec < 2.4;
        } else if (style === 'glitch_shock') {
            scale = tSec < 0.4 ? (1.05 + (tSec / 0.4) * 0.11) : (1.16 + Math.min(1, (tSec - 0.4) / 2.0) * 0.04);
            if (tSec < 0.48) {
                var dg = 1 - (tSec / 0.48);
                tx = Math.sin(tSec * 120) * 14 * dg;
                ty = Math.cos(tSec * 95) * -9 * dg;
                flashOpacity = (Math.sin(tSec * 80) > 0.6) ? 0.35 * dg : 0;
            }
            showBadge = tSec < 2.5;
        } else {
            // punch_zoom, hormozi_title, ai_smart
            var ease = 1 - Math.pow(1 - Math.min(1, tSec / 2.4), 3);
            scale = 1.0 + 0.20 * ease;
            if (tSec < 0.5) {
                var dp = 1 - (tSec / 0.5);
                tx = Math.sin(tSec * 55) * 9 * dp;
                ty = Math.cos(tSec * 48) * -6 * dp;
            }
            showBadge = Boolean(runtime.hookAnim.title) && tSec < 2.6;
        }

        return {
            scale: scale,
            tx: tx,
            ty: ty,
            flashOpacity: flashOpacity,
            showBadge: showBadge
        };
    }

    function applyMediaStageVisuals(curTime) {
        var stage = $('phone-media-stage');
        var flashEl = $('hook-flash-overlay');
        var titleOverlay = $('hook-title-overlay');
        var titleBadge = $('hook-title-badge');
        if (!stage) return;

        var scale = 1.0, tx = 0, ty = 0, flashOpacity = 0, showBadge = false;

        if (runtime.hookAnim.active && curTime <= 3.0) {
            var h = computeViralHookTransform(runtime.hookAnim.style, curTime);
            scale = h.scale;
            tx = h.tx;
            ty = h.ty;
            flashOpacity = h.flashOpacity;
            showBadge = h.showBadge;
        } else if (!runtime.usingVideoFile && runtime.simPlaying) {
            // Subtle breathing handheld camera motion when playing still preview
            scale = 1.03 + Math.sin(curTime * 1.1) * 0.025;
            tx = Math.sin(curTime * 0.85) * 2.5;
            ty = Math.cos(curTime * 0.7) * 2.0;
        }

        stage.style.transform = 'translate3d(' + tx.toFixed(2) + 'px, ' + ty.toFixed(2) + 'px, 0) scale(' + scale.toFixed(4) + ')';
        if (flashEl) {
            flashEl.style.opacity = flashOpacity > 0.01 ? flashOpacity.toFixed(2) : '0';
        }
        if (titleOverlay) {
            if (showBadge && runtime.hookAnim.title) {
                if (titleBadge && titleBadge.textContent !== runtime.hookAnim.title) {
                    titleBadge.textContent = runtime.hookAnim.title;
                }
                titleOverlay.classList.add('visible');
            } else {
                titleOverlay.classList.remove('visible');
            }
        }
    }

    function updatePlaybackUI(isPlaying) {
        var btn = $('btn-play-pause');
        var ico = $('play-pause-icon');
        var txt = $('play-pause-text');
        var dot = $('mockup-live-dot');
        if (btn) btn.classList.toggle('active', Boolean(isPlaying));
        if (dot) dot.classList.toggle('playing', Boolean(isPlaying));
        if (txt) txt.textContent = isPlaying ? 'Duraklat' : 'Oynat';
        if (ico) {
            var use = ico.querySelector('use');
            if (use) use.setAttribute('href', isPlaying ? '#i-pause' : '#i-play');
        }
    }

    function simulationTick(now) {
        if (!runtime.simPlaying) {
            runtime.simRafId = 0;
            return;
        }
        if (!runtime.simLastTs) runtime.simLastTs = now;
        var dt = Math.min(0.1, Math.max(0, (now - runtime.simLastTs) / 1000));
        runtime.simLastTs = now;

        if (runtime.usingVideoFile) {
            var video = $('mockup-video');
            if (video && !video.paused) {
                runtime.simTime = video.currentTime || 0;
                runtime.simDuration = video.duration || runtime.seq.duration || 15;
            }
        } else {
            var dur = runtime.simDuration || 15;
            runtime.simTime = (runtime.simTime + dt) % dur;
        }

        if (runtime.hookAnim.active && runtime.simTime > 3.05) {
            runtime.hookAnim.active = false;
        }

        applyMediaStageVisuals(runtime.simTime);
        updateTimecodeDisplay(runtime.simTime, runtime.simDuration);
        runtime.simRafId = requestAnimationFrame(simulationTick);
    }

    function startPlayback() {
        var video = $('mockup-video');
        runtime.simPlaying = true;
        runtime.simLastTs = performance.now();
        updatePlaybackUI(true);
        if (runtime.usingVideoFile && video) {
            video.play().catch(function () {});
        }
        if (!runtime.simRafId) {
            runtime.simRafId = requestAnimationFrame(simulationTick);
        }
    }

    function pausePlayback() {
        var video = $('mockup-video');
        runtime.simPlaying = false;
        runtime.simLastTs = 0;
        if (runtime.simRafId) {
            cancelAnimationFrame(runtime.simRafId);
            runtime.simRafId = 0;
        }
        if (runtime.usingVideoFile && video && !video.paused) {
            video.pause();
        }
        updatePlaybackUI(false);
        applyMediaStageVisuals(runtime.simTime);
    }

    function togglePlayback() {
        if (runtime.simPlaying) {
            pausePlayback();
        } else {
            startPlayback();
        }
    }

    function triggerViralHookPreview(style, customTitle) {
        var resolvedTitle = customTitle || (style === 'hormozi_title' ? 'DİKKATLE İZLEYİN!' : (style === 'ai_smart' ? 'BU DETAYA DİKKAT!' : ''));
        runtime.hookAnim = {
            active: true,
            style: style || 'punch_zoom',
            title: resolvedTitle,
            startTime: performance.now(),
            duration: 3.0
        };
        runtime.simTime = 0;
        var video = $('mockup-video');
        if (runtime.usingVideoFile && video) {
            try { video.currentTime = 0; } catch (e) {}
        }
        startPlayback();
    }

    function loadLocalMediaFile(file) {
        if (!file) return;
        var video = $('mockup-video');
        var previewImg = $('mockup-preview-img');
        var placeholder = $('mockup-placeholder');
        var fileLabel = $('mockup-file-label');
        var url = URL.createObjectURL(file);
        runtime.activeClipLabel = file.name;

        if (file.type && file.type.indexOf('video/') === 0) {
            runtime.usingVideoFile = true;
            if (previewImg) previewImg.style.display = 'none';
            if (placeholder) placeholder.hidden = true;
            if (video) {
                video.style.display = 'block';
                video.src = url;
                video.onloadedmetadata = function () {
                    runtime.simDuration = Math.max(1, video.duration || 15);
                    runtime.simTime = 0;
                    var scrub = $('mockup-scrubber');
                    if (scrub) scrub.max = String(runtime.simDuration);
                    updateTimecodeDisplay(0, runtime.simDuration);
                    startPlayback();
                };
                video.load();
            }
            if (fileLabel) fileLabel.textContent = file.name + ' · GPU Video';
            toast('Video yüklendi: ' + file.name);
        } else if (file.type && file.type.indexOf('image/') === 0) {
            runtime.usingVideoFile = false;
            if (video) {
                video.pause();
                video.style.display = 'none';
            }
            if (placeholder) placeholder.hidden = true;
            if (previewImg) {
                previewImg.style.display = 'block';
                previewImg.src = url;
            }
            runtime.simTime = 0;
            updateTimecodeDisplay(0, runtime.simDuration);
            if (fileLabel) fileLabel.textContent = file.name + ' · Canlı Kare';
            toast('Görsel yüklendi: ' + file.name);
        }
    }

    function syncMockupFootage(notify) {
        callHost('getActiveFootageInfo', [], function (res) {
            var d = null;
            try { d = typeof res === 'string' ? JSON.parse(res) : res; } catch (e) {}
            if (!d || !d.ok) {
                if (notify) toast('Sekans veya aktif medya bulunamadı.', true);
                return;
            }

            var video = $('mockup-video');
            var previewImg = $('mockup-preview-img');
            var placeholder = $('mockup-placeholder');
            var fileLabel = $('mockup-file-label');

            if (d.mediaPath) {
                var fileUrl = d.mediaPath.indexOf('file://') === 0
                    ? d.mediaPath
                    : 'file://' + encodeURI(d.mediaPath).replace(/#/g, '%23');
                runtime.usingVideoFile = true;
                if (video) {
                    if (video.getAttribute('data-raw-src') !== d.mediaPath) {
                        video.setAttribute('data-raw-src', d.mediaPath);
                        video.src = fileUrl;
                        video.load();
                    }
                    if (typeof d.sourceTime === 'number' && !isNaN(d.sourceTime)) {
                        try { video.currentTime = d.sourceTime; } catch (tErr) {}
                    }
                    video.style.display = 'block';
                }
                if (previewImg) previewImg.style.display = 'none';
                if (placeholder) placeholder.hidden = true;
                var clipLabel = d.mediaPath.split('/').pop() || d.clipName || 'Klip';
                runtime.activeClipLabel = clipLabel;
                runtime.simTime = d.playerPos || 0;
                runtime.simDuration = d.duration || (video && video.duration) || 15;
                if (fileLabel) fileLabel.textContent = clipLabel + ' · GPU Hazır';
                updateTimecodeDisplay(runtime.simTime, runtime.simDuration);
                if (notify) toast('Timeline ile eşitlendi: ' + clipLabel + ' @ ' + fmtDur(runtime.simTime));
            } else {
                if (!runtime.usingVideoFile && previewImg) {
                    previewImg.style.display = 'block';
                }
                if (placeholder) placeholder.hidden = true;
                runtime.simDuration = d.duration || runtime.simDuration || 15;
                if (fileLabel) fileLabel.textContent = (d.clipName || d.seqName || 'cinematic_still.png') + ' · GPU Hazır';
                updateTimecodeDisplay(runtime.simTime, runtime.simDuration);
                if (notify) toast('Timeline eşitlendi: ' + (d.seqName || 'Studio 9:16 Sekans'));
            }
            scheduleRender(false);
        });
    }

    function updateTimecodeDisplay(cur, total) {
        var tc = $('mockup-timecode');
        var scrub = $('mockup-scrubber');
        var safeTotal = Math.max(1, total || 15);
        var safeCur = Math.max(0, Math.min(safeTotal, cur || 0));
        if (tc) {
            tc.textContent = fmtDur(safeCur) + ' / ' + fmtDur(safeTotal);
        }
        if (scrub) {
            if (Number(scrub.max) !== safeTotal) scrub.max = String(safeTotal);
            scrub.value = String(safeCur.toFixed(2));
        }
    }

    // ------------------------------------------------------------------ Sequence Info
    function fmtDur(sec) {
        sec = Math.max(0, Math.floor(sec || 0));
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
        var s = runtime.seq;
        var meta = PLATFORM[state.platform] || PLATFORM.reels;
        var overLimit = s.duration > 0 && meta.limit && s.duration > meta.limit;
        dot.className = overLimit ? 'seq-dot warn' : 'seq-dot ok';
        var r = (s.width && s.height) ? (s.width + '×' + s.height) : '';
        var f = s.fps ? (Math.round(s.fps) + ' fps') : '';
        var d = s.duration ? fmtDur(s.duration) : '';
        var aspect = s.height ? (s.width / s.height) : (9 / 16);
        var aspName = Math.abs(aspect - (9 / 16)) < 0.02 ? '9:16'
            : Math.abs(aspect - (16 / 9)) < 0.02 ? '16:9'
            : Math.abs(aspect - 1.0) < 0.02 ? '1:1' : '';
        txt.textContent = [r, f, aspName, d].filter(Boolean).join(' · ');
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
            fps: Number(d.fps) || 60,
            duration: Number(d.duration) || 15,
            name: d.name || 'Studio 9:16 Sekans',
            message: d.message || ''
        };
        if (runtime.seq.duration > 0 && !runtime.usingVideoFile) {
            runtime.simDuration = runtime.seq.duration;
        }
        updateSeqChip();
        var sizeChanged = prev.width !== runtime.seq.width || prev.height !== runtime.seq.height;
        if (sizeChanged) scheduleRender(false);
        syncMockupFootage(false);
    }

    function refreshSequence(notify) {
        callHost('getSequenceDetails', [], function (res) {
            applySequence(res);
            if (notify) {
                toast(
                    runtime.seq.ok
                        ? 'Sekans algılandı: ' + runtime.seq.width + '×' + runtime.seq.height + ' (' + (runtime.seq.name || 'Aktif') + ')'
                        : 'Açık sekans bulunamadı.',
                    !runtime.seq.ok
                );
            }
        });
    }

    function updatePlatformUI() {
        var meta = PLATFORM[state.platform];
        var tabs = document.querySelectorAll('.seg-btn');
        for (var i = 0; i < tabs.length; i++) {
            var isAct = tabs[i].getAttribute('data-platform') === state.platform;
            tabs[i].classList.toggle('active', isAct);
            tabs[i].setAttribute('aria-selected', isAct ? 'true' : 'false');
        }
        var fChip = $('chip-follow');
        if (fChip && meta) fChip.textContent = meta.follow;
        var lText = $('metric-like-text');
        if (lText && meta) lText.textContent = meta.like;
        var sText = $('metric-share-text');
        if (sText && meta) sText.textContent = meta.share;
        var bSaves = $('metric-box-saves');
        if (bSaves && meta) bSaves.style.display = meta.saves ? '' : 'none';
        updateSeqChip();
    }

    function syncChips() {
        var chips = document.querySelectorAll('.chip[data-key]');
        for (var i = 0; i < chips.length; i++) {
            var k = chips[i].getAttribute('data-key');
            chips[i].classList.toggle('on', Boolean(state[k]));
        }
    }

    function syncInputs() {
        if ($('input-username')) $('input-username').value = state.username;
        if ($('input-caption')) $('input-caption').value = state.caption;
        if ($('input-audio')) $('input-audio').value = state.audioName;
        if ($('input-likes')) $('input-likes').value = state.likesCount;
        if ($('input-comments')) $('input-comments').value = state.commentsCount;
        if ($('input-saves')) $('input-saves').value = state.savesCount;
        if ($('input-shares')) $('input-shares').value = state.sharesCount;
        var pct = Math.round(state.overlayOpacity * 100);
        var opInput = $('input-opacity');
        if (opInput) opInput.value = String(pct);
        var opVal = $('opacity-val');
        if (opVal) opVal.textContent = pct + '%';
        syncChips();
        loadAvatar(state.avatarDataUrl || 'assets/sample_avatar.png');
        renderPresets();
        updatePlatformUI();
        updateMonitorButton();
    }

    function updateToolAvailability() {
        var refBtn = $('btn-reframe');
        if (refBtn) refBtn.disabled = false;
    }

    // ------------------------------------------------------------------ Pro Tools
    function insertPermanentGuide() {
        var fileName = 'Alptuguide_Guides_' + state.platform.toUpperCase() + '_' + Date.now() + '.png';
        var dataUrl = overlayPng('guides_only', Math.max(runtime.seq.width || 1080, runtime.seq.height || 1920));

        if (hasNative()) {
            sendNative({
                action: 'insertLayer',
                fileName: fileName,
                displayName: '[Alptuguide Kılavuz]',
                pngBase64: dataUrlToBase64(dataUrl),
                isLivePreview: false
            }, function (res) {
                if (String(res).indexOf('OK') === 0) toast('Kılavuz klibi timeline\'a yerleştirildi.');
                else toast(res || 'Eklenemedi.', true);
            });
            return;
        }

        if (ensureShareDir()) {
            var p = path.join(SHARE_DIR, fileName);
            writePng(p, dataUrl);
            callHost('insertClipPermanent', [p, '[Alptuguide Kılavuz]'], function (res) {
                if (String(res).indexOf('OK') === 0) toast('Kılavuz klibi timeline\'a yerleştirildi.');
                else toast(res || 'Eklenemedi.', true);
            });
            return;
        }

        // Web Studio mode
        callHost('insertClipPermanent', [fileName, '[Alptuguide Kılavuz]'], function (res) {
            if (!state.showSafeZones) {
                state.showSafeZones = true;
                syncChips();
                scheduleRender();
            }
            if (String(res).indexOf('OK') === 0) toast('Kılavuz katmanı aktif önizlemeye eklendi.');
            else toast(res || 'Eklenemedi.', true);
        });
    }

    function insertPermanentOverlay() {
        var fileName = 'Alptuguide_Overlay_' + state.platform.toUpperCase() + '_' + Date.now() + '.png';
        var dataUrl = overlayPng('current', Math.max(runtime.seq.width || 1080, runtime.seq.height || 1920));

        if (hasNative()) {
            sendNative({
                action: 'insertLayer',
                fileName: fileName,
                displayName: '[Alptuguide Arayüz]',
                pngBase64: dataUrlToBase64(dataUrl),
                isLivePreview: false
            }, function (res) {
                if (String(res).indexOf('OK') === 0) toast('Arayüz klibi timeline\'a yerleştirildi.');
                else toast(res || 'Eklenemedi.', true);
            });
            return;
        }

        if (ensureShareDir()) {
            var p = path.join(SHARE_DIR, fileName);
            writePng(p, dataUrl);
            callHost('insertClipPermanent', [p, '[Alptuguide Arayüz]'], function (res) {
                if (String(res).indexOf('OK') === 0) toast('Arayüz klibi timeline\'a yerleştirildi.');
                else toast(res || 'Eklenemedi.', true);
            });
            return;
        }

        callHost('insertClipPermanent', [fileName, '[Alptuguide Arayüz]'], function (res) {
            if (!state.showMockUi) {
                state.showMockUi = true;
                syncChips();
                scheduleRender();
            }
            if (String(res).indexOf('OK') === 0) toast('Sosyal arayüz katmanı timeline\'a yerleştirildi.');
            else toast(res || 'Eklenemedi.', true);
        });
    }

    function exportTransparentPng() {
        try {
            var outName = 'Alptuguide_' + state.platform + '_' + (runtime.seq.width || 1080) + 'x' + (runtime.seq.height || 1920) + '.png';
            var dataUrl = overlayPng('current', Math.max(runtime.seq.width || 1080, runtime.seq.height || 1920));

            if (hasNative()) {
                sendNative({
                    action: 'exportDesktop',
                    fileName: outName,
                    pngBase64: dataUrlToBase64(dataUrl)
                }, function (res) {
                    if (res === 'OK') toast('Masaüstüne kaydedildi: ' + outName);
                    else toast('Dışa aktarılamadı: ' + res, true);
                });
                return;
            }

            var desk = (os && path) ? path.join(os.homedir(), 'Desktop') : null;
            if (desk && fs && fs.existsSync(desk)) {
                var outPath = path.join(desk, outName);
                writePng(outPath, dataUrl);
                toast('Masaüstüne kaydedildi: ' + outName);
                return;
            }

            downloadDataUrl(outName, dataUrl);
            toast('Şeffaf kılavuz PNG indirildi: ' + outName);
        } catch (e) {
            toast('Dışa aktarılamadı: ' + e.message, true);
        }
    }

    function cleanTimeline() {
        if (runtime.monitorOn) {
            runtime.monitorOn = false;
            updateMonitorButton();
        }
        runtime.hookAnim.active = false;
        applyMediaStageVisuals(runtime.simTime);

        callHost('cleanAllPreviewClips', [], function (res) {
            if (res && String(res).indexOf('OK:') === 0) {
                var count = Number(res.split(':')[1]) || 0;
                toast(count > 0 ? ('Temizlendi: ' + count + ' Alptuguide katmanı.') : 'Tüm kılavuz ve önizleme katmanları temizlendi.');
            } else {
                toast('Temizlenecek kılavuz katmanı yok.');
            }
        });
    }

    // ------------------------------------------------------------------ Mek Live Gateway
    var mekClient = null;
    function connectToMekGateway() {
        if (!net) return;
        try {
            mekClient = net.createConnection({ port: 45732, host: '127.0.0.1' }, function () {
                var hello = JSON.stringify({ type: 'status_update', state: { host: 'PPRO', ready: true } }) + '\n';
                mekClient.write(hello);
            });

            var buf = '';
            mekClient.on('data', function (chunk) {
                buf += chunk.toString('utf8');
                while (buf.indexOf('\n') >= 0) {
                    var idx = buf.indexOf('\n');
                    var line = buf.slice(0, idx).trim();
                    buf = buf.slice(idx + 1);
                    if (!line) continue;
                    try {
                        var msg = JSON.parse(line);
                        if (msg.type === 'command') {
                            handleMekCommand(msg);
                        }
                    } catch (err) {}
                }
            });

            mekClient.on('error', function () {});
            mekClient.on('close', function () {
                setTimeout(connectToMekGateway, 4000);
            });
        } catch (e) {}
    }

    function handleMekCommand(msg) {
        if (msg.action === 'apply_viral_hook' || msg.action === 'viral_hook') {
            var p = msg.params || {};
            triggerViralHookPreview(p.style || 'punch_zoom', p.title || '');
            callHost('applyViralRetentionHook', [p], function (res) {
                var d = {};
                try { d = typeof res === 'string' ? JSON.parse(res) : res; } catch (e) {}
                toast(d.message || 'Viral hook uygulandı.');
                if (mekClient && !mekClient.destroyed) {
                    var rep = JSON.stringify({ type: 'response', req_id: msg.req_id, data: d }) + '\n';
                    mekClient.write(rep);
                }
            });
        } else if (msg.action === 'analyze_timeline') {
            callHost('getSequenceDetails', [], function (res) {
                var d = {};
                try { d = typeof res === 'string' ? JSON.parse(res) : res; } catch (e) {}
                if (mekClient && !mekClient.destroyed) {
                    var rep = JSON.stringify({ type: 'response', req_id: msg.req_id, data: d }) + '\n';
                    mekClient.write(rep);
                }
            });
        }
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
            chip.classList.toggle('on', Boolean(state[k]));
            scheduleRender();
        });

        var monBtn = $('btn-monitor-toggle');
        if (monBtn) {
            monBtn.addEventListener('click', toggleMonitorGuide);
        }

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

        var loadMediaBtn = $('btn-load-media');
        var mediaFileInput = $('media-file-input');
        if (loadMediaBtn && mediaFileInput) {
            loadMediaBtn.addEventListener('click', function () {
                mediaFileInput.click();
            });
            mediaFileInput.addEventListener('change', function () {
                var f = this.files && this.files[0];
                if (f) loadLocalMediaFile(f);
            });
        }

        var syncBtn = $('btn-sync-timeline');
        if (syncBtn) {
            syncBtn.addEventListener('click', function () { syncMockupFootage(true); });
        }

        var playPauseBtn = $('btn-play-pause');
        if (playPauseBtn) {
            playPauseBtn.addEventListener('click', togglePlayback);
        }

        var phoneScreen = $('phone-screen');
        if (phoneScreen) {
            phoneScreen.addEventListener('click', togglePlayback);
            phoneScreen.addEventListener('dragover', function (e) {
                e.preventDefault();
                phoneScreen.classList.add('drag-over');
            });
            phoneScreen.addEventListener('dragleave', function () {
                phoneScreen.classList.remove('drag-over');
            });
            phoneScreen.addEventListener('drop', function (e) {
                e.preventDefault();
                phoneScreen.classList.remove('drag-over');
                var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
                if (f) loadLocalMediaFile(f);
            });
        }

        var scrubber = $('mockup-scrubber');
        if (scrubber) {
            scrubber.addEventListener('input', function () {
                var t = Number(this.value) || 0;
                runtime.simTime = t;
                var video = $('mockup-video');
                if (runtime.usingVideoFile && video) {
                    try { video.currentTime = t; } catch (e) {}
                }
                applyMediaStageVisuals(t);
                updateTimecodeDisplay(t, runtime.simDuration);
            });
        }

        var videoEl = $('mockup-video');
        if (videoEl) {
            videoEl.addEventListener('timeupdate', function () {
                if (runtime.usingVideoFile) {
                    runtime.simTime = videoEl.currentTime || 0;
                    runtime.simDuration = videoEl.duration || runtime.seq.duration || 15;
                    updateTimecodeDisplay(runtime.simTime, runtime.simDuration);
                }
            });
            videoEl.addEventListener('ended', function () {
                pausePlayback();
            });
        }

        window.addEventListener('keydown', function (e) {
            if (e.code === 'Space') {
                var tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
                if (tag !== 'input' && tag !== 'textarea' && tag !== 'select' && tag !== 'button') {
                    e.preventDefault();
                    togglePlayback();
                }
            }
        });

        var seqChip = $('seq-chip');
        if (seqChip) {
            seqChip.addEventListener('click', function () { refreshSequence(true); });
        }

        var textBindings = {
            'input-username': function (v) { state.username = v.replace(/^@+/, '').trim() || 'kullanici'; },
            'input-caption': function (v) { state.caption = v; },
            'input-audio': function (v) { state.audioName = v; },
            'input-likes': function (v) { state.likesCount = v; },
            'input-comments': function (v) { state.commentsCount = v; },
            'input-saves': function (v) { state.savesCount = v; },
            'input-shares': function (v) { state.sharesCount = v; }
        };
        Object.keys(textBindings).forEach(function (id) {
            var el = $(id);
            if (el) {
                el.addEventListener('input', function () {
                    textBindings[id](this.value);
                    scheduleRender();
                });
            }
        });

        var avInput = $('avatar-input');
        if (avInput) {
            avInput.addEventListener('change', function () {
                var f = this.files && this.files[0];
                if (!f) return;
                var reader = new FileReader();
                reader.onload = function (ev) {
                    state.avatarDataUrl = ev.target.result;
                    loadAvatar(state.avatarDataUrl);
                    schedulePersist();
                };
                reader.readAsDataURL(f);
            });
        }

        var savePreBtn = $('btn-save-preset');
        if (savePreBtn) {
            savePreBtn.addEventListener('click', function () {
                var key = (state.username || 'profil').trim().toLowerCase();
                var p = getPresets();
                p[key] = {};
                PRESET_FIELDS.forEach(function (f) { p[key][f] = state[f]; });
                setPresets(p);
                renderPresets(key);
                toast('@' + key + ' profili kaydedildi.');
            });
        }

        var preSel = $('preset-selector');
        if (preSel) {
            preSel.addEventListener('change', function () {
                var key = this.value;
                if (key === '__default__') {
                    state.username = 'alptugdag';
                    state.isVerified = true;
                    state.showFollow = true;
                    state.caption = DEFAULT_CAPTION;
                    state.audioName = 'alptugdag · Orijinal Ses';
                    state.avatarDataUrl = 'assets/sample_avatar.png';
                } else {
                    var p = getPresets()[key];
                    if (p) PRESET_FIELDS.forEach(function (f) { if (typeof p[f] !== 'undefined') state[f] = p[f]; });
                }
                syncInputs();
                scheduleRender();
            });
        }

        var delPreBtn = $('btn-delete-preset');
        if (delPreBtn) {
            delPreBtn.addEventListener('click', function () {
                var sel = $('preset-selector');
                if (!sel || sel.value === '__default__') {
                    toast('Varsayılan profil silinemez.', true);
                    return;
                }
                var deletedName = sel.value;
                var p = getPresets();
                delete p[deletedName];
                setPresets(p);
                toast('@' + deletedName + ' profili silindi.');
                renderPresets('__default__');
            });
        }

        function executeViralHook() {
            var styleEl = $('select-hook-style');
            var style = styleEl ? styleEl.value : 'punch_zoom';
            var titleEl = $('input-hook-title');
            var customTitle = titleEl ? titleEl.value.trim() : '';

            triggerViralHookPreview(style, customTitle);

            var params = { style: style, title: customTitle };
            callHost('applyViralRetentionHook', [params], function (res) {
                var d = {};
                try { d = typeof res === 'string' ? JSON.parse(res) : res; } catch (e) {}
                if (d && d.ok) toast(d.message || 'İlk 3sn Viral Hook uygulandı.');
                else toast((d && (d.message || d.error)) || 'Hook uygulanamadı.', true);
            });
        }

        var applyHookMainBtn = $('btn-apply-hook-main');
        if (applyHookMainBtn) {
            applyHookMainBtn.addEventListener('click', executeViralHook);
        }

        var vHookBtn = $('btn-viral-hook');
        if (vHookBtn) {
            vHookBtn.addEventListener('click', executeViralHook);
        }

        var refBtn = $('btn-reframe');
        if (refBtn) {
            refBtn.addEventListener('click', function () {
                callHost('autoReframeSequence', [], function (res) {
                    if (res && String(res).indexOf('OK') === 0) {
                        var detail = String(res).indexOf(':') >= 0 ? (' (' + String(res).split(':').slice(1).join(':') + ')') : '';
                        toast('9:16 Dikey kopya sekans oluşturuldu' + detail + '.');
                        refreshSequence(false);
                    } else {
                        toast(res || 'Reframe yapılamadı.', true);
                    }
                });
            });
        }

        var markBtn = $('btn-markers');
        if (markBtn) {
            markBtn.addEventListener('click', function () {
                var meta = PLATFORM[state.platform] || PLATFORM.reels;
                callHost('addPlatformMarkers', [meta.limit || 180, meta.name], function (res) {
                    if (res && String(res).indexOf('OK') === 0) {
                        var added = String(res).split(':')[1] || '1';
                        toast('3sn HOOK ve süre limiti marker\'ları eklendi (' + added + ' adet).');
                    } else {
                        toast(res || 'Marker eklenemedi.', true);
                    }
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
                csInterface.addEventListener('com.alptug.alptuguide.seqchanged', function (ev) {
                    if (ev && ev.data) {
                        applySequence(ev.data);
                    } else {
                        refreshSequence(false);
                    }
                });
                csInterface.addEventListener('com.adobe.csxs.events.SequenceChanged', function () {
                    refreshSequence(false);
                });
                csInterface.addEventListener('com.adobe.csxs.events.ActiveSequenceChanged', function () {
                    refreshSequence(false);
                });
            } catch (e) {}
        }
    }

    function loadHostScript(done) {
        if (!csInterface) { if (done) done(); return; }
        try {
            var extPath = csInterface.getSystemPath(SystemPath.EXTENSION);
            var jsxPath = extPath + '/jsx/hostscript.jsx';
            csInterface.evalScript('$.evalFile("' + jsxPath.replace(/\\/g, '/') + '")', function () {
                if (done) done();
            });
        } catch (e) {
            if (done) done();
        }
    }

    // ------------------------------------------------------------------ Init
    function init() {
        loadPersisted();
        syncInputs();
        updateToolAvailability();
        bindEvents();
        renderMockup();
        updateTimecodeDisplay(runtime.simTime, runtime.simDuration);
        loadHostScript(function () {
            refreshSequence(false);
        });
        connectToMekGateway();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

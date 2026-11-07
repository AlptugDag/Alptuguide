/**
 * Alptuguide™ v3.4 — Professional NLE Studio Controller & Gemini 0-3s Viral Hook Engine
 * Copyright (c) 2026 Alptuğ Dağ (@alptugdag). All rights reserved.
 *
 * Fully integrated directly into:
 *  - Adobe Premiere Pro (Native Sequence Inspection, 1:1 Ruler Guides & Timeline Graphics Export)
 *  - Adobe After Effects (Comp Viewer Guide Layer)
 *  - DaVinci Resolve (Timeline Viewer & Native Liquid Glass Overlay)
 *  - Standalone / Web Studio 60fps Vector Viewport & Gemini 3.8 Flash Viral Hook Studio
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

    var _domCache = {};
    var $ = function (id) {
        return _domCache[id] || (_domCache[id] = document.getElementById(id));
    };
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
        showSafeZones: true,
        showMockUi: true,
        showSubtitleZone: true,
        thirds: false,
        center: false,
        feed45: false,
        grid34: false,
        feed11: false,
        broadcast: false,
        overlayOpacity: 1,
        monitorGuideActive: false,
        hookConfig: {
            enabled: true,
            topic: 'Dikey videolarda izleyiciyi ilk 3 saniyede ekrana kilitleyen kurgu sırrı',
            psychology: 'curiosity_gap',
            textAnimation: 'hormozi_pop',
            cameraMotion: 'punch_zoom',
            placement: 'center',
            hookText: 'VİDEO KURGUSU İÇİN KİMSENİN SÖYLEMEDİĞİ SIR',
            highlightWord: 'SIR',
            subText: 'SONUNA KADAR İZLE · 3 SANİYEDE FARKI GÖR',
            accentColor: '#fbbf24',
            sfxCue: '00:00 Derin Sub Drop + 00:09 Kinetik Pop + 01:15 Whoosh',
            badge: 'MERAK BOŞLUĞU',
            duration: 3.0
        }
    };
    var PERSIST_KEYS = [
        'platform', 'username', 'isVerified', 'showFollow', 'caption', 'audioName',
        'likesCount', 'commentsCount', 'savesCount', 'sharesCount', 'avatarDataUrl',
        'showSafeZones', 'showMockUi', 'showSubtitleZone', 'thirds', 'center',
        'feed45', 'grid34', 'feed11', 'broadcast', 'overlayOpacity', 'hookConfig'
    ];

    var runtime = {
        host: resolveBridge ? 'RESOLVE' : (csInterface ? 'PPRO' : (hasNative() ? 'RESOLVE' : 'WEB')),
        seq: { ok: true, width: 1080, height: 1920, fps: 60, duration: 15, name: 'Studio 9:16 Sekans' },
        avatarImage: null,
        rev: Date.now() % 100000,
        webLayerCount: 0,
        currentTime: 0.65,
        isPlaying: false,
        loopHookWindow: true,
        playRafId: 0,
        lastFrameTs: 0,
        mercuryClient: null,
        mercuryActive: false,
        activeMediaName: 'cinematic_still.png',
        activeMediaType: 'image',
        variations: [],
        selectedVariationIdx: 0,
        geminiGenerating: false
    };

    var PLATFORM = {
        reels:  { name: 'Instagram Reels', follow: 'Takip Et', like: 'Beğeni', share: 'Paylaş', saves: true, limit: 180 },
        tiktok: { name: 'TikTok',          follow: 'Takip Et', like: 'Beğen',  share: 'Paylaş', saves: true, limit: 600 },
        shorts: { name: 'YouTube Shorts',  follow: 'Abone Ol', like: 'Beğen',  share: 'Paylaş', saves: false, limit: 180 },
        all:    { name: 'Ortak Güvenli',   follow: 'Takip Et', like: 'Beğen',  share: 'Paylaş', saves: true, limit: 180 }
    };

    var STORAGE_KEY = 'alptuguide_v34_state';
    var PRESETS_KEY = 'alptuguide_presets';
    var PRESET_FIELDS = ['username', 'isVerified', 'showFollow', 'caption', 'audioName', 'likesCount', 'commentsCount', 'savesCount', 'sharesCount', 'avatarDataUrl'];

    // ------------------------------------------------------------------ Web / Standalone Studio Host Fallback
    var _webStillIdx = 0;
    function webHostFallback(cmd, args) {
        if (cmd === 'getSequenceDetails') {
            return JSON.stringify({
                ok: true,
                host: 'WEB',
                name: runtime.seq.name || 'Studio 9:16 Sekans',
                width: runtime.seq.width || 1080,
                height: runtime.seq.height || 1920,
                fps: runtime.seq.fps || 60,
                duration: runtime.seq.duration || 15
            });
        }
        if (cmd === 'captureProgramMonitorFrame') {
            var stills = [
                'assets/cinematic_still.png',
                'assets/alptug_portrait.jpg'
            ];
            _webStillIdx = (_webStillIdx + 1) % stills.length;
            var nextPath = stills[_webStillIdx];
            runtime.activeMediaName = nextPath.split('/').pop();
            return JSON.stringify({
                ok: true,
                path: nextPath,
                timecode: fmtFrameTimecode(runtime.currentTime, runtime.seq.fps || 60)
            });
        }
        if (cmd === 'autoReframeSequence' || cmd === 'createVerticalVersion') {
            runtime.seq.width = 1080;
            runtime.seq.height = 1920;
            runtime.seq.name = 'Studio Sekans · 9x16';
            return 'OK:' + runtime.seq.name;
        }
        if (cmd === 'applyViralRetentionHook') {
            var styleArg = (args && args[1]) || state.hookConfig.cameraMotion || 'punch_zoom';
            return 'OK:' + styleArg + ':APPLIED';
        }
        if (cmd === 'setPremiereNativeGuides') {
            return args && args[0] ? 'OK:GUIDES_ON' : 'OK:GUIDES_OFF';
        }
        if (cmd === 'addPlatformMarkers') {
            return 'OK:2';
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
        toastTimer = setTimeout(function () { el.className = 'toast'; }, 2800);
    }

    // ------------------------------------------------------------------ Timecode Formatting
    function fmtDur(sec) {
        sec = Math.max(0, Math.floor(sec || 0));
        var m = Math.floor(sec / 60), s = sec % 60;
        return m + ':' + (s < 10 ? '0' : '') + s;
    }

    function fmtSecTenths(sec) {
        var val = Math.max(0, Number(sec) || 0);
        var mins = Math.floor(val / 60);
        var rem = (val % 60).toFixed(1);
        return (mins < 10 ? '0' : '') + mins + ':' + (Number(rem) < 10 ? '0' : '') + rem;
    }

    function fmtFrameTimecode(sec, fps) {
        var f = Math.max(1, Math.round(fps || 60));
        var totalFrames = Math.max(0, Math.round((Number(sec) || 0) * f));
        var secs = Math.floor(totalFrames / f);
        var frames = totalFrames % f;
        var mins = Math.floor(secs / 60);
        var remSecs = secs % 60;
        function pad(n) { return n < 10 ? '0' + n : String(n); }
        return pad(mins) + ':' + pad(remSecs) + ':' + pad(frames);
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

    function outputSize(maxEdge) {
        var sw = runtime.seq.width || 1080, sh = runtime.seq.height || 1920;
        var k = (maxEdge || 1920) / Math.max(sw, sh);
        return { w: Math.max(2, Math.round(sw * k)), h: Math.max(2, Math.round(sh * k)) };
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

    // ------------------------------------------------------------------ 60fps Camera Motion & Canvas Compositor
    function updateMediaStageTransform() {
        var stage = $('mockup-media-stage');
        if (!stage) return;

        var hookCfg = state.hookConfig;
        if (!hookCfg || !hookCfg.enabled || !window.AlptuguideHookEngine) {
            stage.style.transform = 'translate3d(0px, 0px, 0px) scale(1) rotate(0deg)';
            return;
        }

        var tr = AlptuguideHookEngine.computeCameraTransform(
            runtime.currentTime,
            hookCfg.cameraMotion,
            hookCfg.duration || 3.0
        );
        if (!tr.active) {
            stage.style.transform = 'translate3d(0px, 0px, 0px) scale(1) rotate(0deg)';
            return;
        }

        // Convert 1080p pixel offsets to percentage of stage width/height for resolution-independent accuracy
        var oxPct = (tr.offsetX / 1080) * 100;
        var oyPct = (tr.offsetY / 1920) * 100;
        stage.style.transform = 'translate3d(' + oxPct.toFixed(2) + '%, ' + oyPct.toFixed(2) + '%, 0px) scale(' + tr.scale + ') rotate(' + tr.rotateDeg + 'deg)';
    }

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

        if (mode === 'hook_only') {
            if (window.AlptuguideHookEngine) {
                var sampleT = (runtime.currentTime >= 0.15 && runtime.currentTime <= 2.65) ? runtime.currentTime : 0.85;
                var exportCfg = Object.assign({}, state.hookConfig, {
                    enabled: true,
                    platform: state.platform,
                    opacity: 1,
                    showHudBadge: false
                });
                AlptuguideHookEngine.drawHookOverlay(ctx, w, h, sampleT, exportCfg, window.AlptuguideSafeZones);
            }
            return;
        }

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

        // Render 0.00s - 3.00s Viral Hook & Kinetic Typography Layer on live canvas
        if (mode !== 'guides_only' && window.AlptuguideHookEngine && state.hookConfig && state.hookConfig.enabled) {
            var liveHookCfg = Object.assign({}, state.hookConfig, {
                platform: state.platform,
                opacity: state.overlayOpacity,
                showHudBadge: Boolean(state.showSafeZones)
            });
            AlptuguideHookEngine.drawHookOverlay(
                ctx,
                w,
                h,
                runtime.currentTime,
                liveHookCfg,
                window.AlptuguideSafeZones
            );
        }
    }

    function renderMockup() {
        var canvas = $('mockup-canvas');
        if (!canvas) return;
        var w = runtime.seq.width || 1080;
        var h = runtime.seq.height || 1920;
        updateMediaStageTransform();
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
            syncMercuryOverlayState();
        }
    }

    // ------------------------------------------------------------------ 60fps Timeline Scrubber & 0-3s Hook Playback Loop
    function updateScrubberUI() {
        var dur = Number(runtime.seq.duration) || 15;
        var scrub = $('timeline-scrubber');
        if (scrub) {
            scrub.max = String(dur);
            scrub.value = String(runtime.currentTime.toFixed(2));
        }
        var tcLabel = $('timecode-label');
        if (tcLabel) {
            tcLabel.textContent = fmtSecTenths(runtime.currentTime) + ' / ' + fmtSecTenths(dur);
        }
        var hookZone = document.querySelector('.scrubber-hook-zone');
        if (hookZone) {
            var pct = Math.min(100, Math.max(5, (3.0 / dur) * 100));
            hookZone.style.width = pct.toFixed(2) + '%';
        }
    }

    function setPlaybackState(playing) {
        runtime.isPlaying = Boolean(playing);
        var playBtn = $('btn-play-toggle');
        var playText = $('play-toggle-text');
        var playIcon = $('play-toggle-icon');
        var vid = $('mockup-video');

        if (playText) playText.textContent = runtime.isPlaying ? 'Duraklat' : 'Oynat';
        if (playIcon) {
            playIcon.innerHTML = '<use href="' + (runtime.isPlaying ? '#i-pause' : '#i-play') + '"/>';
        }
        if (playBtn) {
            playBtn.classList.toggle('active', runtime.isPlaying);
        }

        if (vid && !vid.hidden) {
            if (runtime.isPlaying) {
                vid.currentTime = runtime.currentTime;
                var p = vid.play();
                if (p && typeof p.catch === 'function') p.catch(function () {});
            } else {
                vid.pause();
            }
        }

        if (runtime.isPlaying) {
            runtime.lastFrameTs = performance.now();
            if (!runtime.playRafId) {
                runtime.playRafId = requestAnimationFrame(playbackTick);
            }
        } else if (runtime.playRafId) {
            cancelAnimationFrame(runtime.playRafId);
            runtime.playRafId = 0;
        }
    }

    function playbackTick(now) {
        if (!runtime.isPlaying) {
            runtime.playRafId = 0;
            return;
        }
        var dt = Math.min(0.1, Math.max(0, (now - runtime.lastFrameTs) / 1000));
        runtime.lastFrameTs = now;

        var maxDur = runtime.loopHookWindow ? 3.0 : (Number(runtime.seq.duration) || 15);
        runtime.currentTime += dt;
        if (runtime.currentTime >= maxDur) {
            if (runtime.singlePreviewRun) {
                runtime.singlePreviewRun = false;
                runtime.currentTime = 0.85;
                updateScrubberUI();
                renderMockup();
                setPlaybackState(false);
                return;
            }
            runtime.currentTime = 0.0;
            var vid = $('mockup-video');
            if (vid && !vid.hidden) {
                try { vid.currentTime = 0; } catch (e) {}
            }
        }

        updateScrubberUI();
        renderMockup();
        runtime.playRafId = requestAnimationFrame(playbackTick);
    }

    function previewHookFromStart() {
        runtime.currentTime = 0.0;
        runtime.loopHookWindow = true;
        runtime.singlePreviewRun = true;
        var loopBtn = $('btn-loop-hook');
        if (loopBtn) loopBtn.classList.add('on');
        updateScrubberUI();
        setPlaybackState(true);
    }

    // ------------------------------------------------------------------ 1:1 Guide Spec Bar & Platform UI
    function updateGuideSpecBar() {
        var bar = $('guide-spec-bar');
        if (!bar || !window.AlptuguideSafeZones) return;
        var spec = AlptuguideSafeZones.getSpec(state.platform);
        var sf = spec.safe || { top: 269, bottom: 672, organicBottom: 440, left: 65, right: 146 };
        var rFull = AlptuguideSafeZones.safeRect(state.platform, 'full');

        bar.innerHTML = [
            '<span>' + spec.name + ' 1:1</span>',
            '<span>·</span>',
            '<span>Üst ' + sf.top + ' px</span>',
            '<span>·</span>',
            '<span>Alt ' + sf.bottom + ' px (' + sf.organicBottom + ' UI)</span>',
            '<span>·</span>',
            '<span>Sol ' + sf.left + ' px</span>',
            '<span>·</span>',
            '<span>Sağ ' + sf.right + ' px</span>',
            '<span>·</span>',
            '<strong>Net ' + rFull.w + '×' + rFull.h + ' px (Y:' + rFull.y + '–' + (rFull.y + rFull.h) + ')</strong>'
        ].join('');
    }

    function updatePlatformUI() {
        var meta = PLATFORM[state.platform] || PLATFORM.reels;
        var tabs = document.querySelectorAll('.seg-btn');
        for (var i = 0; i < tabs.length; i++) {
            var isAct = tabs[i].getAttribute('data-platform') === state.platform;
            tabs[i].classList.toggle('active', isAct);
            tabs[i].setAttribute('aria-selected', isAct ? 'true' : 'false');
        }
        var fChip = $('chip-follow');
        if (fChip) fChip.textContent = meta.follow;
        var lText = $('metric-like-text');
        if (lText) lText.textContent = meta.like;
        var sText = $('metric-share-text');
        if (sText) sText.textContent = meta.share;
        var bSaves = $('metric-box-saves');
        if (bSaves) bSaves.style.display = meta.saves ? '' : 'none';
        updateGuideSpecBar();
        updateSeqChip();
        updateMockupStatusLabel();
    }

    function updateMockupStatusLabel() {
        var statusEl = $('mockup-status-label');
        if (!statusEl) return;
        var sw = runtime.seq.width || 1080;
        var sh = runtime.seq.height || 1920;
        var prefix = runtime.mercuryActive ? 'Mercury 60fps Canlı' : runtime.activeMediaName;
        statusEl.textContent = prefix + ' · ' + sw + '×' + sh;
    }

    // ------------------------------------------------------------------ Host Badge & Sequence Info
    function updateHostBadge() {
        var badge = $('host-badge');
        if (badge) {
            badge.textContent = runtime.host === 'PPRO' ? 'PREMIERE'
                : runtime.host === 'AEFT' ? 'AFTER EFFECTS'
                : runtime.host === 'RESOLVE' ? 'RESOLVE' : 'STUDIO';
        }
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
            updateHostBadge();
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
        updateSeqChip();
        updateScrubberUI();
        updateMockupStatusLabel();

        var sizeChanged = prev.width !== runtime.seq.width || prev.height !== runtime.seq.height;
        if (sizeChanged) scheduleRender(false);
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
                if (!p || typeof p[k] === 'undefined') return;
                if (k === 'hookConfig' && typeof p.hookConfig === 'object' && p.hookConfig !== null) {
                    state.hookConfig = Object.assign({}, state.hookConfig, p.hookConfig);
                } else if (typeof p[k] === typeof state[k]) {
                    state[k] = p[k];
                }
            });
            if (!PLATFORM[state.platform]) state.platform = 'reels';
        } catch (e) {}
    }

    // ------------------------------------------------------------------ Program Monitor Sync & Custom Media Upload
    var _syncingMonitor = false;
    function syncProgramMonitor(silent) {
        if (_syncingMonitor) return;
        _syncingMonitor = true;
        callHost('captureProgramMonitorFrame', [], function (res) {
            _syncingMonitor = false;
            var d = {};
            try { d = typeof res === 'string' ? JSON.parse(res) : res; } catch (e) {}
            if (d && d.ok && d.path) {
                var bgImg = $('mockup-bg-img');
                var vid = $('mockup-video');
                var mCanvas = $('mercury-canvas');
                if (vid) { vid.pause(); vid.hidden = true; }
                if (mCanvas && !runtime.mercuryActive) mCanvas.hidden = true;
                if (bgImg) {
                    bgImg.hidden = false;
                    if (d.path.indexOf('data:') === 0 || d.path.indexOf('/') === 0 || d.path.indexOf('assets/') === 0 || d.path.indexOf('http') === 0) {
                        bgImg.src = d.path;
                        updateMockupStatusLabel();
                        if (!silent) toast('Program Monitörü eşitlendi (' + (d.timecode || 'Kare') + ')');
                        return;
                    }
                    if (fs && fs.existsSync(d.path)) {
                        try {
                            var buf = fs.readFileSync(d.path);
                            bgImg.src = 'data:image/png;base64,' + buf.toString('base64');
                            try { fs.unlinkSync(d.path); } catch (uErr) {}
                            updateMockupStatusLabel();
                            if (!silent) toast('Program Monitörü eşitlendi (' + (d.timecode || 'Kare') + ')');
                            return;
                        } catch (fsErr) {}
                    }
                    bgImg.src = 'file://' + d.path + '?t=' + Date.now();
                    updateMockupStatusLabel();
                    if (!silent) toast('Program Monitörü eşitlendi (' + (d.timecode || 'Kare') + ')');
                }
            } else if (!silent) {
                toast((d && (d.error || d.message)) || 'Program Monitöründen kare alınamadı.', true);
            }
        });
    }

    function handleCustomMediaFile(file) {
        if (!file) return;
        var bgImg = $('mockup-bg-img');
        var vid = $('mockup-video');
        var mCanvas = $('mercury-canvas');
        if (runtime.mercuryActive) toggleMercuryStream();

        runtime.activeMediaName = file.name;
        if (file.type && file.type.indexOf('video/') === 0) {
            runtime.activeMediaType = 'video';
            var vidUrl = URL.createObjectURL(file);
            if (bgImg) bgImg.hidden = true;
            if (mCanvas) mCanvas.hidden = true;
            if (vid) {
                vid.hidden = false;
                vid.src = vidUrl;
                vid.onloadedmetadata = function () {
                    if (vid.duration && isFinite(vid.duration)) {
                        runtime.seq.duration = Math.max(3, Math.round(vid.duration * 10) / 10);
                    }
                    if (vid.videoWidth && vid.videoHeight) {
                        runtime.seq.width = vid.videoWidth;
                        runtime.seq.height = vid.videoHeight;
                    }
                    updateSeqChip();
                    updateScrubberUI();
                    updateMockupStatusLabel();
                    previewHookFromStart();
                };
            }
            toast('Video yüklendi: ' + file.name);
        } else if (file.type && file.type.indexOf('image/') === 0) {
            runtime.activeMediaType = 'image';
            var reader = new FileReader();
            reader.onload = function (ev) {
                if (vid) { vid.pause(); vid.hidden = true; }
                if (mCanvas) mCanvas.hidden = true;
                if (bgImg) {
                    bgImg.hidden = false;
                    bgImg.src = ev.target.result;
                }
                updateMockupStatusLabel();
                scheduleRender(false);
                toast('Önizleme görseli yüklendi: ' + file.name);
            };
            reader.readAsDataURL(file);
        }
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

    // ------------------------------------------------------------------ Mercury 60fps Stream & Monitor Guide
    function syncMercuryOverlayState() {
        if (!window.AlptuguideMercuryStream) return;
        AlptuguideMercuryStream.publishOverlayState({
            enabled: Boolean(state.monitorGuideActive),
            platform: state.platform,
            showSafeZones: Boolean(state.showSafeZones),
            showSubtitleZone: Boolean(state.showSubtitleZone),
            feed45: Boolean(state.feed45),
            grid34: Boolean(state.grid34),
            square: Boolean(state.feed11),
            thirds: Boolean(state.thirds),
            center: Boolean(state.center),
            broadcast: Boolean(state.broadcast),
            opacity: state.overlayOpacity
        });
    }

    function toggleMonitorGuide() {
        state.monitorGuideActive = !state.monitorGuideActive;
        var btn = $('btn-monitor-guide');
        var txt = $('monitor-guide-text');
        if (btn) btn.classList.toggle('on', state.monitorGuideActive);
        if (txt) {
            txt.textContent = 'Monitör Kılavuzu: ' + (state.monitorGuideActive ? 'Açık' : 'Kapalı');
        }
        syncMercuryOverlayState();
        callHost('setPremiereNativeGuides', [
            state.monitorGuideActive,
            state.platform,
            {
                showSubtitleZone: Boolean(state.showSubtitleZone),
                feed45: Boolean(state.feed45),
                grid34: Boolean(state.grid34),
                feed11: Boolean(state.feed11),
                thirds: Boolean(state.thirds),
                center: Boolean(state.center),
                broadcast: Boolean(state.broadcast)
            }
        ], function () {
            toast(
                state.monitorGuideActive
                    ? 'Program Monitörü 1:1 cetvel kılavuzları aktif edildi.'
                    : 'Program Monitörü kılavuzları kapatıldı.'
            );
        });
    }

    function toggleMercuryStream() {
        if (!window.AlptuguideMercuryStream) return;
        var btn = $('btn-mercury-stream');
        var mCanvas = $('mercury-canvas');
        var bgImg = $('mockup-bg-img');
        var vid = $('mockup-video');

        if (runtime.mercuryActive && runtime.mercuryClient) {
            runtime.mercuryClient.stop();
            runtime.mercuryActive = false;
            if (btn) btn.classList.remove('active');
            if (mCanvas) mCanvas.hidden = true;
            if (bgImg) bgImg.hidden = false;
            updateMockupStatusLabel();
            toast('Mercury 60fps canlı akış durduruldu.');
            return;
        }

        if (mCanvas) {
            mCanvas.width = 540;
            mCanvas.height = 960;
            mCanvas.hidden = false;
        }
        if (bgImg) bgImg.hidden = true;
        if (vid) { vid.pause(); vid.hidden = true; }

        runtime.mercuryClient = AlptuguideMercuryStream.createStreamClient({
            canvas: mCanvas,
            onFrame: function (hdr) {
                if (hdr && typeof hdr.timeSeconds === 'number' && !runtime.isPlaying) {
                    runtime.currentTime = hdr.timeSeconds % (runtime.seq.duration || 15);
                    updateScrubberUI();
                    renderMockup();
                }
            },
            onStatusChange: function (st) {
                runtime.mercuryActive = Boolean(st && st.connected);
                if (btn) btn.classList.toggle('active', runtime.mercuryActive);
                updateMockupStatusLabel();
            }
        });
        runtime.mercuryClient.start();
        runtime.mercuryActive = true;
        if (btn) btn.classList.add('active');
        updateMockupStatusLabel();
        toast('Mercury 60fps sıfır-gecikmeli akış başlatıldı.');
    }

    // ------------------------------------------------------------------ Gemini 3.8 Flash Viral Hook Studio
    function checkGeminiStatus() {
        var badge = $('gemini-status-badge');
        if (!badge || typeof fetch !== 'function') return;
        fetch('/api/gemini/status')
            .then(function (r) { return r.json(); })
            .then(function (d) {
                if (d && d.ok) {
                    badge.textContent = d.configured
                        ? 'Gemini 3.8 Flash · Aktif'
                        : 'Gemini 3.8 Flash · Hazır';
                }
            })
            .catch(function () {});
    }

    function captureCurrentFrameDataUrl() {
        try {
            var cap = document.createElement('canvas');
            cap.width = 540;
            cap.height = 960;
            var ctx = cap.getContext('2d');
            var mCanvas = $('mercury-canvas');
            var vid = $('mockup-video');
            var bgImg = $('mockup-bg-img');

            if (runtime.mercuryActive && mCanvas && !mCanvas.hidden) {
                ctx.drawImage(mCanvas, 0, 0, 540, 960);
            } else if (vid && !vid.hidden && vid.readyState >= 2) {
                ctx.drawImage(vid, 0, 0, 540, 960);
            } else if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
                ctx.drawImage(bgImg, 0, 0, 540, 960);
            } else {
                return '';
            }
            return cap.toDataURL('image/jpeg', 0.82);
        } catch (e) {
            return '';
        }
    }

    function parseTimecodeToSec(tc) {
        if (typeof tc === 'number') return tc;
        var parts = String(tc || '').split(':').map(Number);
        if (parts.length === 3 && !isNaN(parts[1]) && !isNaN(parts[2])) {
            var fps = runtime.seq.fps || 60;
            return parts[0] * 60 + parts[1] + (parts[2] / fps);
        }
        var n = parseFloat(tc);
        return isNaN(n) ? 0 : n;
    }

    function renderBeatCuts(cuts) {
        var wrap = $('gemini-beat-cuts');
        if (!wrap) return;
        var list = Array.isArray(cuts) && cuts.length ? cuts : [0.0, 0.80, 1.60, 2.40];
        wrap.innerHTML = '';
        list.forEach(function (item) {
            var s = parseTimecodeToSec(item);
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'beat-btn';
            b.setAttribute('data-sec', s.toFixed(2));
            b.textContent = typeof item === 'string' && item.indexOf(':') >= 0 ? item : fmtFrameTimecode(s, runtime.seq.fps || 60);
            b.title = s.toFixed(2) + '. saniye kesme noktasına git';
            wrap.appendChild(b);
        });
    }

    function renderVariationCards() {
        var container = $('gemini-variations-list');
        if (!container) return;
        container.innerHTML = '';

        runtime.variations.forEach(function (v, idx) {
            var card = document.createElement('div');
            var isAct = idx === runtime.selectedVariationIdx;
            card.className = 'var-card' + (isAct ? ' active' : '');
            card.setAttribute('role', 'radio');
            card.setAttribute('aria-checked', isAct ? 'true' : 'false');
            card.setAttribute('tabindex', '0');
            card.setAttribute('data-idx', String(idx));

            var animMeta = (window.AlptuguideHookEngine && AlptuguideHookEngine.TEXT_ANIMATIONS[v.textAnimation])
                || { name: v.textAnimation };
            var camMeta = (window.AlptuguideHookEngine && AlptuguideHookEngine.CAMERA_MOTIONS[v.cameraMotion])
                || { name: v.cameraMotion };

            card.innerHTML = [
                '<div class="var-top">',
                '  <span class="var-badge">' + escapeHtml(v.badge || ('VARYASYON ' + (idx + 1))) + '</span>',
                '  <span class="var-score">Tutundurma %' + (Number(v.retentionScore) || 94) + '</span>',
                '</div>',
                '<div class="var-headline">' + escapeHtml(v.hookText || '') + '</div>',
                '<div class="var-meta">' + escapeHtml(animMeta.name) + ' · ' + escapeHtml(camMeta.name) + '</div>'
            ].join('');

            card.addEventListener('click', function () {
                selectVariation(idx, true);
            });
            card.addEventListener('keydown', function (ev) {
                if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault();
                    selectVariation(idx, true);
                }
            });

            container.appendChild(card);
        });
    }

    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function selectVariation(idx, triggerPreview) {
        if (!runtime.variations || !runtime.variations[idx]) return;
        runtime.selectedVariationIdx = idx;
        var v = runtime.variations[idx];

        state.hookConfig.hookText = v.hookText || state.hookConfig.hookText;
        state.hookConfig.subText = v.subText || state.hookConfig.subText;
        state.hookConfig.highlightWord = v.highlightWord || state.hookConfig.highlightWord;
        state.hookConfig.textAnimation = v.textAnimation || state.hookConfig.textAnimation;
        state.hookConfig.cameraMotion = v.cameraMotion || state.hookConfig.cameraMotion;
        state.hookConfig.accentColor = v.accentColor || state.hookConfig.accentColor;
        state.hookConfig.sfxCue = v.sfxCue || state.hookConfig.sfxCue;
        state.hookConfig.badge = v.badge || state.hookConfig.badge;
        state.hookConfig.enabled = true;

        syncHookInputs();
        renderVariationCards();

        var analysisEl = $('gemini-visual-analysis');
        if (analysisEl && v.rationale) {
            analysisEl.textContent = v.rationale;
        }

        if (triggerPreview) {
            previewHookFromStart();
        } else {
            scheduleRender();
        }
    }

    function requestGeminiViralHooks(includeVisionFrame) {
        if (runtime.geminiGenerating) return;
        var topicInput = $('input-hook-topic');
        if (topicInput) state.hookConfig.topic = topicInput.value.trim();

        var genBtn = $('btn-gemini-generate');
        var visBtn = $('btn-gemini-vision');
        var genTxt = $('gemini-gen-btn-text');
        var badge = $('gemini-status-badge');

        runtime.geminiGenerating = true;
        if (genBtn) genBtn.disabled = true;
        if (visBtn) visBtn.disabled = true;
        if (genTxt) genTxt.textContent = includeVisionFrame ? 'Kare ve Konu Analiz Ediliyor...' : 'Gemini Kancaları Üretiyor...';
        if (badge) badge.textContent = 'Gemini 3.8 Flash · Üretiyor';

        var payload = {
            topic: state.hookConfig.topic,
            platform: state.platform,
            psychology: state.hookConfig.psychology,
            textAnimation: state.hookConfig.textAnimation,
            cameraMotion: state.hookConfig.cameraMotion,
            frameDataUrl: includeVisionFrame ? captureCurrentFrameDataUrl() : ''
        };

        fetch('/api/gemini/viral-hook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
            .then(function (r) { return r.json(); })
            .then(function (res) {
                if (res && Array.isArray(res.variations) && res.variations.length) {
                    runtime.variations = res.variations;
                    var analysisEl = $('gemini-visual-analysis');
                    if (analysisEl && res.visualAnalysis) {
                        analysisEl.textContent = res.visualAnalysis;
                    }
                    var cuts = res.beatCuts || res.beatCutSeconds;
                    if (Array.isArray(cuts) && cuts.length) {
                        renderBeatCuts(cuts);
                    }
                    selectVariation(0, true);
                    toast(
                        String(res.source || '').indexOf('gemini') === 0
                            ? 'Gemini 3.8 Flash ile 3 yeni viral kanca ve animasyon üretildi.'
                            : '3 viral kanca ve kinetik animasyon reçetesi hazırlandı.'
                    );
                }
            })
            .catch(function () {
                if (window.AlptuguideHookEngine) {
                    runtime.variations = AlptuguideHookEngine.buildFallbackVariations(payload);
                    selectVariation(0, true);
                    toast('3 viral kanca ve kinetik animasyon reçetesi hazırlandı.');
                }
            })
            .finally(function () {
                runtime.geminiGenerating = false;
                if (genBtn) genBtn.disabled = false;
                if (visBtn) visBtn.disabled = false;
                if (genTxt) genTxt.textContent = 'Gemini ile 3 Viral Kanca Üret';
                if (badge) badge.textContent = 'Gemini 3.8 Flash · Hazır';
            });
    }

    function syncHookInputs() {
        var hc = state.hookConfig;
        if ($('input-hook-topic')) $('input-hook-topic').value = hc.topic || '';
        if ($('select-hook-psych')) $('select-hook-psych').value = hc.psychology || 'curiosity_gap';
        if ($('select-text-anim')) $('select-text-anim').value = hc.textAnimation || 'hormozi_pop';
        if ($('select-cam-motion')) $('select-cam-motion').value = hc.cameraMotion || 'punch_zoom';
        if ($('select-hook-placement')) $('select-hook-placement').value = hc.placement || 'center';
        if ($('input-hook-text')) $('input-hook-text').value = hc.hookText || '';
        if ($('input-hook-highlight')) $('input-hook-highlight').value = hc.highlightWord || '';
        if ($('input-hook-subtext')) $('input-hook-subtext').value = hc.subText || '';
        if ($('hook-sfx-cue')) $('hook-sfx-cue').textContent = 'SFX: ' + (hc.sfxCue || '00:00 Sub Drop + 00:09 Kinetik Pop');

        var toggleBtn = $('btn-toggle-hook-preview');
        if (toggleBtn) {
            toggleBtn.classList.toggle('on', Boolean(hc.enabled));
            toggleBtn.innerHTML = '<span>Canlı Hook Katmanı: ' + (hc.enabled ? 'Açık' : 'Kapalı') + '</span>';
        }

        var swatches = document.querySelectorAll('#hook-color-swatches .swatch');
        for (var i = 0; i < swatches.length; i++) {
            var c = swatches[i].getAttribute('data-color');
            swatches[i].classList.toggle('active', c === hc.accentColor);
        }
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
        syncHookInputs();
        loadAvatar(state.avatarDataUrl || 'assets/sample_avatar.png');
        renderPresets();
        updatePlatformUI();
        updateHostBadge();
        updateScrubberUI();
    }

    // ------------------------------------------------------------------ Viral Hook Application & Pro Tools
    function applyViralHookToTimeline() {
        state.hookConfig.enabled = true;
        syncHookInputs();
        previewHookFromStart();

        var hookDataUrl = overlayPng('hook_only', Math.max(runtime.seq.width || 1080, runtime.seq.height || 1920));
        var fileName = 'Alptuguide_ViralHook_' + state.hookConfig.textAnimation + '_' + Date.now() + '.png';
        var hookPngPath = '';

        if (ensureShareDir()) {
            hookPngPath = path.join(SHARE_DIR, fileName);
            writePng(hookPngPath, hookDataUrl);
        }

        callHost('applyViralRetentionHook', [
            hookPngPath,
            state.hookConfig.cameraMotion,
            {
                hookText: state.hookConfig.hookText,
                subText: state.hookConfig.subText,
                highlightWord: state.hookConfig.highlightWord,
                textAnimation: state.hookConfig.textAnimation,
                sfxCue: state.hookConfig.sfxCue
            }
        ], function (res) {
            if (res && String(res).indexOf('OK') === 0) {
                var camName = (window.AlptuguideHookEngine && AlptuguideHookEngine.CAMERA_MOTIONS[state.hookConfig.cameraMotion])
                    ? AlptuguideHookEngine.CAMERA_MOTIONS[state.hookConfig.cameraMotion].name
                    : state.hookConfig.cameraMotion;
                toast('İlk 3sn Viral Hook uygulandı (' + camName + ').');
            } else {
                toast(res || 'Hook uygulanamadı.', true);
            }
        });
    }

    function exportHookPng() {
        try {
            var outName = 'Alptuguide_3s_Hook_' + state.platform + '_' + state.hookConfig.textAnimation + '.png';
            var dataUrl = overlayPng('hook_only', Math.max(runtime.seq.width || 1080, runtime.seq.height || 1920));
            downloadDataUrl(outName, dataUrl);
            toast('İlk 3sn Kinetik Hook PNG indirildi: ' + outName);
        } catch (e) {
            toast('Hook PNG dışa aktarılamadı: ' + e.message, true);
        }
    }

    function copyHookKeyframesJson() {
        if (!window.AlptuguideHookEngine) return;
        var recipe = AlptuguideHookEngine.generateKeyframesRecipe(state.hookConfig, runtime.seq.fps || 60);
        var jsonStr = JSON.stringify(recipe, null, 2);
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            navigator.clipboard.writeText(jsonStr).then(function () {
                toast('0-3sn Kamera ve Kinetik Text Keyframe JSON panoya kopyalandı.');
            }).catch(function () {
                toast('Keyframe reçetesi hazırlandı (' + recipe.keyframes.length + ' anahtar kare).');
            });
        } else {
            toast('Keyframe reçetesi hazırlandı (' + recipe.keyframes.length + ' anahtar kare).');
        }
    }

    function addSequenceMarkers() {
        var meta = PLATFORM[state.platform] || PLATFORM.reels;
        callHost('addPlatformMarkers', [meta.name, meta.limit || 180], function (res) {
            if (res && String(res).indexOf('OK') === 0) {
                toast('00:03 Viral Hook ve ' + meta.name + ' süre limiti marker\'ları eklendi.');
            } else {
                toast('Marker eklenemedi.', true);
            }
        });
    }

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

        callHost('insertClipPermanent', [fileName, '[Alptuguide Kılavuz]'], function (res) {
            if (!state.showSafeZones) {
                state.showSafeZones = true;
                syncChips();
                scheduleRender();
            }
            if (String(res).indexOf('OK') === 0) toast('1:1 Kılavuz katmanı aktif önizlemeye eklendi.');
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
        callHost('cleanAllPreviewClips', [], function (res) {
            if (res && String(res).indexOf('OK:') === 0) {
                var count = Number(res.split(':')[1]) || 0;
                toast(count > 0 ? ('Temizlendi: ' + count + ' Alptuguide katmanı.') : 'Tüm kılavuz katmanları temizlendi.');
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
        if (msg.action === 'analyze_timeline') {
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

        var seqChip = $('seq-chip');
        if (seqChip) {
            seqChip.addEventListener('click', function () { refreshSequence(true); });
        }

        var syncBtn = $('btn-sync-monitor');
        if (syncBtn) {
            syncBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                syncProgramMonitor(false);
            });
        }

        var playBtn = $('btn-play-toggle');
        if (playBtn) {
            playBtn.addEventListener('click', function () {
                runtime.singlePreviewRun = false;
                setPlaybackState(!runtime.isPlaying);
            });
        }

        var loopBtn = $('btn-loop-hook');
        if (loopBtn) {
            loopBtn.addEventListener('click', function () {
                runtime.loopHookWindow = !runtime.loopHookWindow;
                this.classList.toggle('on', runtime.loopHookWindow);
                toast(
                    runtime.loopHookWindow
                        ? '0-3 Saniye Viral Hook döngüsü aktif.'
                        : 'Tam sekans (0-15sn) döngüsü aktif.'
                );
            });
        }

        var scrubber = $('timeline-scrubber');
        if (scrubber) {
            scrubber.addEventListener('input', function () {
                if (runtime.isPlaying) setPlaybackState(false);
                runtime.currentTime = Number(this.value) || 0;
                var vid = $('mockup-video');
                if (vid && !vid.hidden) {
                    try { vid.currentTime = runtime.currentTime; } catch (e) {}
                }
                updateScrubberUI();
                scheduleRender(false);
            });
        }

        var uploadBtn = $('btn-upload-media');
        var mediaInput = $('media-file-input');
        if (uploadBtn && mediaInput) {
            uploadBtn.addEventListener('click', function () {
                mediaInput.click();
            });
            mediaInput.addEventListener('change', function () {
                var f = this.files && this.files[0];
                if (f) handleCustomMediaFile(f);
            });
        }

        var mercBtn = $('btn-mercury-stream');
        if (mercBtn) {
            mercBtn.addEventListener('click', toggleMercuryStream);
        }

        var monGuideBtn = $('btn-monitor-guide');
        if (monGuideBtn) {
            monGuideBtn.addEventListener('click', toggleMonitorGuide);
        }

        var phoneScreen = $('phone-screen');
        if (phoneScreen) {
            phoneScreen.addEventListener('click', function () {
                setPlaybackState(!runtime.isPlaying);
            });
            phoneScreen.addEventListener('dragover', function (e) {
                e.preventDefault();
            });
            phoneScreen.addEventListener('drop', function (e) {
                e.preventDefault();
                var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
                if (f) handleCustomMediaFile(f);
            });
        }

        // Gemini Viral Hook Studio controls
        var toggleHookBtn = $('btn-toggle-hook-preview');
        if (toggleHookBtn) {
            toggleHookBtn.addEventListener('click', function () {
                state.hookConfig.enabled = !state.hookConfig.enabled;
                syncHookInputs();
                scheduleRender();
            });
        }

        var genBtn = $('btn-gemini-generate');
        if (genBtn) {
            genBtn.addEventListener('click', function () {
                requestGeminiViralHooks(false);
            });
        }

        var visBtn = $('btn-gemini-vision');
        if (visBtn) {
            visBtn.addEventListener('click', function () {
                requestGeminiViralHooks(true);
            });
        }

        var beatWrap = $('gemini-beat-cuts');
        if (beatWrap) {
            beatWrap.addEventListener('click', function (e) {
                var b = e.target.closest('.beat-btn');
                if (!b) return;
                if (runtime.isPlaying) setPlaybackState(false);
                runtime.currentTime = Number(b.getAttribute('data-sec')) || 0;
                updateScrubberUI();
                scheduleRender(false);
            });
        }

        var hookSelectBindings = {
            'select-hook-psych': function (v) { state.hookConfig.psychology = v; },
            'select-text-anim': function (v) { state.hookConfig.textAnimation = v; },
            'select-cam-motion': function (v) { state.hookConfig.cameraMotion = v; },
            'select-hook-placement': function (v) { state.hookConfig.placement = v; }
        };
        Object.keys(hookSelectBindings).forEach(function (id) {
            var el = $(id);
            if (el) {
                el.addEventListener('change', function () {
                    hookSelectBindings[id](this.value);
                    if (id === 'select-text-anim' || id === 'select-cam-motion') {
                        previewHookFromStart();
                    } else {
                        scheduleRender();
                    }
                });
            }
        });

        var hookTextBindings = {
            'input-hook-topic': function (v) { state.hookConfig.topic = v; },
            'input-hook-text': function (v) { state.hookConfig.hookText = v; },
            'input-hook-highlight': function (v) { state.hookConfig.highlightWord = v; },
            'input-hook-subtext': function (v) { state.hookConfig.subText = v; }
        };
        Object.keys(hookTextBindings).forEach(function (id) {
            var el = $(id);
            if (el) {
                el.addEventListener('input', function () {
                    hookTextBindings[id](this.value);
                    scheduleRender();
                });
            }
        });

        var swatchGroup = $('hook-color-swatches');
        if (swatchGroup) {
            swatchGroup.addEventListener('click', function (e) {
                var sw = e.target.closest('.swatch');
                if (!sw) return;
                state.hookConfig.accentColor = sw.getAttribute('data-color') || '#fbbf24';
                syncHookInputs();
                scheduleRender();
            });
        }

        var applyHookBtn = $('btn-apply-hook');
        if (applyHookBtn) applyHookBtn.addEventListener('click', applyViralHookToTimeline);

        var quickHookBtn = $('btn-quick-hook');
        if (quickHookBtn) quickHookBtn.addEventListener('click', applyViralHookToTimeline);

        var expHookPngBtn = $('btn-export-hook-png');
        if (expHookPngBtn) expHookPngBtn.addEventListener('click', exportHookPng);

        var copyKfBtn = $('btn-copy-keyframes');
        if (copyKfBtn) copyKfBtn.addEventListener('click', copyHookKeyframesJson);

        // Social Profile Inputs
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
        if (markBtn) markBtn.addEventListener('click', addSequenceMarkers);

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
        if (window.AlptuguideHookEngine) {
            runtime.variations = AlptuguideHookEngine.buildFallbackVariations({
                topic: state.hookConfig.topic,
                psychology: state.hookConfig.psychology,
                textAnimation: state.hookConfig.textAnimation,
                cameraMotion: state.hookConfig.cameraMotion
            });
            renderVariationCards();
        }
        syncInputs();
        bindEvents();
        renderMockup();
        checkGeminiStatus();
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

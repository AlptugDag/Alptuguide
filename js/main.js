/**
 * Alptuguide™ v3.3 — Professional NLE Studio Controller
 * Copyright (c) 2026 Alptuğ Dağ (@alptugdag). All rights reserved.
 *
 * Fully integrated directly into:
 *  - Adobe Premiere Pro (Program Monitor Native Guides + Mek Live Bridge)
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
        seq: { ok: false, width: 1080, height: 1920, fps: 0, duration: 0, name: '' },
        avatarImage: null,
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
    var PRESETS_KEY = 'alptuguide_presets';
    var PRESET_FIELDS = ['username', 'isVerified', 'showFollow', 'caption', 'audioName', 'likesCount', 'commentsCount', 'savesCount', 'sharesCount', 'avatarDataUrl'];

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

    // ------------------------------------------------------------------ Presets
    function getPresets() { try { return JSON.parse(localStorage.getItem(PRESETS_KEY) || '{}'); } catch (e) { return {}; } }
    function setPresets(p) { try { localStorage.setItem(PRESETS_KEY, JSON.stringify(p)); } catch (e) {} }

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
            scheduleRender();
        };
        img.src = src;
    }

    // ------------------------------------------------------------------ Offscreen Renderer
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
            if (window.AlptuguideSafeZones && state.showSafeZones) {
                AlptuguideSafeZones.draw(ctx, state.platform, w, h, {
                    opacity: state.overlayOpacity,
                    showLabels: true,
                    showSafeZones: true,
                    showUiBoxes: false
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

    function scheduleRender(changed) {
        renderMockup();
        if (changed !== false) {
            schedulePersist();
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

    // ------------------------------------------------------------------ Native Smartphone Mockup Engine
    // Sıfır disk I/O, sıfır geçici dosya. Yerel videoyu doğrudan GPU donanım hızlandırmasıyla oynatır.
    function syncMockupFootage(notify) {
        callHost('getActiveFootageInfo', [], function (res) {
            var d = null;
            try { d = typeof res === 'string' ? JSON.parse(res) : res; } catch (e) {}
            if (!d || !d.ok) {
                if (notify) toast('Sekans veya video bulunamadı.', true);
                return;
            }

            var video = $('mockup-video');
            var placeholder = $('mockup-placeholder');
            var fileLabel = $('mockup-file-label');

            if (d.mediaPath) {
                var fileUrl = 'file://' + encodeURI(d.mediaPath).replace(/#/g, '%23');
                if (video.getAttribute('data-raw-src') !== d.mediaPath) {
                    video.setAttribute('data-raw-src', d.mediaPath);
                    video.src = fileUrl;
                    video.load();
                }
                if (typeof d.sourceTime === 'number' && !isNaN(d.sourceTime)) {
                    try { video.currentTime = d.sourceTime; } catch (tErr) {}
                }
                video.style.display = 'block';
                if (placeholder) placeholder.style.display = 'none';
                if (fileLabel) fileLabel.textContent = d.mediaPath.split('/').pop() || d.clipName || 'ddd.mp4';
                updateTimecodeDisplay(d.playerPos || 0, d.duration || video.duration || 0);
                if (notify) toast('Timeline ile eşitlendi: ' + (d.clipName || 'Klip') + ' @ ' + fmtDur(d.playerPos));
            } else {
                video.style.display = 'none';
                if (placeholder) placeholder.style.display = 'flex';
                if (fileLabel) fileLabel.textContent = d.seqName || 'Sekans';
                if (notify) toast('Sekansta video klibi bulunamadı.', true);
            }
            renderMockup();
        });
    }

    function togglePlayback() {
        var video = $('mockup-video');
        var btn = $('btn-play-pause');
        var ico = $('play-pause-icon');
        var txt = $('play-pause-text');
        if (!video) return;

        if (video.paused) {
            video.play().then(function () {
                if (btn) btn.classList.add('active');
                if (txt) txt.textContent = 'Duraklat';
                if (ico) {
                    var use = ico.querySelector('use');
                    if (use) use.setAttribute('href', '#i-pause');
                }
            }).catch(function (e) {});
        } else {
            video.pause();
            if (btn) btn.classList.remove('active');
            if (txt) txt.textContent = 'Oynat';
            if (ico) {
                var use = ico.querySelector('use');
                if (use) use.setAttribute('href', '#i-play');
            }
        }
    }

    function updateTimecodeDisplay(cur, total) {
        var tc = $('mockup-timecode');
        if (!tc) return;
        tc.textContent = fmtDur(cur) + ' / ' + fmtDur(total);
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
        syncMockupFootage(false);
    }

    function refreshSequence(notify) {
        callHost('getSequenceDetails', [], function (res) {
            applySequence(res);
            if (notify) toast(runtime.seq.ok ? 'Sekans algılandı: ' + runtime.seq.width + '×' + runtime.seq.height : 'Açık sekans bulunamadı.', !runtime.seq.ok);
        });
    }

    function updatePlatformUI() {
        var meta = PLATFORM[state.platform];
        var tabs = document.querySelectorAll('.seg-btn');
        for (var i = 0; i < tabs.length; i++) {
            tabs[i].classList.toggle('active', tabs[i].getAttribute('data-platform') === state.platform);
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
    }

    function updateToolAvailability() {
        var refBtn = $('btn-reframe');
        if (refBtn) refBtn.disabled = runtime.host === 'RESOLVE';
    }

    // ------------------------------------------------------------------ Pro Tools
    function insertPermanentGuide() {
        if (!ensureShareDir()) { toast('Dosya erişimi yok.', true); return; }
        var ts = Date.now();
        var p = path.join(SHARE_DIR, 'Alptuguide_Guides_' + state.platform.toUpperCase() + '_' + ts + '.png');
        writePng(p, overlayPng('guides_only', Math.max(runtime.seq.width || 1080, runtime.seq.height || 1920)));
        callHost('insertClipPermanent', [p, '[Alptuguide Kılavuz]'], function (res) {
            if (res === 'OK') toast('Kılavuz klibi timeline\'a yerleştirildi.');
            else toast(res || 'Eklenemedi.', true);
        });
    }

    function insertPermanentOverlay() {
        if (!ensureShareDir()) { toast('Dosya erişimi yok.', true); return; }
        var ts = Date.now();
        var p = path.join(SHARE_DIR, 'Alptuguide_Overlay_' + state.platform.toUpperCase() + '_' + ts + '.png');
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
            callHost('applyViralRetentionHook', [msg.params || {}], function (res) {
                var d = {};
                try { d = typeof res === 'string' ? JSON.parse(res) : res; } catch (e) {}
                toast(d.message || 'Viral hook uygulandı!');
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
        }

        var videoEl = $('mockup-video');
        if (videoEl) {
            videoEl.addEventListener('timeupdate', function () {
                updateTimecodeDisplay(videoEl.currentTime, videoEl.duration || runtime.seq.duration || 0);
            });
            videoEl.addEventListener('ended', function () {
                var btn = $('btn-play-pause');
                var ico = $('play-pause-icon');
                var txt = $('play-pause-text');
                if (btn) btn.classList.remove('active');
                if (txt) txt.textContent = 'Oynat';
                if (ico) {
                    var use = ico.querySelector('use');
                    if (use) use.setAttribute('href', '#i-play');
                }
            });
        }

        window.addEventListener('keydown', function (e) {
            if (e.code === 'Space') {
                var tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
                if (tag !== 'input' && tag !== 'textarea' && tag !== 'select') {
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
                if (!sel || sel.value === '__default__') return;
                var p = getPresets();
                delete p[sel.value];
                setPresets(p);
                toast('@' + sel.value + ' profili silindi.');
                renderPresets('__default__');
            });
        }

        // Viral Hook & Gemini API Key
        var geminiKeyInput = $('input-gemini-key');
        if (geminiKeyInput) {
            try {
                var savedKey = localStorage.getItem('alptuguide_gemini_key') || '';
                if (savedKey) geminiKeyInput.value = savedKey;
            } catch (e) {}

            geminiKeyInput.addEventListener('input', function () {
                var k = this.value.trim();
                try { localStorage.setItem('alptuguide_gemini_key', k); } catch (e) {}
                if (mekClient && !mekClient.destroyed && k) {
                    mekClient.write(JSON.stringify({ type: 'set_config', key: 'gemini_api_key', value: k }) + '\n');
                }
            });
        }

        function executeViralHook() {
            var styleEl = $('select-hook-style');
            var style = styleEl ? styleEl.value : 'punch_zoom';
            var titleEl = $('input-hook-title');
            var customTitle = titleEl ? titleEl.value.trim() : '';
            var keyEl = $('input-gemini-key');
            var key = keyEl ? keyEl.value.trim() : '';

            var params = { style: style, title: customTitle, gemini_key: key };

            callHost('applyViralRetentionHook', [params], function (res) {
                var d = {};
                try { d = typeof res === 'string' ? JSON.parse(res) : res; } catch (e) {}
                if (d.ok) toast(d.message || 'İlk 3sn Viral Hook uygulandı!');
                else toast(d.message || d.error || 'Hook uygulanamadı.', true);
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
            syncMockupFootage(false);
        });

        if (csInterface) {
            try {
                csInterface.addEventListener('com.adobe.csxs.events.SequenceChanged', function () {
                    refreshSequence(false);
                    syncMockupFootage(false);
                });
                csInterface.addEventListener('com.adobe.csxs.events.ActiveSequenceChanged', function () {
                    refreshSequence(false);
                    syncMockupFootage(false);
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
        loadHostScript(function () {
            refreshSequence(false);
            syncMockupFootage(false);
        });
        connectToMekGateway();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

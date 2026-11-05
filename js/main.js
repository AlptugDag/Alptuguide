/**
 * Alptuguide™ v3.2 — Panel controller
 * Copyright (c) 2026 Alptuğ Dağ (@alptugdag). All rights reserved.
 *
 * Architecture (performance first):
 * - Zero polling and zero frame grabbing. The host is only called on explicit actions,
 *   on panel focus, and when Premiere pushes an "active sequence changed" event.
 * - "Program Monitöründe Göster":
 *     After Effects  -> native Guide Layer inside the comp (AE never renders guide layers).
 *     Premiere / DaVinci / others -> click-through native macOS overlay pinned to the
 *     Program Monitor, following the host window. Nothing is added to the timeline.
 * - The preview canvas renders at its on-screen size × devicePixelRatio (not 1080×1920),
 *   and the overlay PNG is only encoded while the monitor overlay is actually on.
 */
(function () {
    'use strict';

    // ------------------------------------------------------------------ Environment / bridges
    var root = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
    var csInterface = (typeof CSInterface !== 'undefined' && root && (root.__adobe_cep__ || root.cep)) ? new CSInterface() : null;
    var nodeRequire = (typeof require === 'function') ? require
        : (root && root.cep_node && typeof root.cep_node.require === 'function') ? root.cep_node.require : null;
    var fs = null, path = null, os = null, childProcess = null;
    try {
        if (nodeRequire) {
            fs = nodeRequire('fs');
            path = nodeRequire('path');
            os = nodeRequire('os');
            childProcess = nodeRequire('child_process');
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
    var OVERLAY_APP_CANDIDATES = ['/Applications/Alptuguide.app'];
    if (SHARE_DIR) OVERLAY_APP_CANDIDATES.push(path.join(SHARE_DIR, 'Alptuguide Overlay.app'));

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
        savesCount: '9.8K',
        sharesCount: '1.2K',
        showSafeZones: true,
        showMockUi: true,
        showSubtitleZone: false,
        thirds: false,
        center: false,
        feed45: false,
        grid34: false,
        square: false,
        broadcast: false,
        overlayOpacity: 1,
        avatarDataUrl: 'assets/sample_avatar.png'
    };
    var PERSIST_KEYS = Object.keys(state);
    var runtime = {
        host: resolveBridge ? 'RESOLVE' : (csInterface ? 'PPRO' : (hasNative() ? 'RESOLVE' : 'WEB')),
        seq: { ok: false, width: 1080, height: 1920, fps: 0, duration: 0, name: '' },
        avatarImage: null,
        monitorOn: false,
        rev: Date.now() % 100000
    };

    var STORAGE_KEY = 'alptuguide_v32_state';
    var PRESETS_KEY = 'alptuguide_v3_presets';

    var PLATFORM = {
        reels:  { name: 'Instagram Reels', limit: 180, follow: 'Takip et',  like: 'Beğeni', share: 'Paylaş', saves: true },
        tiktok: { name: 'TikTok',          limit: 600, follow: '+ Takip',   like: 'Beğeni', share: 'Paylaş', saves: true },
        shorts: { name: 'YouTube Shorts',  limit: 180, follow: 'Abone ol',  like: 'Beğeni', share: 'Remix',  saves: false },
        all:    { name: 'Ortak (3 platform)', limit: 180, follow: 'Takip et', like: 'Beğeni', share: 'Paylaş', saves: true }
    };

    // ------------------------------------------------------------------ Toast
    var toastEl = $('toast'), toastTimer = null;
    function toast(msg, isError) {
        toastEl.textContent = msg;
        toastEl.className = 'toast show' + (isError ? ' error' : '');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { toastEl.className = 'toast'; }, 3200);
    }

    // ------------------------------------------------------------------ Rendering
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
        if (mode === 'guides_only') {
            ctx.clearRect(0, 0, w, h);
            if (window.AlptuguideSafeZones) {
                AlptuguideSafeZones.draw(ctx, state.platform, w, h, { opacity: state.overlayOpacity, showLabels: true });
            }
        } else {
            ReelsRenderer.render(canvas, renderState(w, h));
        }
        if (window.AlptuguideCompGuides) {
            AlptuguideCompGuides.draw(ctx, w, h, {
                opacity: state.overlayOpacity,
                thirds: state.thirds, center: state.center, broadcast: state.broadcast,
                feed45: state.feed45, grid34: state.grid34, square: state.square
            });
        }
    }

    // Output size that matches the sequence aspect, longest edge capped (fast to encode, sharp on screen)
    function outputSize(maxEdge) {
        var sw = runtime.seq.width || 1080, sh = runtime.seq.height || 1920;
        var k = (maxEdge || 1920) / Math.max(sw, sh);
        return { w: Math.max(2, Math.round(sw * k)), h: Math.max(2, Math.round(sh * k)) };
    }

    var canvas = $('render-canvas');
    var stage = $('preview-stage');
    var rafId = 0;
    function renderPreview() {
        if (!stage || stage.offsetParent === null) return; // hidden (short panel) -> skip work
        var aspect = (runtime.seq.width || 1080) / (runtime.seq.height || 1920);
        var sw = stage.clientWidth - 8, sh = stage.clientHeight - 8;
        if (sw <= 0 || sh <= 0) return;
        var cssW = Math.min(sw, sh * aspect), cssH = cssW / aspect;
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.style.width = Math.round(cssW) + 'px';
        canvas.style.height = Math.round(cssH) + 'px';
        compose(canvas, Math.round(cssW * dpr), Math.round(cssH * dpr), 'current');
    }

    function scheduleRender(changed) {
        if (!rafId) {
            rafId = requestAnimationFrame(function () { rafId = 0; renderPreview(); });
        }
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
            var raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('alptuguide_v3_state');
            if (!raw) return;
            var p = JSON.parse(raw);
            PERSIST_KEYS.forEach(function (k) {
                if (p && typeof p[k] === typeof state[k]) state[k] = p[k];
            });
            if (!PLATFORM[state.platform]) state.platform = 'reels';
        } catch (e) {}
    }

    // ------------------------------------------------------------------ Monitor overlay
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

    function overlayStatePayload(edit) {
        runtime.rev++;
        return {
            visible: runtime.monitorOn,
            edit: !!edit,
            host: runtime.host,
            platform: state.platform,
            aspect: (runtime.seq.width || 1080) / (runtime.seq.height || 1920),
            rev: runtime.rev,
            quit: false
        };
    }

    var publishTimer = 0;
    function schedulePublish() {
        clearTimeout(publishTimer);
        publishTimer = setTimeout(function () { publish(false); }, runtime.host === 'AEFT' ? 450 : 180);
    }

    // Pushes the current guide to wherever the monitor preview lives.
    function publish(edit, done) {
        if (runtime.host === 'AEFT') {
            if (!ensureShareDir()) { toast('Dosya erişimi yok.', true); return; }
            var aePath = path.join(SHARE_DIR, 'Alptuguide_AE_Guide.png');
            if (runtime.monitorOn) writePng(aePath, overlayPng('current', Math.max(runtime.seq.width, runtime.seq.height)));
            callHost('setCompGuide', [aePath, runtime.monitorOn], function (res) {
                if (res !== 'OK' && res) toast(res, true);
                if (done) done(res === 'OK');
            });
            return;
        }

        if (hasNative() && !fs) {
            var st = overlayStatePayload(edit);
            sendNative({ action: 'publishOverlay', pngBase64: runtime.monitorOn ? overlayPng('current', 1920).split(',')[1] : '', state: st });
            sendNative({ action: 'toggleOverlay', visible: runtime.monitorOn, edit: !!edit });
            if (done) done(true);
            return;
        }

        if (!ensureShareDir()) { toast('Overlay yalnızca macOS üzerinde çalışır.', true); return; }
        try {
            if (runtime.monitorOn) writePng(path.join(SHARE_DIR, 'overlay.png'), overlayPng('current', 1920));
            fs.writeFileSync(path.join(SHARE_DIR, 'state.json'), JSON.stringify(overlayStatePayload(edit)));
        } catch (e) { toast('Overlay yazılamadı: ' + e.message, true); return; }
        if (runtime.monitorOn) launchOverlayApp();
        if (done) done(true);
    }

    function launchOverlayApp() {
        if (!childProcess || !fs) return;
        var app = null;
        for (var i = 0; i < OVERLAY_APP_CANDIDATES.length; i++) {
            if (fs.existsSync(OVERLAY_APP_CANDIDATES[i])) { app = OVERLAY_APP_CANDIDATES[i]; break; }
        }
        if (!app) { toast('Alptuguide.app bulunamadı — install.sh çalıştırın.', true); return; }
        // Only launch when not running; "-g" keeps the editor app in front.
        childProcess.exec('/usr/bin/pgrep -x AlptuguideOverlay', function (err) {
            if (err) childProcess.exec('/usr/bin/open -g "' + app + '"', function () {});
        });
    }

    function setMonitor(on, edit) {
        runtime.monitorOn = on;
        updateMonitorButton();
        publish(edit, function (ok) {
            if (!ok) return;
            if (runtime.host === 'AEFT') {
                toast(on ? 'Kılavuz Composition\'a Guide Layer olarak eklendi (render\'a girmez).' : 'Guide Layer kaldırıldı.');
            } else if (edit) {
                toast('Hizalama: overlay\'i video karesine oturtun, Enter ile kilitleyin.');
            } else {
                toast(on ? 'Program Monitöründe gösteriliyor (render\'a girmez).' : 'Monitör kılavuzu gizlendi.');
            }
        });
    }

    function updateMonitorButton() {
        var btn = $('btn-monitor');
        btn.classList.toggle('on', runtime.monitorOn);
        btn.setAttribute('aria-pressed', String(runtime.monitorOn));
        btn.querySelector('use').setAttribute('href', runtime.monitorOn ? '#i-eye' : '#i-eye-off');
        var target = runtime.host === 'AEFT' ? 'Composition\'da' : 'Program Monitöründe';
        $('monitor-title').textContent = runtime.monitorOn ? target + ' Gösteriliyor' : target + ' Göster';
        $('monitor-sub').textContent = runtime.host === 'AEFT'
            ? 'Guide Layer · render\'a girmez'
            : 'Render\'a girmez · ⌃⌥G aç/kapat';
        $('btn-align').style.display = runtime.host === 'AEFT' ? 'none' : '';
    }

    // The overlay app can be toggled with ⌃⌥G; reflect that when the panel regains focus.
    function syncOverlayStatus() {
        if (runtime.host === 'AEFT' || !fs || !SHARE_DIR) return;
        try {
            var p = path.join(SHARE_DIR, 'overlay_status.json');
            if (!fs.existsSync(p)) return;
            var s = JSON.parse(fs.readFileSync(p, 'utf8'));
            if (typeof s.visible === 'boolean' && s.visible !== runtime.monitorOn) {
                runtime.monitorOn = s.visible;
                updateMonitorButton();
            }
        } catch (e) {}
    }

    // ------------------------------------------------------------------ Sequence info
    function fmtDur(sec) {
        sec = Math.max(0, Math.round(sec || 0));
        var m = Math.floor(sec / 60), s = sec % 60;
        return m + ':' + (s < 10 ? '0' : '') + s;
    }

    function updateSeqChip() {
        var chip = $('seq-chip'), text = $('seq-text'), sq = runtime.seq;
        chip.classList.remove('ok', 'warn', 'bad');
        if (!sq.ok) {
            text.textContent = sq.message || 'Sekans yok';
            chip.title = 'Bir sekans / composition açın, sonra tıklayın.';
            return;
        }
        var meta = PLATFORM[state.platform];
        var aspect = sq.width / sq.height;
        var vertical = Math.abs(aspect - 9 / 16) < 0.01;
        var over = sq.duration > meta.limit;
        var parts = [sq.width + '×' + sq.height];
        if (sq.fps) parts.push((Math.round(sq.fps * 100) / 100) + ' fps');
        if (sq.duration) parts.push(fmtDur(sq.duration));
        text.textContent = parts.join(' · ');
        var tips = [sq.name || ''];
        if (!vertical) tips.push('⚠ Sekans 9:16 değil — "9:16 Kopya" ile dikey sürüm oluşturabilirsiniz.');
        if (over) tips.push('⛔ ' + meta.name + ' limiti ' + fmtDur(meta.limit) + ' — süre aşılıyor.');
        if (vertical && !over) tips.push('✓ ' + meta.name + ' için uygun (limit ' + fmtDur(meta.limit) + ').');
        chip.title = tips.join('\n');
        chip.classList.add(over ? 'bad' : (vertical ? 'ok' : 'warn'));
    }

    var lastSeqRefresh = 0;
    function refreshSequence(force) {
        var now = Date.now();
        if (!force && now - lastSeqRefresh < 1200) return;
        lastSeqRefresh = now;
        callHost('getSequenceDetails', [], function (res) { applySequence(res); });
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
            width: Number(d.width) || prev.width || 1080,
            height: Number(d.height) || prev.height || 1920,
            fps: Number(d.fps) || 0,
            duration: Number(d.duration) || 0,
            name: d.name || '',
            message: d.message || ''
        };
        updateSeqChip();
        updateSpec();
        var sizeChanged = prev.width !== runtime.seq.width || prev.height !== runtime.seq.height;
        if (sizeChanged) scheduleRender(false);
        if (sizeChanged && runtime.monitorOn) schedulePublish();
    }

    // ------------------------------------------------------------------ UI sync
    function updateSpec() {
        var el = $('spec-text');
        if (!el || !window.AlptuguideSafeZones) return;
        var z = AlptuguideSafeZones.getScaledSpec(state.platform, runtime.seq.width, runtime.seq.height);
        el.textContent = 'Üst ' + z.top + ' · Alt ' + z.bottom + ' (' + z.bottomOrganic + ' UI) · Sol ' + z.left + ' · Sağ ' + z.right + ' px';
    }

    function updatePlatformUI() {
        var meta = PLATFORM[state.platform];
        var tabs = document.querySelectorAll('.seg-btn');
        for (var i = 0; i < tabs.length; i++) tabs[i].classList.toggle('active', tabs[i].getAttribute('data-platform') === state.platform);
        $('chip-follow').textContent = meta.follow;
        $('metric-like-text').textContent = meta.like;
        $('metric-share-text').textContent = meta.share;
        $('metric-box-saves').style.display = meta.saves ? '' : 'none';
        updateSpec();
        updateSeqChip();
    }

    function syncChips() {
        var chips = document.querySelectorAll('.chip[data-key]');
        for (var i = 0; i < chips.length; i++) chips[i].classList.toggle('on', !!state[chips[i].getAttribute('data-key')]);
    }

    function syncInputs() {
        $('input-username').value = state.username;
        $('input-caption').value = state.caption;
        $('input-audio').value = state.audioName;
        $('input-likes').value = state.likesCount;
        $('input-comments').value = state.commentsCount;
        $('input-saves').value = state.savesCount;
        $('input-shares').value = state.sharesCount;
        var pct = Math.round(state.overlayOpacity * 100);
        $('input-opacity').value = String(pct);
        $('opacity-val').textContent = pct + '%';
        syncChips();
        loadAvatar(state.avatarDataUrl);
        updatePlatformUI();
    }

    function loadAvatar(src) {
        if (!src) return;
        var img = new Image();
        img.onload = function () {
            runtime.avatarImage = img;
            $('avatar-img-preview').src = src;
            scheduleRender();
        };
        img.src = src;
    }

    function updateToolAvailability() {
        // DaVinci has no scripting API for reframing a timeline
        $('btn-reframe').disabled = runtime.host === 'RESOLVE';
    }

    // ------------------------------------------------------------------ Presets
    function getPresets() { try { return JSON.parse(localStorage.getItem(PRESETS_KEY) || '{}'); } catch (e) { return {}; } }
    function setPresets(p) { try { localStorage.setItem(PRESETS_KEY, JSON.stringify(p)); } catch (e) {} }
    var PRESET_FIELDS = ['username', 'isVerified', 'showFollow', 'caption', 'audioName', 'likesCount', 'commentsCount', 'savesCount', 'sharesCount', 'avatarDataUrl'];

    function renderPresets(selected) {
        var sel = $('preset-selector');
        sel.innerHTML = '';
        var def = document.createElement('option');
        def.value = '__default__';
        def.textContent = 'Varsayılan (@alptugdag)';
        sel.appendChild(def);
        Object.keys(getPresets()).forEach(function (k) {
            var o = document.createElement('option');
            o.value = k;
            o.textContent = '@' + k;
            if (k === selected) o.selected = true;
            sel.appendChild(o);
        });
    }

    // ------------------------------------------------------------------ Tool actions
    function exportClip(mode) {
        refreshSequence(true);
        var tag = mode === 'guides_only' ? 'Kilavuz' : 'Arayuz';
        var fileName = 'Alptuguide_' + tag + '_' + state.platform + '_' + runtime.seq.width + 'x' + runtime.seq.height + '_' + Date.now() + '.png';
        var label = 'Alptuguide ' + (mode === 'guides_only' ? 'Kılavuz' : 'Arayüz') + ' (' + state.platform + ')';
        var dataUrl = overlayPng(mode, Math.max(runtime.seq.width, runtime.seq.height));

        if (hasNative() && !fs) {
            sendNative({ action: 'insertLayer', fileName: fileName, displayName: label, pngBase64: dataUrl.split(',')[1], isLivePreview: false }, function (res) {
                toast(res === 'OK' ? label + ' eklendi.' : (res || 'Eklenemedi.'), res !== 'OK');
            });
            return;
        }
        if (!ensureShareDir()) return;
        var out = path.join(SHARE_DIR, fileName);
        try { writePng(out, dataUrl); } catch (e) { toast(e.message, true); return; }
        callHost('insertClipPermanent', [out, label], function (res) {
            toast(res === 'OK' ? label + ' en üst kanala eklendi.' : (res || 'Eklenemedi.'), res !== 'OK');
        });
    }

    function exportDesktop() {
        var fileName = 'Alptuguide_' + state.platform + '_' + runtime.seq.width + 'x' + runtime.seq.height + '_' + Date.now() + '.png';
        var dataUrl = overlayPng('current', Math.max(runtime.seq.width, runtime.seq.height));
        if (hasNative() && !fs) {
            sendNative({ action: 'exportDesktop', fileName: fileName, pngBase64: dataUrl.split(',')[1] }, function (res) {
                toast(res === 'OK' ? 'Masaüstüne kaydedildi.' : (res || 'Kaydedilemedi.'), res !== 'OK');
            });
            return;
        }
        if (!fs) return;
        try {
            writePng(path.join(os.homedir(), 'Desktop', fileName), dataUrl);
            toast('Masaüstüne kaydedildi: ' + fileName);
        } catch (e) { toast(e.message, true); }
    }

    function addMarkers() {
        var meta = PLATFORM[state.platform];
        callHost('addPlatformMarkers', [meta.limit, meta.name], function (res) {
            if (res && String(res).indexOf('OK') === 0) {
                var n = String(res).split(':')[1] || '1';
                toast(n === '1' ? 'HOOK marker\'ı eklendi (süre ' + meta.name + ' limitinde).' : 'HOOK + süre limiti marker\'ları eklendi.');
            } else {
                toast(res || 'Marker eklenemedi.', true);
            }
        });
    }

    function reframe() {
        toast('9:16 kopya hazırlanıyor…');
        var w = 1080, h = 1920;
        if (runtime.seq.width >= 3840 || runtime.seq.height >= 2160) { w = 2160; h = 3840; }
        callHost('createVerticalVersion', [w, h], function (res) {
            if (res && String(res).indexOf('OK') === 0) {
                toast('Oluşturuldu: ' + String(res).slice(3));
                setTimeout(function () { refreshSequence(true); }, 600);
            } else {
                toast(res || '9:16 kopya oluşturulamadı.', true);
            }
        });
    }

    function cleanTimeline() {
        if (runtime.monitorOn && runtime.host === 'AEFT') { runtime.monitorOn = false; updateMonitorButton(); }
        callHost('cleanAllPreviewClips', [], function (res) {
            if (res && String(res).indexOf('OK:') === 0) toast('Temizlendi: ' + res.split(':')[1] + ' Alptuguide katmanı.');
            else toast('Temizlenecek katman yok.', true);
        });
    }

    // ------------------------------------------------------------------ Events
    function bind() {
        $('platform-tabs').addEventListener('click', function (e) {
            var b = e.target.closest('.seg-btn');
            if (!b) return;
            state.platform = b.getAttribute('data-platform');
            updatePlatformUI();
            scheduleRender();
        });

        document.addEventListener('click', function (e) {
            var chip = e.target.closest('.chip[data-key]');
            if (!chip) return;
            var k = chip.getAttribute('data-key');
            state[k] = !state[k];
            chip.classList.toggle('on', state[k]);
            scheduleRender();
        });

        $('input-opacity').addEventListener('input', function () {
            var v = Number(this.value) || 100;
            state.overlayOpacity = Math.max(0.2, Math.min(1, v / 100));
            $('opacity-val').textContent = v + '%';
            scheduleRender();
        });

        $('btn-monitor').addEventListener('click', function () { setMonitor(!runtime.monitorOn, false); });
        $('btn-align').addEventListener('click', function () { setMonitor(true, true); });
        $('seq-chip').addEventListener('click', function () { refreshSequence(true); });

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
            $(id).addEventListener('input', function () { textBindings[id](this.value); scheduleRender(); });
        });

        $('avatar-input').addEventListener('change', function () {
            var f = this.files && this.files[0];
            if (!f) return;
            var reader = new FileReader();
            reader.onload = function (ev) { state.avatarDataUrl = ev.target.result; loadAvatar(state.avatarDataUrl); };
            reader.readAsDataURL(f);
        });

        $('btn-save-preset').addEventListener('click', function () {
            var key = (state.username || 'profil').trim().toLowerCase();
            var p = getPresets();
            p[key] = {};
            PRESET_FIELDS.forEach(function (f) { p[key][f] = state[f]; });
            setPresets(p);
            renderPresets(key);
            toast('@' + key + ' kaydedildi.');
        });
        $('preset-selector').addEventListener('change', function () {
            var key = this.value;
            if (key === '__default__') {
                state.username = 'alptugdag'; state.isVerified = true; state.showFollow = true;
                state.caption = DEFAULT_CAPTION; state.audioName = 'alptugdag · Orijinal Ses';
                state.avatarDataUrl = 'assets/sample_avatar.png';
            } else {
                var p = getPresets()[key];
                if (p) PRESET_FIELDS.forEach(function (f) { if (typeof p[f] !== 'undefined') state[f] = p[f]; });
            }
            syncInputs();
            scheduleRender();
        });
        $('btn-delete-preset').addEventListener('click', function () {
            var sel = $('preset-selector');
            if (sel.value === '__default__') return;
            var p = getPresets();
            delete p[sel.value];
            setPresets(p);
            toast('@' + sel.value + ' silindi.');
            renderPresets('__default__');
        });

        $('btn-reframe').addEventListener('click', reframe);
        $('btn-markers').addEventListener('click', addMarkers);
        $('btn-insert-guides').addEventListener('click', function () { exportClip('guides_only'); });
        $('btn-insert-overlay').addEventListener('click', function () { exportClip('current'); });
        $('btn-export-png').addEventListener('click', exportDesktop);
        $('btn-clean-timeline').addEventListener('click', cleanTimeline);

        // Re-layout preview only when its box actually changes size
        if (typeof ResizeObserver !== 'undefined') {
            new ResizeObserver(function () { scheduleRender(false); }).observe(stage);
        } else {
            window.addEventListener('resize', function () { scheduleRender(false); });
        }

        // Cheap, event-driven refresh: panel focus / visibility, plus Premiere's push event
        window.addEventListener('focus', function () { refreshSequence(false); syncOverlayStatus(); });
        document.addEventListener('mouseenter', function () { refreshSequence(false); syncOverlayStatus(); });
        document.addEventListener('visibilitychange', function () { if (!document.hidden) refreshSequence(false); });
        if (csInterface) {
            csInterface.addEventListener('com.alptug.alptuguide.seqchanged', function (ev) { applySequence(ev.data); });
        }
    }

    // ------------------------------------------------------------------ Init
    function init() {
        if (hasNative() && !fs) document.body.classList.add('native-glass');
        loadPersisted();
        renderPresets('__default__');
        syncInputs();
        bind();
        updateMonitorButton();
        updateToolAvailability();
        scheduleRender(false);
        refreshSequence(true);
        syncOverlayStatus();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();

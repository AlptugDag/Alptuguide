/**
 * Alptuguide™ Studio v3.0 — Main Controller
 * Copyright (c) 2026 Alptuğ Dağ (@alptugdag). All rights reserved.
 *
 * Clean, zero-lag, asynchronous architecture:
 * - Zero synchronous sleep / main-thread locks
 * - RequestAnimationFrame-batched canvas rendering
 * - Non-intrusive Playhead Settle Detection (never interrupts scrubbing/playback)
 * - 1:1 Verified Safe-Zone & Native macOS Floating Overlay synchronization
 */

(function () {
    'use strict';

    var csInterface = (typeof CSInterface !== 'undefined') ? new CSInterface() : null;
    var fs = null;
    var path = null;
    var os = null;
    var childProcess = null;

    try {
        if (typeof require === 'function') {
            fs = require('fs');
            path = require('path');
            os = require('os');
            childProcess = require('child_process');
        } else if (window.cep_node && typeof window.cep_node.require === 'function') {
            fs = window.cep_node.require('fs');
            path = window.cep_node.require('path');
            os = window.cep_node.require('os');
            childProcess = window.cep_node.require('child_process');
        }
    } catch (e) {}

    // DOM Elements
    var canvas = document.getElementById('render-canvas');
    var canvasContainer = document.getElementById('canvas-container');
    var previewPlatformTitle = document.getElementById('preview-platform-title');
    var liveBadge = document.getElementById('live-badge');
    var liveBadgeText = document.getElementById('live-badge-text');
    var btnToggleLive = document.getElementById('btn-toggle-live');
    var liveToggleText = document.getElementById('live-toggle-text');
    var btnForceRefresh = document.getElementById('btn-force-refresh');

    var seqAspectBadge = document.getElementById('seq-aspect-badge');
    var seqDimText = document.getElementById('seq-dim-text');
    var btnSyncMonitor = document.getElementById('btn-sync-monitor');
    var checkLiveMonitor = document.getElementById('check-live-monitor');

    var tabButtons = document.querySelectorAll('.platform-tab');
    var specPlatformName = document.getElementById('spec-platform-name');
    var specMetricsText = document.getElementById('spec-metrics-text');
    var guideActiveDesc = document.getElementById('guide-active-desc');

    var checkSafeZones = document.getElementById('check-safezones');
    var checkSubtitleZone = document.getElementById('check-subtitle-zone');
    var checkShowUi = document.getElementById('check-show-ui');
    var inputOpacity = document.getElementById('input-opacity');
    var opacityValText = document.getElementById('opacity-val-text');

    var btnLaunchOverlay = document.getElementById('btn-launch-overlay');
    var overlayBtnText = document.getElementById('overlay-btn-text');
    var btnAlignOverlay = document.getElementById('btn-align-overlay');

    var presetSelector = document.getElementById('preset-selector');
    var btnSavePreset = document.getElementById('btn-save-preset');
    var btnDeletePreset = document.getElementById('btn-delete-preset');

    var avatarInput = document.getElementById('avatar-input');
    var avatarImgPreview = document.getElementById('avatar-img-preview');
    var avatarName = document.getElementById('avatar-name');

    var inputUsername = document.getElementById('input-username');
    var checkVerified = document.getElementById('check-verified');
    var checkFollow = document.getElementById('check-follow');
    var followToggleLabel = document.getElementById('follow-toggle-label');
    var followToggleDesc = document.getElementById('follow-toggle-desc');

    var inputCaption = document.getElementById('input-caption');
    var inputAudio = document.getElementById('input-audio');
    var audioInputLabel = document.getElementById('audio-input-label');

    var inputLikes = document.getElementById('input-likes');
    var inputComments = document.getElementById('input-comments');
    var inputSaves = document.getElementById('input-saves');
    var inputShares = document.getElementById('input-shares');
    var metricLikeText = document.getElementById('metric-like-text');
    var metricShareText = document.getElementById('metric-share-text');
    var metricBoxSaves = document.getElementById('metric-box-saves');

    var btnInsertOverlay = document.getElementById('btn-insert-overlay');
    var btnInsertGuides = document.getElementById('btn-insert-guides');
    var btnGuidesText = document.getElementById('btn-guides-text');
    var btnExportPng = document.getElementById('btn-export-png');
    var btnCleanTimeline = document.getElementById('btn-clean-timeline');
    var statusBox = document.getElementById('status-box');

    // State
    var state = {
        platform: 'reels',
        username: 'alptugdag',
        isVerified: true,
        showFollow: true,
        caption: 'Bu eklenti @alptugdag tarafından yapılmıştır, destek için takip edebilirsin, kolay gelsin!',
        audioName: 'alptugdag · Orijinal Ses',
        likesCount: '12.4K',
        commentsCount: '348',
        savesCount: '9.8K',
        sharesCount: '1.2K',
        showSafeZones: true,
        showSubtitleZone: false,
        showMockUi: true,
        overlayOpacity: 1.0,
        avatarImage: null,
        avatarDataUrl: 'assets/sample_avatar.png',
        videoFrameImage: null,
        seqWidth: 1080,
        seqHeight: 1920,
        hostApp: 'PPRO',
        liveMirrorActive: true,
        programMonitorLayerActive: true,
        floatingOverlayVisible: false,
        floatingOverlayEdit: false,
        floatingOverlayRev: 1
    };

    var STORAGE_STATE_KEY = 'alptuguide_v3_state';
    var STORAGE_PRESETS_KEY = 'alptuguide_v3_presets';

    var renderRafId = null;
    var syncOverlayTimer = null;
    var statusTimer = null;
    var isCapturingFrame = false;
    var lastObservedPos = null;
    var lastCapturedPos = null;
    var offscreenExportCanvas = document.createElement('canvas');

    var PLATFORM_META = {
        reels: {
            title: 'Instagram Reels',
            guideDesc: 'Aktif: Instagram Reels (Meta 1:1 Doğrulanmış)',
            btnGuide: 'Reels Kılavuzunu Timeline\'a Ekle',
            followLabel: 'Takip Et Butonu',
            followDesc: 'Profil yanında "Takip Et" butonunu gösterir',
            audioLabel: 'Ses / Müzik Başlığı',
            likeText: 'Beğeni',
            shareText: 'Paylaşım',
            showSaves: true,
            specTitle: 'Instagram Reels (1080×1920):',
            specText: 'Üst 269px · Alt 672px (440px UI + 110px Bar) · Sağ 146px · Sol 65px'
        },
        tiktok: {
            title: 'TikTok',
            guideDesc: 'Aktif: TikTok (Creative Center 1:1 Doğrulanmış)',
            btnGuide: 'TikTok Kılavuzunu Timeline\'a Ekle',
            followLabel: 'Profil (+) Takip Rozeti',
            followDesc: 'Avatar altında kırmızı "+" takip rozetini gösterir',
            audioLabel: 'TikTok Ses / Orijinal Ses',
            likeText: 'Beğeni',
            shareText: 'Paylaşım',
            showSaves: true,
            specTitle: 'TikTok (1080×1920):',
            specText: 'Üst 252px · Alt 620px (490px UI + 162px Bar) · Sağ 184px · Sol 60px'
        },
        shorts: {
            title: 'YouTube Shorts',
            guideDesc: 'Aktif: YouTube Shorts (1:1 Doğrulanmış)',
            btnGuide: 'Shorts Kılavuzunu Timeline\'a Ekle',
            followLabel: 'Abone Ol Butonu',
            followDesc: 'Kanal yanında "Abone ol" hap butonunu gösterir',
            audioLabel: 'Shorts Ses / Müzik Başlığı',
            likeText: 'Beğeni',
            shareText: 'Remix',
            showSaves: false,
            specTitle: 'YouTube Shorts (1080×1920):',
            specText: 'Üst 288px · Alt 672px (480px UI + 144px Bar) · Sağ 192px · Sol 48px'
        },
        all: {
            title: 'Ortak Kılavuz (Tümü)',
            guideDesc: 'Aktif: Reels + TikTok + Shorts Ortak Güvenli Alan',
            btnGuide: 'Ortak Kılavuzu Timeline\'a Ekle',
            followLabel: 'Takip Et / Abone Ol',
            followDesc: 'Profil yanında takip butonunu gösterir',
            audioLabel: 'Ses / Müzik Başlığı',
            likeText: 'Beğeni',
            shareText: 'Paylaşım',
            showSaves: true,
            specTitle: 'Ortak Kesişim (1080×1920):',
            specText: 'Üst 288px · Alt 672px (490px UI) · Sağ 192px · Sol 65px → 823×960px Net'
        }
    };

    function showStatus(msg, type) {
        if (!statusBox) return;
        statusBox.textContent = msg;
        statusBox.className = 'status-msg ' + (type === 'error' ? 'error' : 'success');
        if (statusTimer) clearTimeout(statusTimer);
        statusTimer = setTimeout(function () {
            statusBox.className = 'status-msg';
        }, 3800);
    }

    function evalExtendScript(script, callback) {
        if (!csInterface) {
            if (callback) callback('');
            return;
        }
        csInterface.evalScript(script, function (res) {
            if (callback) callback(res);
        });
    }

    function getSharedDir() {
        if (!os || !path) return '/tmp';
        return path.join(os.homedir(), 'Library', 'Application Support', 'Alptuguide');
    }

    function ensureDir(dirPath) {
        if (!fs) return;
        try {
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }
        } catch (e) {}
    }

    function buildRenderState(includeVideoFrame, targetWidth, targetHeight) {
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
            avatarImage: state.avatarImage,
            videoFrameImage: includeVideoFrame ? state.videoFrameImage : null,
            targetWidth: targetWidth || 1080,
            targetHeight: targetHeight || 1920
        };
    }

    function renderToCanvas(targetCanvas, includeVideoFrame, width, height) {
        var w = width || 1080;
        var h = height || 1920;
        if (targetCanvas.width !== w) targetCanvas.width = w;
        if (targetCanvas.height !== h) targetCanvas.height = h;

        var rState = buildRenderState(includeVideoFrame, w, h);
        ReelsRenderer.render(targetCanvas, rState);
    }

    function scheduleRender(syncMonitorAndOverlay) {
        if (renderRafId) cancelAnimationFrame(renderRafId);
        renderRafId = requestAnimationFrame(function () {
            renderRafId = null;
            renderToCanvas(canvas, true, 1080, 1920);
            if (canvasContainer) {
                if (state.videoFrameImage) {
                    canvasContainer.classList.remove('checker-bg');
                } else {
                    canvasContainer.classList.add('checker-bg');
                }
            }
            if (syncMonitorAndOverlay !== false) {
                scheduleExternalSync();
            }
        });
    }

    function scheduleExternalSync() {
        if (syncOverlayTimer) clearTimeout(syncOverlayTimer);
        syncOverlayTimer = setTimeout(function () {
            syncOverlayTimer = null;
            saveStateToStorage();
            publishToFloatingOverlay();
        }, 120);
    }

    function dataUrlToBuffer(dataUrl) {
        var idx = dataUrl.indexOf(',');
        var b64 = idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl;
        return Buffer.from(b64, 'base64');
    }

    function exportTransparentPngBuffer(mode, width, height) {
        var w = width || state.seqWidth || 1080;
        var h = height || state.seqHeight || 1920;
        offscreenExportCanvas.width = w;
        offscreenExportCanvas.height = h;
        var ctx = offscreenExportCanvas.getContext('2d');
        ctx.clearRect(0, 0, w, h);

        if (mode === 'guides_only') {
            if (typeof AlptuguideSafeZones !== 'undefined') {
                AlptuguideSafeZones.draw(ctx, state.platform, w, h, {
                    opacity: state.overlayOpacity,
                    showGrid: true,
                    showLabels: true,
                    showCenterCross: true
                });
            }
        } else {
            renderToCanvas(offscreenExportCanvas, false, w, h);
        }

        var dataUrl = offscreenExportCanvas.toDataURL('image/png');
        return dataUrlToBuffer(dataUrl);
    }

    function publishToFloatingOverlay() {
        if (!fs || !path) return;
        try {
            var shareDir = getSharedDir();
            ensureDir(shareDir);
            var overlayPngPath = path.join(shareDir, 'overlay.png');
            var stateJsonPath = path.join(shareDir, 'state.json');

            var buf = exportTransparentPngBuffer('current', 1080, 1920);
            fs.writeFile(overlayPngPath, buf, function () {});

            state.floatingOverlayRev++;
            var payload = JSON.stringify({
                visible: state.floatingOverlayVisible,
                edit: state.floatingOverlayEdit,
                host: state.hostApp || 'PPRO',
                platform: state.platform,
                rev: state.floatingOverlayRev,
                quit: false
            });
            fs.writeFile(stateJsonPath, payload, 'utf8', function () {});
        } catch (e) {}
    }

    function launchFloatingOverlayApp(enableEditMode) {
        if (!childProcess || !path || !os) {
            showStatus('Masaüstü Overlay yalnızca macOS üzerinde desteklenir.', 'error');
            return;
        }
        var shareDir = getSharedDir();
        ensureDir(shareDir);

        if (enableEditMode) {
            state.floatingOverlayVisible = true;
            state.floatingOverlayEdit = true;
        } else {
            state.floatingOverlayVisible = !state.floatingOverlayVisible;
            if (!state.floatingOverlayVisible) {
                state.floatingOverlayEdit = false;
            }
        }

        if (btnLaunchOverlay && overlayBtnText) {
            btnLaunchOverlay.classList.toggle('active', state.floatingOverlayVisible);
            overlayBtnText.textContent = state.floatingOverlayVisible ? 'Ekran Üstü Overlay: Açık' : 'Ekran Üstü Overlay Aç';
        }

        publishToFloatingOverlay();

        var appCandidate1 = path.join(shareDir, 'Alptuguide Overlay.app');
        var appCandidate2 = '/Applications/Alptuguide.app';
        var targetApp = (fs && fs.existsSync(appCandidate2)) ? appCandidate2 : appCandidate1;

        if (fs && fs.existsSync(targetApp)) {
            childProcess.exec('open -a "' + targetApp + '"', function () {});
            if (enableEditMode) {
                showStatus('Overlay hizalama modu açıldı (Kilitlemek için Enter\'a basın).', 'success');
            } else if (state.floatingOverlayVisible) {
                showStatus('Ekran üstü şeffaf Overlay aktif (Render\'a girmez).', 'success');
            } else {
                showStatus('Ekran üstü Overlay gizlendi.', 'success');
            }
        } else {
            showStatus('Alptuguide Overlay.app bulunamadı.', 'error');
        }
    }

    function updatePlatformUI() {
        var meta = PLATFORM_META[state.platform] || PLATFORM_META.reels;

        for (var i = 0; i < tabButtons.length; i++) {
            var btn = tabButtons[i];
            var p = btn.getAttribute('data-platform');
            btn.classList.toggle('active', p === state.platform);
        }

        if (previewPlatformTitle) previewPlatformTitle.textContent = meta.title;
        if (guideActiveDesc) guideActiveDesc.textContent = meta.guideDesc;
        if (btnGuidesText) btnGuidesText.textContent = meta.btnGuide;
        if (followToggleLabel) followToggleLabel.textContent = meta.followLabel;
        if (followToggleDesc) followToggleDesc.textContent = meta.followDesc;
        if (audioInputLabel) audioInputLabel.textContent = meta.audioLabel;
        if (metricLikeText) metricLikeText.textContent = meta.likeText;
        if (metricShareText) metricShareText.textContent = meta.shareText;
        if (metricBoxSaves) {
            metricBoxSaves.style.display = meta.showSaves ? '' : 'none';
        }

        if (specPlatformName && specMetricsText) {
            var scaleX = (state.seqWidth || 1080) / 1080;
            var scaleY = (state.seqHeight || 1920) / 1920;
            if (typeof AlptuguideSafeZones !== 'undefined' && (scaleX !== 1 || scaleY !== 1)) {
                var z = AlptuguideSafeZones.getScaledSpec(state.platform, state.seqWidth, state.seqHeight);
                specPlatformName.textContent = z.label + ' (' + state.seqWidth + '×' + state.seqHeight + '):';
                specMetricsText.textContent = 'Üst ' + z.top + 'px · Alt ' + z.bottom + 'px (' + z.bottomOrganic + 'px UI) · Sağ ' + z.right + 'px · Sol ' + z.left + 'px';
            } else {
                specPlatformName.textContent = meta.specTitle;
                specMetricsText.textContent = meta.specText;
            }
        }
    }

    function refreshSequenceMetadata(callback) {
        evalExtendScript('getSequenceDetails()', function (res) {
            try {
                var data = JSON.parse(res);
                if (data && data.ok) {
                    state.seqWidth = Number(data.width) || 1080;
                    state.seqHeight = Number(data.height) || 1920;
                    state.hostApp = data.host || 'PPRO';
                    if (seqAspectBadge) {
                        seqAspectBadge.textContent = data.is916 ? '9:16 Dikey' : (data.is169 ? '16:9 Yatay' : 'Özel Oran');
                    }
                    if (seqDimText) {
                        seqDimText.textContent = state.seqWidth + ' × ' + state.seqHeight + ' px · ' + (data.name || 'Aktif Sekans');
                    }
                    updatePlatformUI();
                } else if (data && data.message) {
                    if (seqDimText) seqDimText.textContent = data.message;
                }
            } catch (e) {}
            if (callback) callback();
        });
    }

    // Asynchronous, non-blocking PNG completion waiter (0% main-thread block!)
    function waitForPngAndLoad(candidates, maxAttempts, delayMs, onLoaded) {
        if (!fs || !candidates || candidates.length === 0) {
            onLoaded(false);
            return;
        }
        var attempt = 0;

        function checkNext() {
            attempt++;
            var foundPath = null;

            for (var i = 0; i < candidates.length; i++) {
                var p = candidates[i];
                try {
                    if (fs.existsSync(p)) {
                        var st = fs.statSync(p);
                        if (st && st.size > 512) {
                            foundPath = p;
                            break;
                        }
                    }
                } catch (e) {}
            }

            if (foundPath) {
                fs.readFile(foundPath, function (err, buf) {
                    if (!err && buf && buf.length > 512) {
                        // Verify PNG IEND marker at tail
                        var tail = buf.slice(buf.length - 8, buf.length - 4).toString('ascii');
                        if (tail === 'IEND' || attempt >= maxAttempts) {
                            fs.unlink(foundPath, function () {});
                            var b64 = buf.toString('base64');
                            var img = new Image();
                            img.onload = function () {
                                state.videoFrameImage = img;
                                scheduleRender(false);
                                onLoaded(true);
                            };
                            img.onerror = function () {
                                onLoaded(false);
                            };
                            img.src = 'data:image/png;base64,' + b64;
                            return;
                        }
                    }
                    if (attempt < maxAttempts) {
                        setTimeout(checkNext, delayMs);
                    } else {
                        if (foundPath) fs.unlink(foundPath, function () {});
                        onLoaded(false);
                    }
                });
            } else if (attempt < maxAttempts) {
                setTimeout(checkNext, delayMs);
            } else {
                onLoaded(false);
            }
        }

        setTimeout(checkNext, 25);
    }

    function captureLiveFrameNow(forceManual) {
        if (isCapturingFrame) return;
        if (!forceManual && (!state.liveMirrorActive || document.hidden)) return;

        isCapturingFrame = true;
        if (liveBadgeText) liveBadgeText.textContent = 'Monitör: Senkron';

        evalExtendScript('captureFrameToTempPath()', function (res) {
            try {
                var data = JSON.parse(res);
                if (data && data.ok) {
                    var cands = data.candidates || (data.path ? [data.path] : []);
                    waitForPngAndLoad(cands, 22, 35, function (ok) {
                        isCapturingFrame = false;
                        if (liveBadgeText) {
                            liveBadgeText.textContent = ok ? 'Monitör: Canlı' : 'Monitör: Hazır';
                        }
                    });
                    return;
                }
            } catch (e) {}
            isCapturingFrame = false;
            if (liveBadgeText) liveBadgeText.textContent = 'Monitör: Hazır';
        });
    }

    // Smart Playhead Settle Watcher:
    // Never interrupts Premiere Pro / After Effects while the editor is actively scrubbing or playing!
    // Only captures a frame after the playhead has come to rest at a new position.
    function pollPlayheadSettle() {
        if (!state.liveMirrorActive || document.hidden || isCapturingFrame) return;

        evalExtendScript('getPlayheadState()', function (res) {
            if (!res) return;
            try {
                var data = JSON.parse(res);
                if (!data || !data.ok) return;

                if (data.width && data.height && (data.width !== state.seqWidth || data.height !== state.seqHeight)) {
                    state.seqWidth = Number(data.width) || 1080;
                    state.seqHeight = Number(data.height) || 1920;
                    state.hostApp = data.host || state.hostApp;
                    updatePlatformUI();
                }

                var posKey = String(data.ticks !== undefined ? data.ticks : data.time);
                if (posKey === lastObservedPos && posKey !== lastCapturedPos) {
                    // Playhead has settled at a new position -> safe to capture frame without stutter!
                    lastCapturedPos = posKey;
                    captureLiveFrameNow(false);
                }
                lastObservedPos = posKey;
            } catch (e) {}
        });
    }

    function syncProgramMonitorLayer() {
        if (!fs || !path) return;
        refreshSequenceMetadata(function () {
            var shareDir = getSharedDir();
            ensureDir(shareDir);
            var liveFile = path.join(shareDir, 'Alptuguide_Live_Preview.png');
            try {
                var buf = exportTransparentPngBuffer('current', state.seqWidth, state.seqHeight);
                fs.writeFileSync(liveFile, buf);
                var escaped = liveFile.replace(/\\/g, '/');
                evalExtendScript('initOrUpdateProgramMonitor("' + escaped + '")', function (res) {
                    if (res === 'OK') {
                        showStatus('Program Monitörü ve Sekans senkronize edildi.', 'success');
                    } else if (res) {
                        showStatus(res, 'error');
                    }
                    captureLiveFrameNow(true);
                });
            } catch (e) {
                showStatus('Senkronizasyon hatası: ' + e.message, 'error');
            }
        });
    }

    function insertLayerToTimeline(mode) {
        if (!fs || !path) return;
        refreshSequenceMetadata(function () {
            var shareDir = getSharedDir();
            ensureDir(shareDir);
            var suffix = (mode === 'guides_only') ? ('Guides_' + state.platform.toUpperCase()) : ('Overlay_' + state.platform.toUpperCase());
            var fileName = 'Alptuguide_' + suffix + '_' + state.seqWidth + 'x' + state.seqHeight + '.png';
            var outPath = path.join(shareDir, fileName);

            try {
                var buf = exportTransparentPngBuffer(mode, state.seqWidth, state.seqHeight);
                fs.writeFileSync(outPath, buf);
                var escaped = outPath.replace(/\\/g, '/');
                var label = (mode === 'guides_only')
                    ? ('Alptuguide 1:1 Kılavuz (' + state.platform.toUpperCase() + ')')
                    : ('Alptuguide Overlay (' + state.platform.toUpperCase() + ')');

                evalExtendScript('insertClipPermanent("' + escaped + '", "' + label + '")', function (res) {
                    if (res === 'OK') {
                        showStatus(label + ' timeline\'a eklendi (' + state.seqWidth + '×' + state.seqHeight + ').', 'success');
                    } else {
                        showStatus(res || 'Timeline\'a eklenemedi.', 'error');
                    }
                });
            } catch (e) {
                showStatus('Dosya oluşturma hatası: ' + e.message, 'error');
            }
        });
    }

    function exportPngToDesktop() {
        if (!fs || !path || !os) return;
        try {
            var desktopDir = path.join(os.homedir(), 'Desktop');
            var fileName = 'Alptuguide_' + state.platform + '_' + state.seqWidth + 'x' + state.seqHeight + '_' + Date.now() + '.png';
            var outPath = path.join(desktopDir, fileName);
            var buf = exportTransparentPngBuffer('current', state.seqWidth, state.seqHeight);
            fs.writeFileSync(outPath, buf);
            showStatus('Masaüstüne kaydedildi: ' + fileName, 'success');
        } catch (e) {
            showStatus('PNG kaydetme hatası: ' + e.message, 'error');
        }
    }

    function cleanTimelineLayers() {
        evalExtendScript('cleanAllPreviewClips()', function (res) {
            if (res && res.indexOf('OK:') === 0) {
                var count = res.split(':')[1] || '0';
                showStatus('Timeline temizlendi (' + count + ' Alptuguide katmanı kaldırıldı).', 'success');
            } else {
                showStatus('Temizlenecek aktif sekans/katman bulunamadı.', 'error');
            }
        });
    }

    // Persistence & Presets
    function saveStateToStorage() {
        try {
            var serializable = {
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
                avatarDataUrl: state.avatarDataUrl
            };
            localStorage.setItem(STORAGE_STATE_KEY, JSON.stringify(serializable));
        } catch (e) {}
    }

    function loadStateFromStorage() {
        try {
            var raw = localStorage.getItem(STORAGE_STATE_KEY);
            if (!raw) return;
            var parsed = JSON.parse(raw);
            if (!parsed) return;

            if (parsed.platform && PLATFORM_META[parsed.platform]) state.platform = parsed.platform;
            if (typeof parsed.username === 'string') state.username = parsed.username;
            if (typeof parsed.isVerified === 'boolean') state.isVerified = parsed.isVerified;
            if (typeof parsed.showFollow === 'boolean') state.showFollow = parsed.showFollow;
            if (typeof parsed.caption === 'string') state.caption = parsed.caption;
            if (typeof parsed.audioName === 'string') state.audioName = parsed.audioName;
            if (typeof parsed.likesCount === 'string') state.likesCount = parsed.likesCount;
            if (typeof parsed.commentsCount === 'string') state.commentsCount = parsed.commentsCount;
            if (typeof parsed.savesCount === 'string') state.savesCount = parsed.savesCount;
            if (typeof parsed.sharesCount === 'string') state.sharesCount = parsed.sharesCount;
            if (typeof parsed.showSafeZones === 'boolean') state.showSafeZones = parsed.showSafeZones;
            if (typeof parsed.showSubtitleZone === 'boolean') state.showSubtitleZone = parsed.showSubtitleZone;
            if (typeof parsed.showMockUi === 'boolean') state.showMockUi = parsed.showMockUi;
            if (typeof parsed.overlayOpacity === 'number') state.overlayOpacity = parsed.overlayOpacity;
            if (typeof parsed.avatarDataUrl === 'string' && parsed.avatarDataUrl) {
                state.avatarDataUrl = parsed.avatarDataUrl;
            }
        } catch (e) {}
    }

    function syncInputsFromState() {
        if (inputUsername) inputUsername.value = state.username;
        if (checkVerified) checkVerified.checked = state.isVerified;
        if (checkFollow) checkFollow.checked = state.showFollow;
        if (inputCaption) inputCaption.value = state.caption;
        if (inputAudio) inputAudio.value = state.audioName;
        if (inputLikes) inputLikes.value = state.likesCount;
        if (inputComments) inputComments.value = state.commentsCount;
        if (inputSaves) inputSaves.value = state.savesCount;
        if (inputShares) inputShares.value = state.sharesCount;
        if (checkSafeZones) checkSafeZones.checked = state.showSafeZones;
        if (checkSubtitleZone) checkSubtitleZone.checked = state.showSubtitleZone;
        if (checkShowUi) checkShowUi.checked = state.showMockUi;
        if (inputOpacity) {
            var pct = Math.round(state.overlayOpacity * 100);
            inputOpacity.value = String(pct);
            if (opacityValText) opacityValText.textContent = pct + '%';
        }
        loadAvatarImage(state.avatarDataUrl);
        updatePlatformUI();
    }

    function loadAvatarImage(src) {
        if (!src) return;
        var img = new Image();
        img.onload = function () {
            state.avatarImage = img;
            if (avatarImgPreview) avatarImgPreview.src = src;
            scheduleRender(true);
        };
        img.src = src;
    }

    function getPresets() {
        try {
            var raw = localStorage.getItem(STORAGE_PRESETS_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    }

    function savePresets(presets) {
        try {
            localStorage.setItem(STORAGE_PRESETS_KEY, JSON.stringify(presets));
        } catch (e) {}
    }

    function renderPresetOptions(selectedKey) {
        if (!presetSelector) return;
        var presets = getPresets();
        presetSelector.innerHTML = '<option value="__default__">Varsayılan (@alptugdag)</option>';
        var keys = Object.keys(presets);
        for (var i = 0; i < keys.length; i++) {
            var k = keys[i];
            var opt = document.createElement('option');
            opt.value = k;
            opt.textContent = '@' + k;
            if (k === selectedKey) opt.selected = true;
            presetSelector.appendChild(opt);
        }
    }

    function bindEvents() {
        // Platform Tabs
        for (var i = 0; i < tabButtons.length; i++) {
            tabButtons[i].addEventListener('click', function () {
                var p = this.getAttribute('data-platform');
                if (p && PLATFORM_META[p]) {
                    state.platform = p;
                    updatePlatformUI();
                    scheduleRender(true);
                }
            });
        }

        // Live Monitor Toggle & Force Refresh
        if (btnToggleLive) {
            btnToggleLive.addEventListener('click', function () {
                state.liveMirrorActive = !state.liveMirrorActive;
                btnToggleLive.classList.toggle('active', state.liveMirrorActive);
                btnToggleLive.classList.toggle('paused', !state.liveMirrorActive);
                if (liveToggleText) {
                    liveToggleText.textContent = state.liveMirrorActive ? 'Canlı Monitör: Açık' : 'Canlı Monitör: Duraklatıldı';
                }
                if (state.liveMirrorActive) {
                    captureLiveFrameNow(true);
                }
            });
        }

        if (btnForceRefresh) {
            btnForceRefresh.addEventListener('click', function () {
                refreshSequenceMetadata(function () {
                    captureLiveFrameNow(true);
                });
            });
        }

        if (btnSyncMonitor) {
            btnSyncMonitor.addEventListener('click', function () {
                syncProgramMonitorLayer();
            });
        }

        if (checkLiveMonitor) {
            checkLiveMonitor.addEventListener('change', function () {
                state.programMonitorLayerActive = this.checked;
                evalExtendScript('togglePreviewVisibility(' + (this.checked ? 'true' : 'false') + ')');
            });
        }

        // Safe Zones, Subtitle Zone, Mock UI, Opacity
        if (checkSafeZones) {
            checkSafeZones.addEventListener('change', function () {
                state.showSafeZones = this.checked;
                scheduleRender(true);
            });
        }

        if (checkSubtitleZone) {
            checkSubtitleZone.addEventListener('change', function () {
                state.showSubtitleZone = this.checked;
                scheduleRender(true);
            });
        }

        if (checkShowUi) {
            checkShowUi.addEventListener('change', function () {
                state.showMockUi = this.checked;
                scheduleRender(true);
            });
        }

        if (inputOpacity) {
            inputOpacity.addEventListener('input', function () {
                var val = Number(this.value) || 100;
                state.overlayOpacity = Math.max(0.2, Math.min(1.0, val / 100));
                if (opacityValText) opacityValText.textContent = val + '%';
                scheduleRender(true);
            });
        }

        // Floating Overlay Controls
        if (btnLaunchOverlay) {
            btnLaunchOverlay.addEventListener('click', function () {
                launchFloatingOverlayApp(false);
            });
        }

        if (btnAlignOverlay) {
            btnAlignOverlay.addEventListener('click', function () {
                launchFloatingOverlayApp(true);
            });
        }

        // Profile & Text Inputs
        if (inputUsername) {
            inputUsername.addEventListener('input', function () {
                state.username = this.value.replace(/^@+/, '').trim() || 'kullanici';
                scheduleRender(true);
            });
        }

        if (checkVerified) {
            checkVerified.addEventListener('change', function () {
                state.isVerified = this.checked;
                scheduleRender(true);
            });
        }

        if (checkFollow) {
            checkFollow.addEventListener('change', function () {
                state.showFollow = this.checked;
                scheduleRender(true);
            });
        }

        if (inputCaption) {
            inputCaption.addEventListener('input', function () {
                state.caption = this.value;
                scheduleRender(true);
            });
        }

        if (inputAudio) {
            inputAudio.addEventListener('input', function () {
                state.audioName = this.value;
                scheduleRender(true);
            });
        }

        if (inputLikes) {
            inputLikes.addEventListener('input', function () {
                state.likesCount = this.value;
                scheduleRender(true);
            });
        }

        if (inputComments) {
            inputComments.addEventListener('input', function () {
                state.commentsCount = this.value;
                scheduleRender(true);
            });
        }

        if (inputSaves) {
            inputSaves.addEventListener('input', function () {
                state.savesCount = this.value;
                scheduleRender(true);
            });
        }

        if (inputShares) {
            inputShares.addEventListener('input', function () {
                state.sharesCount = this.value;
                scheduleRender(true);
            });
        }

        // Avatar Upload
        if (avatarInput) {
            avatarInput.addEventListener('change', function () {
                var file = this.files && this.files[0];
                if (!file) return;
                if (avatarName) avatarName.textContent = file.name;
                var reader = new FileReader();
                reader.onload = function (ev) {
                    state.avatarDataUrl = ev.target.result;
                    loadAvatarImage(state.avatarDataUrl);
                };
                reader.readAsDataURL(file);
            });
        }

        // Presets
        if (btnSavePreset) {
            btnSavePreset.addEventListener('click', function () {
                var key = (state.username || 'profil').trim().toLowerCase();
                var presets = getPresets();
                presets[key] = {
                    username: state.username,
                    isVerified: state.isVerified,
                    showFollow: state.showFollow,
                    caption: state.caption,
                    audioName: state.audioName,
                    likesCount: state.likesCount,
                    commentsCount: state.commentsCount,
                    savesCount: state.savesCount,
                    sharesCount: state.sharesCount,
                    avatarDataUrl: state.avatarDataUrl
                };
                savePresets(presets);
                renderPresetOptions(key);
                showStatus('@' + key + ' profili kaydedildi.', 'success');
            });
        }

        if (presetSelector) {
            presetSelector.addEventListener('change', function () {
                var key = this.value;
                if (key === '__default__') {
                    state.username = 'alptugdag';
                    state.isVerified = true;
                    state.showFollow = true;
                    state.caption = 'Bu eklenti @alptugdag tarafından yapılmıştır, destek için takip edebilirsin, kolay gelsin!';
                    state.audioName = 'alptugdag · Orijinal Ses';
                    state.avatarDataUrl = 'assets/sample_avatar.png';
                } else {
                    var presets = getPresets();
                    var p = presets[key];
                    if (p) {
                        state.username = p.username || key;
                        state.isVerified = Boolean(p.isVerified);
                        state.showFollow = Boolean(p.showFollow);
                        state.caption = p.caption || '';
                        state.audioName = p.audioName || '';
                        state.likesCount = p.likesCount || '12.4K';
                        state.commentsCount = p.commentsCount || '348';
                        state.savesCount = p.savesCount || '9.8K';
                        state.sharesCount = p.sharesCount || '1.2K';
                        state.avatarDataUrl = p.avatarDataUrl || 'assets/sample_avatar.png';
                    }
                }
                syncInputsFromState();
            });
        }

        if (btnDeletePreset) {
            btnDeletePreset.addEventListener('click', function () {
                if (!presetSelector || presetSelector.value === '__default__') return;
                var key = presetSelector.value;
                var presets = getPresets();
                delete presets[key];
                savePresets(presets);
                renderPresetOptions('__default__');
                showStatus('@' + key + ' profili silindi.', 'success');
            });
        }

        // Primary Action Buttons
        if (btnInsertOverlay) {
            btnInsertOverlay.addEventListener('click', function () {
                insertLayerToTimeline('current');
            });
        }

        if (btnInsertGuides) {
            btnInsertGuides.addEventListener('click', function () {
                insertLayerToTimeline('guides_only');
            });
        }

        if (btnExportPng) {
            btnExportPng.addEventListener('click', function () {
                exportPngToDesktop();
            });
        }

        if (btnCleanTimeline) {
            btnCleanTimeline.addEventListener('click', function () {
                cleanTimelineLayers();
            });
        }
    }

    function init() {
        loadStateFromStorage();
        renderPresetOptions('__default__');
        syncInputsFromState();
        bindEvents();
        scheduleRender(true);

        // Initial Sequence Check
        setTimeout(function () {
            refreshSequenceMetadata(function () {
                captureLiveFrameNow(false);
            });
        }, 400);

        // Non-intrusive Playhead Settle Watcher (every 1400ms, zero lock during scrubbing)
        setInterval(pollPlayheadSettle, 1400);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

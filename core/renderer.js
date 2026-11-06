/**
 * Alptuguide Studio — High-Precision Platform Overlay & Safe-Zone Renderer
 * Copyright (c) 2026 Alptuğ Dağ (@alptugdag). All rights reserved.
 */
(function (root, factory) {
    var L = (root && root.ReelsLayout) || (typeof window !== 'undefined' && window.ReelsLayout) ||
        (typeof require !== 'undefined' ? require('./layout.js') : null);
    var Z = (root && root.AlptuguideSafeZones) || (typeof window !== 'undefined' && window.AlptuguideSafeZones) ||
        (typeof require !== 'undefined' ? require('./safezones.js') : null);
    var api = factory(L, Z);
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (typeof window !== 'undefined') window.ReelsRenderer = api;
    else if (root) root.ReelsRenderer = api;
}(typeof self !== 'undefined' ? self : this, function (L, Z) {
    var WHITE = '#ffffff';
    var MORE = ' ... devamını oku';
    var P2D = typeof Path2D !== 'undefined' ? Path2D : null;
    var _pathCache = {};

    function getPath2D(d) {
        if (!P2D) return null;
        if (!_pathCache[d]) _pathCache[d] = new P2D(d);
        return _pathCache[d];
    }

    function font(ctx, weight, size) {
        ctx.font = weight + ' ' + size + 'px Montserrat, -apple-system, Inter, "Helvetica Neue", Arial, sans-serif';
    }

    function roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    function icon(ctx, name, cx, cy, size, opts) {
        opts = opts || {};
        var paths = L.icons[name];
        if (!paths || !P2D) return;
        var filled = !!L.filledIcons[name];
        ctx.save();
        ctx.translate(cx - size / 2, cy - size / 2);
        ctx.scale(size / 24, size / 24);
        if (opts.shadow !== false) {
            ctx.shadowColor = 'rgba(0,0,0,0.45)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetY = 2;
        }
        ctx.lineWidth = opts.lineWidth || 1.9;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = ctx.fillStyle = opts.color || WHITE;
        for (var i = 0; i < paths.length; i++) {
            var p = getPath2D(paths[i]);
            if (p) {
                if (filled) ctx.fill(p); else ctx.stroke(p);
            }
        }
        ctx.restore();
    }

    function wrapCaption(ctx, text, maxWidth, maxLines) {
        var words = String(text || '').trim().split(/\s+/).filter(Boolean);
        if (!words.length) return { lines: [], truncated: false, lineCount: 0 };
        var lines = [], line = words[0];
        for (var i = 1; i < words.length; i++) {
            var test = line + ' ' + words[i];
            if (ctx.measureText(test).width <= maxWidth) { line = test; continue; }
            lines.push(line);
            line = words[i];
            if (lines.length === maxLines - 1) {
                var rest = words.slice(i).join(' ');
                if (ctx.measureText(rest).width <= maxWidth) {
                    lines.push(rest);
                    return { lines: lines, truncated: false, lineCount: lines.length };
                }
                var room = maxWidth - ctx.measureText(MORE).width, fit = '';
                for (var j = i; j < words.length; j++) {
                    var t = fit ? fit + ' ' + words[j] : words[j];
                    if (ctx.measureText(t).width <= room) fit = t; else break;
                }
                if (!fit) {
                    fit = words[i];
                    while (fit.length > 1 && ctx.measureText(fit + MORE).width > maxWidth) fit = fit.slice(0, -1);
                }
                lines.push(fit + MORE);
                return { lines: lines, truncated: true, lineCount: lines.length };
            }
        }
        lines.push(line);
        return { lines: lines, truncated: false, lineCount: lines.length };
    }

    var _gradCache = {};

    function gradients(ctx, p) {
        var key = p.id || 'reels';
        var cached = _gradCache[key];
        var b = p.gradients.bottom, t = p.gradients.top;
        if (!cached && typeof ctx.createLinearGradient === 'function') {
            var g = ctx.createLinearGradient(0, b.y0, 0, b.y1);
            g.addColorStop(0, 'rgba(0,0,0,' + b.a0 + ')');
            g.addColorStop(0.5, 'rgba(0,0,0,' + (b.a1 * 0.45).toFixed(3) + ')');
            g.addColorStop(1, 'rgba(0,0,0,' + b.a1 + ')');
            var g2 = ctx.createLinearGradient(0, t.y0, 0, t.y1);
            g2.addColorStop(0, 'rgba(0,0,0,' + t.a0 + ')');
            g2.addColorStop(1, 'rgba(0,0,0,' + t.a1 + ')');
            cached = { bottom: g, top: g2 };
            _gradCache[key] = cached;
        }
        if (cached) {
            ctx.fillStyle = cached.bottom;
            ctx.fillRect(0, b.y0, L.W, b.y1 - b.y0);
            ctx.fillStyle = cached.top;
            ctx.fillRect(0, t.y0, L.W, t.y1 - t.y0);
        }
    }

    function cover(ctx, img, x, y, w, h) {
        var iw = img.naturalWidth || img.width || 100, ih = img.naturalHeight || img.height || 100;
        var s = Math.max(w / iw, h / ih);
        ctx.drawImage(img, x + (w - iw * s) / 2, y + (h - ih * s) / 2, iw * s, ih * s);
    }

    function hasImage(img) {
        return !!(img && (img.naturalWidth || img.width));
    }

    function placeholder(ctx, x, y, size, name) {
        var g = ctx.createLinearGradient(x, y, x + size, y + size);
        g.addColorStop(0, '#feda75');
        g.addColorStop(0.35, '#fa7e1e');
        g.addColorStop(0.65, '#d62976');
        g.addColorStop(1, '#4f5bd5');
        ctx.fillStyle = g;
        ctx.fillRect(x, y, size, size);
        ctx.fillStyle = WHITE;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        font(ctx, 700, Math.round(size * 0.42));
        ctx.fillText(String(name || 'A').charAt(0).toUpperCase(), x + size / 2, y + size / 2 + 1);
    }

    function avatarCircle(ctx, img, cx, cy, d, name) {
        var r = d / 2;
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        if (hasImage(img)) cover(ctx, img, cx - r, cy - r, d, d); else placeholder(ctx, cx - r, cy - r, d, name);
        ctx.restore();
    }

    function roundedThumb(ctx, img, cx, cy, size, radius, name) {
        ctx.save();
        roundRect(ctx, cx - size / 2, cy - size / 2, size, size, radius);
        ctx.clip();
        if (hasImage(img)) cover(ctx, img, cx - size / 2, cy - size / 2, size, size);
        else placeholder(ctx, cx - size / 2, cy - size / 2, size, name);
        ctx.restore();
        ctx.save();
        roundRect(ctx, cx - size / 2, cy - size / 2, size, size, radius);
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.stroke();
        ctx.restore();
    }

    function pillButton(ctx, x, cy, text, bg, fg) {
        var h = 52, padX = 22;
        ctx.save();
        font(ctx, 600, 26);
        var w = Math.round(ctx.measureText(text).width + padX * 2);
        if (bg) {
            ctx.fillStyle = bg;
            roundRect(ctx, x, cy - h / 2, w, h, h / 2);
            ctx.fill();
        } else {
            roundRect(ctx, x + 1.5, cy - h / 2 + 1.5, w - 3, h - 3, 12);
            ctx.lineWidth = 2.6;
            ctx.strokeStyle = 'rgba(255,255,255,0.92)';
            ctx.stroke();
        }
        ctx.fillStyle = fg || WHITE;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x + w / 2, cy + 1);
        ctx.restore();
        return w;
    }

    function verifiedBadge(ctx, cx, cy, size) {
        if (!P2D) return;
        ctx.save();
        ctx.translate(cx - size / 2, cy - size / 2);
        ctx.scale(size / 24, size / 24);
        ctx.fillStyle = '#3797f0';
        var p0 = getPath2D(L.icons['badge-check'][0]);
        var p1 = getPath2D(L.icons['badge-check'][1]);
        if (p0) ctx.fill(p0);
        ctx.lineWidth = 2.4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = WHITE;
        if (p1) ctx.stroke(p1);
        ctx.restore();
    }

    function musicDisc(ctx, cx, cy, d, img, name) {
        var r = d / 2;
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = '#141414';
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#2e2e2e';
        ctx.stroke();
        var ir = r * 0.44;
        ctx.beginPath();
        ctx.arc(cx, cy, ir, 0, Math.PI * 2);
        ctx.clip();
        if (hasImage(img)) cover(ctx, img, cx - ir, cy - ir, ir * 2, ir * 2); else placeholder(ctx, cx - ir, cy - ir, ir * 2, name);
        ctx.restore();
    }

    function drawBottomNav(ctx, id, p, avatar, user) {
        var navY = p.navBarY || 1810;
        var navH = L.H - navY;
        ctx.save();
        ctx.fillStyle = 'rgba(6, 6, 8, 0.94)';
        ctx.fillRect(0, navY, L.W, navH);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, navY);
        ctx.lineTo(L.W, navY);
        ctx.stroke();

        var iconCy = navY + Math.round((navH - 28) * 0.46);
        if (id === 'reels') {
            icon(ctx, 'home', 120, iconCy, 44, { shadow: false });
            icon(ctx, 'search', 330, iconCy, 44, { shadow: false });
            icon(ctx, 'plus', 540, iconCy, 46, { shadow: false });
            icon(ctx, 'clapper', 750, iconCy, 44, { shadow: false });
            avatarCircle(ctx, avatar, 960, iconCy, 44, user);
        } else if (id === 'tiktok') {
            var tabs = ['Ana Sayfa', 'Arkadaşlar', '', 'Gelen Kutusu', 'Profil'];
            var xs = [115, 315, 540, 765, 965];
            font(ctx, 600, 22);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            for (var i = 0; i < tabs.length; i++) {
                if (i === 2) {
                    // TikTok Create Button
                    roundRect(ctx, 540 - 50, iconCy - 22, 92, 52, 14);
                    ctx.fillStyle = '#00f2ea';
                    ctx.fill();
                    roundRect(ctx, 540 - 42, iconCy - 22, 92, 52, 14);
                    ctx.fillStyle = '#ff0050';
                    ctx.fill();
                    roundRect(ctx, 540 - 46, iconCy - 22, 84, 52, 14);
                    ctx.fillStyle = WHITE;
                    ctx.fill();
                    icon(ctx, 'plus', 540, iconCy + 4, 34, { color: '#000000', shadow: false, lineWidth: 2.5 });
                } else {
                    ctx.fillStyle = i === 0 ? WHITE : 'rgba(255,255,255,0.58)';
                    ctx.fillText(tabs[i], xs[i], iconCy + 24);
                }
            }
            icon(ctx, 'home', 115, iconCy - 14, 38, { shadow: false });
            icon(ctx, 'user', 315, iconCy - 14, 38, { shadow: false, color: 'rgba(255,255,255,0.65)' });
            icon(ctx, 'message-circle', 765, iconCy - 14, 38, { shadow: false, color: 'rgba(255,255,255,0.65)' });
            icon(ctx, 'user', 965, iconCy - 14, 38, { shadow: false, color: 'rgba(255,255,255,0.65)' });
        } else if (id === 'shorts') {
            // YouTube Shorts Red Progress Scrubber Line
            ctx.fillStyle = 'rgba(255,255,255,0.28)';
            ctx.fillRect(0, navY, L.W, 4);
            ctx.fillStyle = '#ff0033';
            ctx.fillRect(0, navY, Math.round(L.W * 0.62), 4);

            var sTabs = ['Ana Sayfa', 'Shorts', '', 'Abonelikler', 'Siz'];
            var sXs = [115, 315, 540, 765, 965];
            font(ctx, 500, 21);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            for (var j = 0; j < sTabs.length; j++) {
                if (j === 2) {
                    ctx.beginPath();
                    ctx.arc(540, iconCy + 4, 32, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(255,255,255,0.16)';
                    ctx.fill();
                    icon(ctx, 'plus', 540, iconCy + 4, 36, { shadow: false });
                } else {
                    ctx.fillStyle = j === 1 ? WHITE : 'rgba(255,255,255,0.65)';
                    ctx.fillText(sTabs[j], sXs[j], iconCy + 26);
                }
            }
            icon(ctx, 'home', 115, iconCy - 12, 36, { shadow: false, color: 'rgba(255,255,255,0.65)' });
            icon(ctx, 'clapper', 315, iconCy - 12, 36, { shadow: false });
            icon(ctx, 'bookmark', 765, iconCy - 12, 36, { shadow: false, color: 'rgba(255,255,255,0.65)' });
            avatarCircle(ctx, avatar, 965, iconCy - 12, 38, user);
        }

        // iOS Home Indicator Pill
        roundRect(ctx, (L.W - 360) / 2, L.H - 22, 360, 10, 5);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
        ctx.fill();
        ctx.restore();
    }

    function subtitleLine(ctx, y, truncated, lineCount) {
        y = Math.round(y);
        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([14, 10]);
        ctx.moveTo(48, y);
        ctx.lineTo(L.W - 48, y);
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = '#00f2fe';
        ctx.shadowColor = 'rgba(0, 242, 254, 0.8)';
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.shadowBlur = 0;
        var label = 'ALTYAZI GÜVENLİ SINIRI · Y: ' + y + ' px';
        if (truncated) label += ' (MAKSİMUM CAPTION)';
        else if (lineCount <= 1) label += ' (1 SATIR CAPTION)';
        font(ctx, 700, 21);
        var tw = ctx.measureText(label).width, bx = (L.W - tw) / 2 - 18, by = y - 44;
        roundRect(ctx, bx, by, tw + 36, 36, 8);
        ctx.fillStyle = 'rgba(8, 18, 34, 0.92)';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#00f2fe';
        ctx.stroke();
        ctx.fillStyle = '#38bdf8';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, L.W / 2, by + 18);
        ctx.restore();
    }

    function header(ctx, id, p) {
        ctx.save();
        // Subtle status bar time & battery indicators at top (y: 54)
        font(ctx, 700, 28);
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('09:41', 64, 54);
        roundRect(ctx, 956, 40, 56, 26, 6);
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.stroke();
        ctx.fillStyle = '#34d399';
        ctx.fillRect(961, 45, 42, 16);

        ctx.fillStyle = WHITE;
        ctx.textBaseline = 'middle';
        if (id === 'reels') {
            ctx.textAlign = 'left';
            font(ctx, p.header.weight, p.header.size);
            ctx.fillText(p.header.title, p.header.x, p.header.cy);
            icon(ctx, 'camera', p.header.camera.cx, p.header.camera.cy, p.header.camera.size, { lineWidth: 1.9 });
        } else if (id === 'tiktok') {
            ctx.textAlign = 'center';
            font(ctx, 700, 35);
            ctx.fillStyle = 'rgba(255,255,255,0.62)';
            ctx.fillText(p.header.tabs[0], L.W / 2 - 132, p.header.cy);
            ctx.fillStyle = WHITE;
            ctx.fillText(p.header.tabs[1], L.W / 2 + 128, p.header.cy);
            roundRect(ctx, L.W / 2 + 78, p.header.cy + 26, 100, 6, 3);
            ctx.fill();
            icon(ctx, 'search', p.header.search.cx, p.header.search.cy, p.header.search.size);
        } else if (id === 'shorts') {
            ctx.textAlign = 'left';
            font(ctx, 700, 44);
            ctx.fillStyle = WHITE;
            ctx.fillText('Shorts', 48, p.header.search.cy);
            icon(ctx, 'search', p.header.search.cx, p.header.search.cy, p.header.search.size);
            icon(ctx, 'ellipsis-vertical', p.header.more.cx, p.header.more.cy, p.header.more.size);
        }
        ctx.restore();
    }

    function drawUi(ctx, id, cfg, assets) {
        var p = L.platforms[id] || L.platforms.reels;
        var avatar = assets && assets.avatar;
        var user = (cfg.username || 'alptugdag').replace(/^@+/, '');
        gradients(ctx, p);
        header(ctx, id, p);

        if (id === 'tiktok') {
            var a = p.avatarRight;
            avatarCircle(ctx, avatar, a.cx, a.cy, a.d, user);
            ctx.save();
            ctx.beginPath();
            ctx.arc(a.cx, a.cy, a.d / 2, 0, Math.PI * 2);
            ctx.lineWidth = 3.5;
            ctx.strokeStyle = WHITE;
            ctx.stroke();
            ctx.restore();
            if (cfg.showFollow) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(a.cx, a.cy + a.d / 2, 20, 0, Math.PI * 2);
                ctx.fillStyle = '#fe2c55';
                ctx.fill();
                ctx.fillStyle = WHITE;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                font(ctx, 700, 30);
                ctx.fillText('+', a.cx, a.cy + a.d / 2 + 1);
                ctx.restore();
            }
        }

        p.actions.forEach(function (act) {
            icon(ctx, act.icon, p.colX, act.cy, act.size);
            ctx.fillStyle = WHITE;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            font(ctx, 600, 27);
            var label = act.text || (act.key && cfg[act.key] != null ? String(cfg[act.key]) : '');
            ctx.fillText(label, p.colX, act.countCy);
        });

        if (id === 'reels') {
            icon(ctx, p.dots.icon, p.colX, p.dots.cy, p.dots.size);
            roundedThumb(ctx, avatar, p.colX, p.audioThumb.cy, p.audioThumb.size, p.audioThumb.radius, user);
        } else if (id === 'tiktok') {
            musicDisc(ctx, p.disc.cx, p.disc.cy, p.disc.size, avatar, user);
        } else if (id === 'shorts') {
            roundedThumb(ctx, avatar, p.soundThumb.cx, p.soundThumb.cy, p.soundThumb.size, p.soundThumb.radius, user);
        }

        var cap = p.caption;
        font(ctx, cap.weight, cap.size);
        var wrapped = wrapCaption(ctx, cfg.caption, cap.maxWidth, cap.maxLines);
        var n = wrapped.lineCount;
        var lastY = p.audio.cy - 54;
        var lineYs = [];
        for (var i = 0; i < n; i++) lineYs.push(lastY - (n - 1 - i) * cap.lineH);

        // Username/avatar row sits directly above the first caption line (above bottom nav bar)
        var topCaptionY = n > 0 ? lineYs[0] : (p.audio.cy - 10);
        var rowY = topCaptionY - 58;
        var subtitleY = rowY - 68;

        var u = p.username, name = (u.prefix || '') + user, x;
        if (p.avatar) avatarCircle(ctx, avatar, p.avatar.x + p.avatar.d / 2, rowY, p.avatar.d, user);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = WHITE;
        font(ctx, u.weight, u.size);
        ctx.fillText(name, u.x, rowY);
        x = u.x + ctx.measureText(name).width;
        if (cfg.verified) {
            var vs = p.verified ? p.verified.size : 28;
            verifiedBadge(ctx, x + 12 + vs / 2, rowY, vs);
            x += 12 + vs;
        }
        if (cfg.showFollow) {
            if (id === 'reels') pillButton(ctx, x + p.follow.gap, rowY, p.follow.text, null);
            else if (id === 'shorts') pillButton(ctx, x + p.subscribe.gap, rowY, p.subscribe.text, p.subscribe.bg, p.subscribe.fg);
        }

        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        font(ctx, cap.weight, cap.size);
        wrapped.lines.forEach(function (line, idx) {
            var y = lineYs[idx];
            var k = line.indexOf(MORE);
            ctx.fillStyle = WHITE;
            if (k >= 0) {
                var head = line.slice(0, k);
                ctx.fillText(head, cap.x, y);
                var hw = ctx.measureText(head).width;
                ctx.fillStyle = '#cbd5e1';
                font(ctx, 600, cap.size);
                ctx.fillText(MORE, cap.x + hw, y);
                font(ctx, cap.weight, cap.size);
            } else {
                ctx.fillText(line, cap.x, y);
            }
        });

        var au = p.audio;
        icon(ctx, au.icon, au.iconX + au.iconSize / 2, au.cy, au.iconSize, { lineWidth: 2.1, shadow: false });
        ctx.fillStyle = WHITE;
        font(ctx, au.weight, au.size);
        ctx.fillText(cfg.audio || '', au.textX, au.cy);

        drawBottomNav(ctx, id, p, avatar, user);

        return { subtitleY: subtitleY, truncated: wrapped.truncated, lineCount: n };
    }

    function watermark(ctx) {
        var c = L.copyright;
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        font(ctx, c.weight, c.size);
        ctx.fillText(c.text, c.x, c.cy);
        ctx.restore();
    }

    function drawOverlay(ctx, cfg, assets, size) {
        size = size || {};
        var w = size.width || L.W, h = size.height || L.H;
        var s = Math.min(w / L.W, h / L.H);
        var platform = cfg.platform || 'reels';
        var uiPlatform = platform === 'all' ? 'reels' : platform;
        var alpha = typeof cfg.opacity === 'number' ? Math.max(0.1, Math.min(1, cfg.opacity)) : 1;

        ctx.save();
        ctx.translate((w - L.W * s) / 2, (h - L.H * s) / 2);
        ctx.scale(s, s);
        var info = null;
        // 1. Sosyal Arayüz (Mock UI): Yalnızca kullanıcı 'Sosyal Arayüz'ü açtığında çizilir.
        if (cfg.showUi) {
            ctx.save();
            ctx.globalAlpha = platform === 'all' ? alpha * 0.88 : alpha;
            info = drawUi(ctx, uiPlatform, cfg, assets);
            ctx.restore();
        }

        // 2. Güvenli Alanlar: 'Güvenli Alan' çipi açıksa veya 'Ortak' sekmesi seçiliyse çizilir.
        if (Z && (cfg.showSafeZones || platform === 'all')) {
            ctx.save();
            ctx.globalAlpha = alpha;
            Z.draw(ctx, platform, {
                opacity: alpha,
                labels: cfg.showGuideLabels !== false,
                showSafeZones: true,
                showUiBoxes: !cfg.showUi
            });
            ctx.restore();
        }

        // 3. Altyazı Sınırı: Yalnızca 'Altyazı Sınırı' çipi açıksa çizilir.
        if (cfg.showSubtitleZone) {
            if (!info) {
                var p = L.platforms[uiPlatform] || L.platforms.reels;
                font(ctx, p.caption.weight, p.caption.size);
                var wrapped = wrapCaption(ctx, cfg.caption, p.caption.maxWidth, p.caption.maxLines);
                var n = wrapped.lineCount;
                var lastY = p.audio.cy - 54;
                var topCapY = n > 0 ? (lastY - (n - 1) * p.caption.lineH) : (p.audio.cy - 10);
                info = { subtitleY: topCapY - 58 - 68, truncated: wrapped.truncated, lineCount: n };
            }
            ctx.save();
            ctx.globalAlpha = alpha;
            subtitleLine(ctx, info.subtitleY, info.truncated, info.lineCount);
            ctx.restore();
        }
        if (cfg.showUi) watermark(ctx);
        ctx.restore();
    }

    function drawMediaCover(ctx, img, x, y, w, h) {
        if (!img) return;
        var iw = img.naturalWidth || img.width || w;
        var ih = img.naturalHeight || img.height || h;
        if (iw <= 0 || ih <= 0) return;
        var scale = Math.max(w / iw, h / ih);
        var dw = iw * scale;
        var dh = ih * scale;
        var dx = x + (w - dw) / 2;
        var dy = y + (h - dh) / 2;
        ctx.drawImage(img, dx, dy, dw, dh);
    }

    function render(canvas, state) {
        if (!canvas || !state) return;
        var w = state.targetWidth || canvas.width || L.W;
        var h = state.targetHeight || canvas.height || L.H;
        if (canvas.width !== w) canvas.width = w;
        if (canvas.height !== h) canvas.height = h;
        var ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, w, h);

        if (state.videoFrameImage) {
            drawMediaCover(ctx, state.videoFrameImage, 0, 0, w, h);
        }

        drawOverlay(ctx, {
            platform: state.platform || 'reels',
            username: state.username || 'alptugdag',
            verified: Boolean(state.isVerified),
            showFollow: Boolean(state.showFollow),
            caption: state.caption || '',
            audio: state.audioName || '',
            likes: state.likesCount || '0',
            comments: state.commentsCount || '0',
            saves: state.savesCount || '0',
            shares: state.sharesCount || '0',
            showSafeZones: Boolean(state.showSafeZones),
            showSubtitleZone: Boolean(state.showSubtitleZone),
            showUi: Boolean(state.showMockUi),
            showGuideLabels: true,
            opacity: typeof state.overlayOpacity === 'number' ? state.overlayOpacity : 1.0
        }, {
            avatar: state.avatarImage || null
        }, {
            width: w,
            height: h
        });
    }

    return {
        drawOverlay: drawOverlay,
        render: render,
        drawMediaCover: drawMediaCover,
        wrapCaption: wrapCaption,
        layout: L,
        safeZones: Z,
        author: 'Alptuğ Dağ',
        handle: '@alptugdag',
        plugin: 'Alptuguide'
    };
}));

/**
 * Alptuguide Studio — 1:1 Platform-Verified Safe Zone Specifications
 * Copyright (c) 2026 Alptuğ Dağ (@alptugdag). All rights reserved.
 *
 * Reference Canvas: 1080 × 1920 px (9:16 vertical video).
 * Automatically scales to any sequence/composition resolution (e.g., 2160 × 3840 4K).
 *
 * Verified against official platform specifications:
 *  1. Instagram Reels (Meta Official Reels Safe Zone Spec):
 *     - Top: 269 px (14%) — Status bar (108 px) + Reels header / camera / audio bar
 *     - Bottom: 672 px (35% full CTA/2-line caption safe boundary), 440 px core organic UI, 110 px bottom nav bar
 *     - Left: 65 px (6% edge crop protection)
 *     - Right: 146 px action rail (x: 934..1080, y: 980..1810); 65 px upper edge guard
 *  2. TikTok (TikTok Creative Center Official Safe Zone Spec):
 *     - Top: 252 px (13.1%) — Status bar + Following / For You tabs + Search
 *     - Bottom: 490 px organic UI boundary (620 px extended caption/CTA), 162 px bottom nav bar (y: 1758..1920)
 *     - Left: 60 px (5.6%)
 *     - Right: 184 px action rail (x: 896..1080, y: 780..1758) — Profile avatar, Like, Comment, Save, Share, Vinyl disc
 *  3. YouTube Shorts (YouTube Official Shorts Safe Zone Spec):
 *     - Top: 288 px (15%) — Top bar, Search, Camera, Subscriptions/Live filter pills
 *     - Bottom: 672 px (35% full safe boundary), 480 px core channel/title/sound UI, 144 px bottom nav + progress bar
 *     - Left: 48 px (4.4%)
 *     - Right: 192 px action rail (x: 888..1080, y: 880..1776) — Like, Dislike, Comment, Share, Remix, Sound art
 */
(function (root, factory) {
    var api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (typeof window !== 'undefined') window.AlptuguideSafeZones = api;
    else if (root) root.AlptuguideSafeZones = api;
}(typeof self !== 'undefined' ? self : this, function () {
    var W = 1080, H = 1920;

    var SPECS = {
        reels: {
            id: 'reels',
            name: 'Instagram Reels',
            updated: '2026-11',
            safe: { top: 269, bottom: 672, organicBottom: 440, left: 65, right: 146 },
            navBarHeight: 110,
            zones: [
                { id: 'top', label: 'ÜST SİSTEM & REELS BARI (269 px · %14)', x: 0, y: 0, w: 1080, h: 269, kind: 'danger' },
                { id: 'left_crop', label: 'SOL KENAR KESİLME PAYI (65 px · %6)', x: 0, y: 269, w: 65, h: 1211, kind: 'crop', vertical: true },
                { id: 'right_crop', label: 'SAĞ KENAR PAYI (65 px)', x: 1015, y: 269, w: 65, h: 711, kind: 'crop', vertical: true },
                { id: 'right_rail', label: 'SAĞ AKSİYON SÜTUNU (146 px · Beğeni/Yorum/Kaydet)', x: 934, y: 980, w: 146, h: 830, kind: 'danger', vertical: true },
                { id: 'bottom_ext', label: 'GENİŞLETİLMİŞ CAPTION / REKLAM CTA SINIRI (Y: 1248 · %35)', x: 65, y: 1248, w: 869, h: 232, kind: 'warn' },
                { id: 'bottom_ui', label: 'PROFİL · AÇIKLAMA · SES ALANI (330 px · Y: 1480–1810)', x: 0, y: 1480, w: 934, h: 330, kind: 'danger' },
                { id: 'bottom_nav', label: 'INSTAGRAM ALT GEZİNME ÇUBUĞU (110 px · Y: 1810–1920)', x: 0, y: 1810, w: 1080, h: 110, kind: 'nav' }
            ]
        },
        tiktok: {
            id: 'tiktok',
            name: 'TikTok',
            updated: '2026-11',
            safe: { top: 252, bottom: 620, organicBottom: 490, left: 60, right: 184 },
            navBarHeight: 162,
            zones: [
                { id: 'top', label: 'ÜST SEKMELER & ARAMA BARI (252 px · %13.1)', x: 0, y: 0, w: 1080, h: 252, kind: 'danger' },
                { id: 'left_crop', label: 'SOL KENAR PAYI (60 px)', x: 0, y: 252, w: 60, h: 1178, kind: 'crop', vertical: true },
                { id: 'right_crop', label: 'SAĞ KENAR PAYI (60 px)', x: 1020, y: 252, w: 60, h: 528, kind: 'crop', vertical: true },
                { id: 'right_rail', label: 'SAĞ PROFİL & AKSİYON SÜTUNU (184 px · %17)', x: 896, y: 780, w: 184, h: 978, kind: 'danger', vertical: true },
                { id: 'bottom_ext', label: 'UZUN CAPTION / ETİKET / CTA SINIRI (Y: 1300 · %32)', x: 60, y: 1300, w: 836, h: 130, kind: 'warn' },
                { id: 'bottom_ui', label: 'KULLANICI · AÇIKLAMA · MÜZİK ALANI (328 px · Y: 1430–1758)', x: 0, y: 1430, w: 896, h: 328, kind: 'danger' },
                { id: 'bottom_nav', label: 'TİKTOK ALT GEZİNME ÇUBUĞU (162 px · Y: 1758–1920)', x: 0, y: 1758, w: 1080, h: 162, kind: 'nav' }
            ]
        },
        shorts: {
            id: 'shorts',
            name: 'YouTube Shorts',
            updated: '2026-11',
            safe: { top: 288, bottom: 672, organicBottom: 480, left: 48, right: 192 },
            navBarHeight: 144,
            zones: [
                { id: 'top', label: 'ÜST ARAMA · KAMERA · FİLTRE BARI (288 px · %15)', x: 0, y: 0, w: 1080, h: 288, kind: 'danger' },
                { id: 'left_crop', label: 'SOL KENAR PAYI (48 px)', x: 0, y: 288, w: 48, h: 1152, kind: 'crop', vertical: true },
                { id: 'right_crop', label: 'SAĞ KENAR PAYI (48 px)', x: 1032, y: 288, w: 48, h: 592, kind: 'crop', vertical: true },
                { id: 'right_rail', label: 'SAĞ ETKİLEŞİM SÜTUNU (192 px · Beğen/Yorum/Remix)', x: 888, y: 880, w: 192, h: 896, kind: 'danger', vertical: true },
                { id: 'bottom_ext', label: 'GENİŞLETİLMİŞ BAŞLIK / İLGİLİ VİDEO SINIRI (Y: 1248 · %35)', x: 48, y: 1248, w: 840, h: 192, kind: 'warn' },
                { id: 'bottom_ui', label: 'KANAL · ABONE OL · BAŞLIK · SES ALANI (336 px · Y: 1440–1776)', x: 0, y: 1440, w: 888, h: 336, kind: 'danger' },
                { id: 'bottom_nav', label: 'SHORTS ALT BAR & İLERLEME ÇİZGİSİ (144 px · Y: 1776–1920)', x: 0, y: 1776, w: 1080, h: 144, kind: 'nav' }
            ]
        }
    };

    // Strictest intersection of all 3 platforms (Reels + TikTok + Shorts):
    SPECS.all = {
        id: 'all',
        name: 'Ortak Kılavuz (Reels + TikTok + Shorts)',
        updated: '2026-11',
        safe: {
            top: 288,
            bottom: 672,
            organicBottom: 490,
            left: 65,
            right: 192
        },
        navBarHeight: 162,
        zones: [
            { id: 'top', label: 'ORTAK ÜST ÖLÜ ALAN (288 px · Shorts/Reels/TikTok)', x: 0, y: 0, w: 1080, h: 288, kind: 'danger' },
            { id: 'left_crop', label: 'ORTAK SOL KENAR PAYI (65 px · Reels %6)', x: 0, y: 288, w: 65, h: 1142, kind: 'crop', vertical: true },
            { id: 'right_rail', label: 'ORTAK SAĞ AKSİYON SÜTUNU (192 px · Shorts/TikTok/Reels)', x: 888, y: 780, w: 192, h: 978, kind: 'danger', vertical: true },
            { id: 'bottom_ext', label: 'ORTAK TAM GÜVENLİ SINIR (Y: 1248 · 672 px Alttan)', x: 65, y: 1248, w: 823, h: 182, kind: 'warn' },
            { id: 'bottom_ui', label: 'ORTAK ALT AÇIKLAMA & PROFİL ALANI (Y: 1430–1758)', x: 0, y: 1430, w: 888, h: 328, kind: 'danger' },
            { id: 'bottom_nav', label: 'ORTAK ALT GEZİNME ÇUBUĞU (162 px · Y: 1758–1920)', x: 0, y: 1758, w: 1080, h: 162, kind: 'nav' }
        ]
    };

    function getSpec(platform) {
        return SPECS[platform] || SPECS.reels;
    }

    function safeRect(platform, mode) {
        var s = getSpec(platform).safe;
        var bottom = (mode === 'organic' && s.organicBottom) ? s.organicBottom : s.bottom;
        return {
            x: s.left,
            y: s.top,
            w: W - s.left - s.right,
            h: H - s.top - bottom,
            organicH: H - s.top - (s.organicBottom || s.bottom)
        };
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

    function drawZoneBox(ctx, z, showLabels) {
        var fill, stroke, badgeBg, textCol, dash;
        if (z.kind === 'nav') {
            fill = 'rgba(15, 23, 42, 0.58)';
            stroke = 'rgba(244, 63, 94, 0.85)';
            badgeBg = 'rgba(15, 23, 42, 0.90)';
            textCol = '#fda4af';
            dash = [];
        } else if (z.kind === 'warn') {
            fill = 'rgba(245, 158, 11, 0.14)';
            stroke = 'rgba(251, 191, 36, 0.85)';
            badgeBg = 'rgba(28, 20, 6, 0.88)';
            textCol = '#fde68a';
            dash = [12, 8];
        } else if (z.kind === 'crop') {
            fill = 'rgba(244, 63, 94, 0.12)';
            stroke = 'rgba(251, 113, 133, 0.55)';
            badgeBg = 'rgba(30, 10, 18, 0.85)';
            textCol = '#fecdd3';
            dash = [6, 6];
        } else {
            fill = 'rgba(244, 63, 94, 0.22)';
            stroke = 'rgba(251, 113, 133, 0.90)';
            badgeBg = 'rgba(38, 10, 20, 0.88)';
            textCol = '#ffe4e6';
            dash = [10, 7];
        }

        ctx.save();
        ctx.fillStyle = fill;
        ctx.fillRect(z.x, z.y, z.w, z.h);

        ctx.setLineDash(dash);
        ctx.lineWidth = 2;
        ctx.strokeStyle = stroke;
        ctx.strokeRect(z.x + 1, z.y + 1, z.w - 2, z.h - 2);
        ctx.setLineDash([]);

        if (showLabels !== false && z.label) {
            font(ctx, 700, z.vertical ? 18 : 20);
            var tw = ctx.measureText(z.label).width + 24;
            var th = 32;
            ctx.save();
            if (z.vertical) {
                ctx.translate(z.x + z.w / 2, z.y + z.h / 2);
                ctx.rotate(-Math.PI / 2);
                roundRect(ctx, -tw / 2, -th / 2, tw, th, 8);
                ctx.fillStyle = badgeBg;
                ctx.fill();
                ctx.strokeStyle = stroke;
                ctx.lineWidth = 1.5;
                ctx.stroke();
                ctx.fillStyle = textCol;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(z.label, 0, 1);
            } else {
                var cx = z.x + z.w / 2;
                var cy = z.y + z.h / 2;
                roundRect(ctx, cx - tw / 2, cy - th / 2, tw, th, 8);
                ctx.fillStyle = badgeBg;
                ctx.fill();
                ctx.strokeStyle = stroke;
                ctx.lineWidth = 1.5;
                ctx.stroke();
                ctx.fillStyle = textCol;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(z.label, cx, cy + 1);
            }
            ctx.restore();
        }
        ctx.restore();
    }

    // Draws on a 1080x1920 coordinate space; supports both draw(ctx, platform, opts) and draw(ctx, platform, width, height, opts).
    function draw(ctx, platform, a, b, c) {
        var opts, targetW = W, targetH = H, needsScale = false;
        if (typeof a === 'number' && typeof b === 'number') {
            targetW = a || W;
            targetH = b || H;
            opts = c || {};
            needsScale = (targetW !== W || targetH !== H);
        } else {
            opts = a || {};
        }
        var spec = getSpec(platform);
        var rFull = safeRect(platform, 'full');
        var rOrg = safeRect(platform, 'organic');
        var alpha = typeof opts.opacity === 'number' ? opts.opacity : 1;
        var showLabels = (opts.labels !== false && opts.showLabels !== false);

        ctx.save();
        if (needsScale) {
            ctx.scale(targetW / W, targetH / H);
        }
        ctx.globalAlpha = alpha;

        // 1. Draw all platform danger / warning / crop / nav zones
        spec.zones.forEach(function (z) {
            drawZoneBox(ctx, z, showLabels);
        });

        // 2. Draw Organic Safe Boundary (Cyan-Emerald outer safe frame down to organic UI top)
        ctx.save();
        ctx.setLineDash([14, 8]);
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#38bdf8';
        ctx.strokeRect(rOrg.x, rOrg.y, rOrg.w, rOrg.organicH);
        ctx.setLineDash([]);
        ctx.restore();

        // 3. Draw Primary 100% Guaranteed Safe Zone Box (Neon Emerald)
        ctx.save();
        ctx.lineWidth = 4.5;
        ctx.strokeStyle = '#10b981';
        ctx.shadowColor = 'rgba(16, 185, 129, 0.65)';
        ctx.shadowBlur = 12;
        ctx.strokeRect(rFull.x, rFull.y, rFull.w, rFull.h);
        ctx.shadowBlur = 0;

        // Rule-of-thirds subtle grid inside the guaranteed safe zone
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.22)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(rFull.x + rFull.w / 3, rFull.y);
        ctx.lineTo(rFull.x + rFull.w / 3, rFull.y + rFull.h);
        ctx.moveTo(rFull.x + (rFull.w * 2) / 3, rFull.y);
        ctx.lineTo(rFull.x + (rFull.w * 2) / 3, rFull.y + rFull.h);
        ctx.moveTo(rFull.x, rFull.y + rFull.h / 3);
        ctx.lineTo(rFull.x + rFull.w, rFull.y + rFull.h / 3);
        ctx.moveTo(rFull.x, rFull.y + (rFull.h * 2) / 3);
        ctx.lineTo(rFull.x + rFull.w, rFull.y + (rFull.h * 2) / 3);
        ctx.stroke();

        // Center crosshair (frame center 540, 960 & safe-zone center)
        var scx = rFull.x + rFull.w / 2;
        var scy = rFull.y + rFull.h / 2;
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.75)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(scx - 28, scy);
        ctx.lineTo(scx + 28, scy);
        ctx.moveTo(scx, scy - 28);
        ctx.lineTo(scx, scy + 28);
        ctx.stroke();

        if (showLabels) {
            var tag = 'TAM GÜVENLİ ALAN · ' + spec.name.toUpperCase() + ' · ' + rFull.w + '×' + rFull.h + ' px (X:' + rFull.x + '–' + (rFull.x + rFull.w) + ', Y:' + rFull.y + '–' + (rFull.y + rFull.h) + ')';
            font(ctx, 700, 19);
            var tw = Math.min(rFull.w - 16, ctx.measureText(tag).width + 26);
            roundRect(ctx, rFull.x + 8, rFull.y + 8, tw, 34, 8);
            ctx.fillStyle = 'rgba(6, 28, 20, 0.90)';
            ctx.fill();
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = '#10b981';
            ctx.stroke();
            ctx.fillStyle = '#6ee7b7';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(tag, rFull.x + 20, rFull.y + 25);
        }
        ctx.restore();

        ctx.restore();
    }

    function getScaledSpec(platform, width, height) {
        var spec = getSpec(platform);
        var sx = (width || W) / W;
        var sy = (height || H) / H;
        return {
            label: spec.name,
            top: Math.round(spec.safe.top * sy),
            bottom: Math.round(spec.safe.bottom * sy),
            bottomOrganic: Math.round((spec.safe.organicBottom || spec.safe.bottom) * sy),
            left: Math.round(spec.safe.left * sx),
            right: Math.round(spec.safe.right * sx)
        };
    }

    return { W: W, H: H, specs: SPECS, SPECS: SPECS, getSpec: getSpec, getScaledSpec: getScaledSpec, safeRect: safeRect, draw: draw };
}));

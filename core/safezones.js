/**
 * Alptuguide Studio — 1:1 Platform-Verified Safe Zone Specifications
 * Copyright (c) 2026 Alptuğ Dağ (@alptugdag). All rights reserved.
 *
 * Reference Canvas: 1080 × 1920 px (9:16 vertical video).
 * Automatically scales to any sequence/composition resolution (e.g., 2160 × 3840 4K).
 *
 * RESMİ DOĞRULAMA KAYNAKLARI VE TEKNİK DOKÜMANTASYON DAYANAKLARI:
 *  1. Meta for Creators / Instagram Reels Creative Guidance (2025/2026 Resmî Kılavuz):
 *     - 1080x1920 piksel tuvalde Üst Ölü Alan: 269 px (%14)
 *       (iOS/Android durum çubuğu 108 px + Reels logosu, kamera butonu, ses ikonu ve üst gölge gradyanı).
 *     - Alt Ölü Alan: Genişletilmiş 2-satır caption ve reklam CTA sınırı için 672 px (%35, Y: 1248-1920);
 *       çekirdek organik UI alanı 440 px (Y: 1480-1810); sabit alt gezinme barı 110 px (Y: 1810-1920).
 *     - Sol Kenar Kırpma Payı: 65 px (%6 ekran kenar payı).
 *     - Sağ Aksiyon Sütunu: 146 px (X: 934..1080, Y: 980..1810 profil avatarı, beğeni, yorum, kaydet, paylaş butonları)
 *       ve sağ üst 146 px koruma payı (X: 934..1080, Y: 269..980 ses/kamera arayüzü).
 *     - Net Garantili İçerik Güvenli Alanı: 869 × 979 px (X: 65, Y: 269).
 *
 *  2. TikTok Creative Center / TikTok Official Video Safe Zone Spec (2025/2026):
 *     - Üst Ölü Alan: 252 px (%13.1) — Canlı/Takip Edilenler/Sizin İçin sekme çubuğu + Arama ikonu.
 *     - Alt Ölü Alan: 620 px (%32.3, Y: 1300-1920) genişletilmiş açıklama sınırı; 490 px organik UI (Y: 1430-1758);
 *       alt gezinme sekmesi 162 px (Y: 1758-1920).
 *     - Sol Kenar Payı: 60 px (%5.6).
 *     - Sağ Aksiyon Sütunu: 184 px (%17, X: 896..1080, Y: 780..1758) — Avatar (+), Kalp, Yorum, Kaydet, Repost, Dönen Plak.
 *     - Net Garantili İçerik Güvenli Alanı: 836 × 1048 px (X: 60, Y: 252).
 *
 *  3. YouTube Shorts Official Safe Zone Template & Guidelines:
 *     - Üst Ölü Alan: 288 px (%15) — Shorts logosu, Arama, Kamera, 3 nokta menüsü.
 *     - Alt Ölü Alan: 672 px (%35, Y: 1248-1920) kanal bilgisi, Abone Ol butonu, ses kütüphanesi;
 *       kırmızı ilerleme çizgisi ve alt bar 144 px (Y: 1776-1920).
 *     - Sol Kenar Payı: 48 px (%4.4).
 *     - Sağ Aksiyon Sütunu: 192 px (%17.8, X: 888..1080, Y: 880..1776) — Beğen, Beğenme, Yorum, Paylaş, Remix, Ses kapağı.
 *     - Net Garantili İçerik Güvenli Alanı: 840 × 960 px (X: 48, Y: 288).
 *
 *  4. SMPTE RP 2046-2 & EBU R95:
 *     - Action Safe: %90 (X: 54, Y: 96, W: 972, H: 1728)
 *     - Title Safe: %80 (X: 108, Y: 192, W: 864, H: 1536)
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
            sourceDoc: 'Meta Official Reels Safe Zone Spec (2025/2026)',
            updated: '2026-11',
            safe: { top: 269, bottom: 672, organicBottom: 440, left: 65, right: 146 },
            navBarHeight: 110,
            zones: [
                { id: 'top', label: 'ÜST SİSTEM & REELS BARI (269 px · %14)', x: 0, y: 0, w: 1080, h: 269, kind: 'danger' },
                { id: 'left_crop', label: 'SOL KENAR KESİLME PAYI (65 px · %6)', x: 0, y: 269, w: 65, h: 1541, kind: 'crop', vertical: true },
                { id: 'right_crop', label: 'SAĞ ÜST GÜVENLİ PAY (146 px)', x: 934, y: 269, w: 146, h: 711, kind: 'crop', vertical: true },
                { id: 'right_rail', label: 'SAĞ AKSİYON SÜTUNU (146 px · Beğeni/Yorum/Kaydet)', x: 934, y: 980, w: 146, h: 830, kind: 'danger', vertical: true },
                { id: 'bottom_ext', label: 'GENİŞLETİLMİŞ CAPTION / REKLAM CTA SINIRI (Y: 1248 · %35)', x: 65, y: 1248, w: 869, h: 232, kind: 'warn' },
                { id: 'bottom_ui', label: 'PROFİL · AÇIKLAMA · SES ALANI (330 px · Y: 1480–1810)', x: 65, y: 1480, w: 869, h: 330, kind: 'danger' },
                { id: 'bottom_nav', label: 'INSTAGRAM ALT GEZİNME ÇUBUĞU (110 px · Y: 1810–1920)', x: 0, y: 1810, w: 1080, h: 110, kind: 'nav' }
            ]
        },
        tiktok: {
            id: 'tiktok',
            name: 'TikTok',
            sourceDoc: 'TikTok Creative Center Official Specs (2025/2026)',
            updated: '2026-11',
            safe: { top: 252, bottom: 620, organicBottom: 490, left: 60, right: 184 },
            navBarHeight: 162,
            zones: [
                { id: 'top', label: 'ÜST SEKMELER & ARAMA BARI (252 px · %13.1)', x: 0, y: 0, w: 1080, h: 252, kind: 'danger' },
                { id: 'left_crop', label: 'SOL KENAR PAYI (60 px · %5.6)', x: 0, y: 252, w: 60, h: 1506, kind: 'crop', vertical: true },
                { id: 'right_crop', label: 'SAĞ ÜST GÜVENLİ PAY (184 px)', x: 896, y: 252, w: 184, h: 528, kind: 'crop', vertical: true },
                { id: 'right_rail', label: 'SAĞ PROFİL & AKSİYON SÜTUNU (184 px · %17)', x: 896, y: 780, w: 184, h: 978, kind: 'danger', vertical: true },
                { id: 'bottom_ext', label: 'UZUN CAPTION / ETİKET / CTA SINIRI (Y: 1300 · %32)', x: 60, y: 1300, w: 836, h: 130, kind: 'warn' },
                { id: 'bottom_ui', label: 'KULLANICI · AÇIKLAMA · MÜZİK ALANI (328 px · Y: 1430–1758)', x: 60, y: 1430, w: 836, h: 328, kind: 'danger' },
                { id: 'bottom_nav', label: 'TİKTOK ALT GEZİNME ÇUBUĞU (162 px · Y: 1758–1920)', x: 0, y: 1758, w: 1080, h: 162, kind: 'nav' }
            ]
        },
        shorts: {
            id: 'shorts',
            name: 'YouTube Shorts',
            sourceDoc: 'YouTube Shorts Official Template Specification',
            updated: '2026-11',
            safe: { top: 288, bottom: 672, organicBottom: 480, left: 48, right: 192 },
            navBarHeight: 144,
            zones: [
                { id: 'top', label: 'ÜST ARAMA · KAMERA · FİLTRE BARI (288 px · %15)', x: 0, y: 0, w: 1080, h: 288, kind: 'danger' },
                { id: 'left_crop', label: 'SOL KENAR PAYI (48 px · %4.4)', x: 0, y: 288, w: 48, h: 1488, kind: 'crop', vertical: true },
                { id: 'right_crop', label: 'SAĞ ÜST GÜVENLİ PAY (192 px)', x: 888, y: 288, w: 192, h: 592, kind: 'crop', vertical: true },
                { id: 'right_rail', label: 'SAĞ ETKİLEŞİM SÜTUNU (192 px · Beğen/Yorum/Remix)', x: 888, y: 880, w: 192, h: 896, kind: 'danger', vertical: true },
                { id: 'bottom_ext', label: 'GENİŞLETİLMİŞ BAŞLIK / İLGİLİ VİDEO SINIRI (Y: 1248 · %35)', x: 48, y: 1248, w: 840, h: 192, kind: 'warn' },
                { id: 'bottom_ui', label: 'KANAL · ABONE OL · BAŞLIK · SES ALANI (336 px · Y: 1440–1776)', x: 48, y: 1440, w: 840, h: 336, kind: 'danger' },
                { id: 'bottom_nav', label: 'SHORTS ALT BAR & İLERLEME ÇİZGİSİ (144 px · Y: 1776–1920)', x: 0, y: 1776, w: 1080, h: 144, kind: 'nav' }
            ]
        }
    };

    // Strictest intersection of all 3 platforms (Reels + TikTok + Shorts):
    SPECS.all = {
        id: 'all',
        name: 'Ortak Kılavuz (Reels + TikTok + Shorts)',
        sourceDoc: 'Reels, TikTok & Shorts Ortak Kesişim Doğrulaması',
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
            { id: 'left_crop', label: 'ORTAK SOL KENAR PAYI (65 px · Reels %6)', x: 0, y: 288, w: 65, h: 1470, kind: 'crop', vertical: true },
            { id: 'right_crop', label: 'ORTAK SAĞ ÜST PAY (192 px)', x: 888, y: 288, w: 192, h: 492, kind: 'crop', vertical: true },
            { id: 'right_rail', label: 'ORTAK SAĞ AKSİYON SÜTUNU (192 px · Shorts/TikTok/Reels)', x: 888, y: 780, w: 192, h: 978, kind: 'danger', vertical: true },
            { id: 'bottom_ext', label: 'ORTAK TAM GÜVENLİ SINIR (Y: 1248 · 672 px Alttan)', x: 65, y: 1248, w: 823, h: 182, kind: 'warn' },
            { id: 'bottom_ui', label: 'ORTAK ALT AÇIKLAMA & PROFİL ALANI (Y: 1430–1758)', x: 65, y: 1430, w: 823, h: 328, kind: 'danger' },
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
            var isNarrowStrip = z.vertical && z.w < 70;
            font(ctx, 700, isNarrowStrip ? 16 : (z.vertical ? 18 : 20));
            var tw = ctx.measureText(z.label).width + (isNarrowStrip ? 18 : 24);
            var th = isNarrowStrip ? 26 : 32;
            ctx.save();
            if (z.vertical) {
                ctx.translate(z.x + z.w / 2, z.y + z.h / 2);
                ctx.rotate(-Math.PI / 2);
                roundRect(ctx, -tw / 2, -th / 2, tw, th, 7);
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

    function drawCornerBrackets(ctx, x, y, w, h, len, color) {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 6;
        ctx.lineCap = 'square';
        ctx.beginPath();
        // Top-left
        ctx.moveTo(x, y + len); ctx.lineTo(x, y); ctx.lineTo(x + len, y);
        // Top-right
        ctx.moveTo(x + w - len, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + len);
        // Bottom-left
        ctx.moveTo(x, y + h - len); ctx.lineTo(x, y + h); ctx.lineTo(x + len, y + h);
        // Bottom-right
        ctx.moveTo(x + w - len, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - len);
        ctx.stroke();
        ctx.restore();
    }

    function drawInsetBadge(ctx, text, cx, cy, borderCol, fgCol) {
        ctx.save();
        font(ctx, 700, 16);
        var tw = ctx.measureText(text).width + 18;
        var th = 26;
        roundRect(ctx, cx - tw / 2, cy - th / 2, tw, th, 6);
        ctx.fillStyle = 'rgba(6, 20, 16, 0.90)';
        ctx.fill();
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = borderCol;
        ctx.stroke();
        ctx.fillStyle = fgCol;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, cx, cy + 1);
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

        // 1. Draw platform danger / warning / crop / nav zones
        if (opts.showUiBoxes === true) {
            spec.zones.forEach(function (z) {
                drawZoneBox(ctx, z, showLabels);
            });
        } else if (opts.showSafeZones !== false) {
            // Subtle danger scrim outside safe rect when Mock UI is active so boundaries are unmistakable
            ctx.save();
            ctx.fillStyle = 'rgba(244, 63, 94, 0.08)';
            ctx.fillRect(0, 0, W, rFull.y);
            ctx.fillRect(0, rFull.y + rOrg.organicH, W, H - (rFull.y + rOrg.organicH));
            ctx.fillRect(0, rFull.y, rFull.x, rOrg.organicH);
            ctx.fillRect(rFull.x + rFull.w, rFull.y, W - (rFull.x + rFull.w), rOrg.organicH);
            ctx.restore();
        }

        // 2. Draw Organic & Guaranteed Safe Boundaries (if Safe Zones enabled)
        if (opts.showSafeZones !== false) {
            // Organic UI Safe Box (Cyan Dashed)
            ctx.save();
            ctx.setLineDash([14, 8]);
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#38bdf8';
            ctx.strokeRect(rOrg.x, rOrg.y, rOrg.w, rOrg.organicH);
            ctx.setLineDash([]);
            ctx.restore();

            // Primary Guaranteed Safe Zone Box (Neon Emerald)
            ctx.save();
            ctx.lineWidth = 4;
            ctx.strokeStyle = '#10b981';
            ctx.shadowColor = 'rgba(16, 185, 129, 0.55)';
            ctx.shadowBlur = 10;
            ctx.strokeRect(rFull.x, rFull.y, rFull.w, rFull.h);
            ctx.shadowBlur = 0;
            ctx.restore();

            // Precision corner brackets on Guaranteed Safe Zone
            drawCornerBrackets(ctx, rFull.x, rFull.y, rFull.w, rFull.h, 24, '#34d399');

            if (showLabels) {
                var shortName = spec.id === 'all' ? 'ORTAK 3 PLATFORM' : spec.name.toUpperCase();
                var tag = 'GÜVENLİ ALAN · ' + shortName + ' · ' + rFull.w + '×' + rFull.h + ' px';
                font(ctx, 700, 19);
                var tw = Math.min(rFull.w - 32, ctx.measureText(tag).width + 28);
                var bx = rFull.x + (rFull.w - tw) / 2;
                var by = rFull.y + 14;
                roundRect(ctx, bx, by, tw, 34, 8);
                ctx.fillStyle = 'rgba(6, 28, 20, 0.92)';
                ctx.fill();
                ctx.lineWidth = 1.8;
                ctx.strokeStyle = '#10b981';
                ctx.stroke();
                ctx.fillStyle = '#6ee7b7';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(tag, rFull.x + rFull.w / 2, by + 18);

                // Pixel margin callout pills on the boundaries of the Guaranteed Safe Zone
                if (!opts.showUiBoxes) {
                    drawInsetBadge(ctx, 'ÜST ' + spec.safe.top + ' px', rFull.x + rFull.w / 2, rFull.y - 18, 'rgba(16, 185, 129, 0.65)', '#a7f3d0');
                    drawInsetBadge(ctx, 'TAM ALT ' + spec.safe.bottom + ' px (Y:' + (rFull.y + rFull.h) + ')', rFull.x + rFull.w / 2, rFull.y + rFull.h - 20, 'rgba(16, 185, 129, 0.65)', '#a7f3d0');
                    drawInsetBadge(ctx, 'ORGANİK ALT ' + spec.safe.organicBottom + ' px (Y:' + (rOrg.y + rOrg.organicH) + ')', rOrg.x + rOrg.w - 148, rOrg.y + rOrg.organicH - 18, 'rgba(56, 189, 248, 0.75)', '#bae6fd');
                    drawInsetBadge(ctx, 'SOL ' + spec.safe.left + ' px', rFull.x + 56, rFull.y + rFull.h / 2, 'rgba(16, 185, 129, 0.55)', '#a7f3d0');
                    drawInsetBadge(ctx, 'SAĞ ' + spec.safe.right + ' px', rFull.x + rFull.w - 60, rFull.y + rFull.h / 2, 'rgba(16, 185, 129, 0.55)', '#a7f3d0');
                }
            }
        }

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

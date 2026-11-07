/**
 * Alptuguide — Composition guides for editors (thirds, centre, feed/grid crops, broadcast safe)
 * Copyright (c) 2026 Alptuğ Dağ (@alptugdag). All rights reserved.
 *
 * Drawn on top of the platform safe-zones. All maths is done in the target pixel space,
 * so the guides stay crisp at any sequence size (1080×1920, 2160×3840, 16:9 …).
 */
(function (root) {
    'use strict';

    var CROPS = {
        feed45: { ratio: 4 / 5, label: 'FEED 4:5 (1080×1350)', color: '#f472b6', align: 'right' },
        grid34: { ratio: 3 / 4, label: 'PROFİL GRİD 3:4 (1080×1440)', color: '#fbbf24', align: 'left' },
        square: { ratio: 1, label: 'KARE 1:1 (1080×1080)', color: '#a78bfa', align: 'right' }
    };

    function centeredCrop(w, h, ratio) {
        // ratio = width / height of the crop, centred and as wide as the frame allows
        var cw = w, ch = w / ratio;
        if (ch > h) { ch = h; cw = h * ratio; }
        return { x: (w - cw) / 2, y: (h - ch) / 2, w: cw, h: ch };
    }

    function line(ctx, x1, y1, x2, y2) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
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

    function drawPillTag(ctx, text, x, y, color, s, alignRight) {
        ctx.save();
        ctx.font = '700 ' + Math.round(16 * s) + 'px Montserrat, Inter, -apple-system, sans-serif';
        var padX = 10 * s;
        var tw = ctx.measureText(text).width + padX * 2;
        var th = 26 * s;
        var bx = alignRight ? (x - tw) : x;
        roundRect(ctx, bx, y, tw, th, 6 * s);
        ctx.fillStyle = 'rgba(8, 10, 16, 0.88)';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1, 1.5 * s);
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        ctx.fillText(text, bx + padX, y + th / 2 + 1);
        ctx.restore();
    }

    function draw(ctx, w, h, opts) {
        opts = opts || {};
        var s = Math.min(w / 1080, h / 1920) || 1;
        ctx.save();
        ctx.globalAlpha = typeof opts.opacity === 'number' ? opts.opacity : 1;

        if (opts.thirds) {
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.62)';
            ctx.lineWidth = Math.max(1.5, 2 * s);
            ctx.setLineDash([10 * s, 8 * s]);
            line(ctx, w / 3, 0, w / 3, h);
            line(ctx, 2 * w / 3, 0, 2 * w / 3, h);
            line(ctx, 0, h / 3, w, h / 3);
            line(ctx, 0, 2 * h / 3, w, 2 * h / 3);
            ctx.setLineDash([]);

            // Power-point intersection rings (Golden / Rule of Thirds focal points)
            var pts = [
                [w / 3, h / 3],
                [2 * w / 3, h / 3],
                [w / 3, 2 * h / 3],
                [2 * w / 3, 2 * h / 3]
            ];
            ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
            for (var i = 0; i < pts.length; i++) {
                ctx.beginPath();
                ctx.arc(pts[i][0], pts[i][1], 5 * s, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        if (opts.center) {
            ctx.save();
            var c = 38 * s;
            var gap = 8 * s;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
            ctx.lineWidth = Math.max(1.5, 2.5 * s);
            line(ctx, w / 2 - c, h / 2, w / 2 - gap, h / 2);
            line(ctx, w / 2 + gap, h / 2, w / 2 + c, h / 2);
            line(ctx, w / 2, h / 2 - c, w / 2, h / 2 - gap);
            line(ctx, w / 2, h / 2 + gap, w / 2, h / 2 + c);
            ctx.beginPath();
            ctx.arc(w / 2, h / 2, 16 * s, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
            ctx.lineWidth = Math.max(1, 1.5 * s);
            ctx.stroke();
            ctx.restore();
        }

        if (opts.broadcast) {
            // SMPTE RP 2046-2 Broadcast Safe: Action Safe 90% (5% inset) & Title Safe 80% (10% inset)
            ctx.save();
            var ax = Math.round(w * 0.05), ay = Math.round(h * 0.05), aw = Math.round(w * 0.9), ah = Math.round(h * 0.9);
            var tx = Math.round(w * 0.10), ty = Math.round(h * 0.10), tw = Math.round(w * 0.8), th = Math.round(h * 0.8);

            ctx.lineWidth = Math.max(1.5, 2.2 * s);
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
            ctx.strokeRect(ax, ay, aw, ah);
            drawPillTag(ctx, 'ACTION SAFE %90', ax + 10 * s, ay + 10 * s, '#38bdf8', s, false);

            ctx.strokeStyle = 'rgba(56, 189, 248, 0.60)';
            ctx.setLineDash([8 * s, 6 * s]);
            ctx.strokeRect(tx, ty, tw, th);
            ctx.setLineDash([]);
            drawPillTag(ctx, 'TITLE SAFE %80', tx + 10 * s, ty + 10 * s, '#7dd3fc', s, false);
            ctx.restore();
        }

        ['feed45', 'grid34', 'square'].forEach(function (key) {
            if (!opts[key]) return;
            var cfg = CROPS[key];
            var r = centeredCrop(w, h, cfg.ratio);
            ctx.save();
            // Dim what gets cropped away in profile grid / Instagram feed
            ctx.fillStyle = 'rgba(0, 0, 0, 0.26)';
            ctx.fillRect(0, 0, w, r.y);
            ctx.fillRect(0, r.y + r.h, w, h - r.y - r.h);

            ctx.strokeStyle = cfg.color;
            ctx.lineWidth = Math.max(1.5, 3 * s);
            ctx.setLineDash([16 * s, 10 * s]);
            ctx.strokeRect(r.x + 1.5, r.y, r.w - 3, r.h);
            ctx.setLineDash([]);

            // Place crop badge cleanly inside top/bottom corner without colliding with centered Safe Zone header
            var isRight = cfg.align === 'right';
            var anchorX = isRight ? (r.x + r.w - 16 * s) : (r.x + 16 * s);
            var labelY = Math.max(12 * s, r.y - 32 * s);
            drawPillTag(ctx, cfg.label, anchorX, labelY, cfg.color, s, isRight);
            ctx.restore();
        });

        ctx.restore();
    }

    var api = { draw: draw, centeredCrop: centeredCrop, CROPS: CROPS };
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.AlptuguideCompGuides = api;
}(typeof window !== 'undefined' ? window : this));

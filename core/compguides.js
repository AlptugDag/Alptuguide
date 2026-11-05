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
        feed45: { ratio: 4 / 5, label: 'FEED 4:5', color: '#f472b6' },
        grid34: { ratio: 3 / 4, label: 'PROFİL GRID 3:4', color: '#fbbf24' },
        square: { ratio: 1, label: '1:1', color: '#a78bfa' }
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

    function tag(ctx, text, x, y, color, s) {
        ctx.font = '700 ' + Math.round(17 * s) + 'px Inter, -apple-system, sans-serif';
        var pad = 8 * s, tw = ctx.measureText(text).width + pad * 2, th = 26 * s;
        ctx.fillStyle = 'rgba(0,0,0,0.62)';
        ctx.fillRect(x, y, tw, th);
        ctx.fillStyle = color;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        ctx.fillText(text, x + pad, y + th / 2 + 1);
    }

    function draw(ctx, w, h, opts) {
        opts = opts || {};
        var s = Math.min(w / 1080, h / 1920) || 1;
        ctx.save();
        ctx.globalAlpha = typeof opts.opacity === 'number' ? opts.opacity : 1;

        if (opts.thirds) {
            ctx.strokeStyle = 'rgba(255,255,255,0.55)';
            ctx.lineWidth = Math.max(1, 2 * s);
            ctx.setLineDash([10 * s, 8 * s]);
            line(ctx, w / 3, 0, w / 3, h);
            line(ctx, 2 * w / 3, 0, 2 * w / 3, h);
            line(ctx, 0, h / 3, w, h / 3);
            line(ctx, 0, 2 * h / 3, w, 2 * h / 3);
            ctx.setLineDash([]);
        }

        if (opts.center) {
            var c = 34 * s;
            ctx.strokeStyle = 'rgba(255,255,255,0.9)';
            ctx.lineWidth = Math.max(1, 2.5 * s);
            line(ctx, w / 2 - c, h / 2, w / 2 + c, h / 2);
            line(ctx, w / 2, h / 2 - c, w / 2, h / 2 + c);
        }

        if (opts.broadcast) {
            // Action safe 90 % / title safe 80 %
            ctx.lineWidth = Math.max(1, 2 * s);
            ctx.strokeStyle = 'rgba(56,189,248,0.75)';
            ctx.strokeRect(w * 0.05, h * 0.05, w * 0.9, h * 0.9);
            ctx.strokeStyle = 'rgba(56,189,248,0.45)';
            ctx.setLineDash([6 * s, 6 * s]);
            ctx.strokeRect(w * 0.1, h * 0.1, w * 0.8, h * 0.8);
            ctx.setLineDash([]);
        }

        ['feed45', 'grid34', 'square'].forEach(function (key) {
            if (!opts[key]) return;
            var cfg = CROPS[key];
            var r = centeredCrop(w, h, cfg.ratio);
            // Dim what gets cropped away, then outline the visible window
            ctx.fillStyle = 'rgba(0,0,0,0.28)';
            ctx.fillRect(0, 0, w, r.y);
            ctx.fillRect(0, r.y + r.h, w, h - r.y - r.h);
            ctx.strokeStyle = cfg.color;
            ctx.lineWidth = Math.max(1, 3 * s);
            ctx.setLineDash([16 * s, 10 * s]);
            ctx.strokeRect(r.x + 1, r.y, r.w - 2, r.h);
            ctx.setLineDash([]);
            tag(ctx, cfg.label, r.x + 10 * s, r.y + 10 * s, cfg.color, s);
        });

        ctx.restore();
    }

    var api = { draw: draw, centeredCrop: centeredCrop, CROPS: CROPS };
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.AlptuguideCompGuides = api;
}(typeof window !== 'undefined' ? window : this));

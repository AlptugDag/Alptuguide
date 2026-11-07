const test = require('node:test');
const assert = require('node:assert/strict');

const SafeZones = require('./safezones.js');
const Layout = require('./layout.js');
const CompGuides = require('./compguides.js');
const Renderer = require('./renderer.js');
const HookEngine = require('./hook_engine.js');

test('SafeZones specs verify 1:1 platform boundaries and exact geometric partition at 1080x1920', () => {
    assert.equal(SafeZones.W, 1080);
    assert.equal(SafeZones.H, 1920);

    const reels = SafeZones.safeRect('reels', 'full');
    assert.equal(reels.x, 65);
    assert.equal(reels.y, 269);
    assert.equal(reels.w, 1080 - 65 - 146);
    assert.equal(reels.h, 1920 - 269 - 672);

    const tiktok = SafeZones.safeRect('tiktok', 'full');
    assert.equal(tiktok.x, 60);
    assert.equal(tiktok.y, 252);
    assert.equal(tiktok.w, 1080 - 60 - 184);
    assert.equal(tiktok.h, 1920 - 252 - 620);

    const shorts = SafeZones.safeRect('shorts', 'full');
    assert.equal(shorts.x, 48);
    assert.equal(shorts.y, 288);
    assert.equal(shorts.w, 1080 - 48 - 192);
    assert.equal(shorts.h, 1920 - 288 - 672);

    // Strictest 3-platform intersection (all)
    const all = SafeZones.safeRect('all', 'full');
    assert.equal(all.x, 65);
    assert.equal(all.y, 288);
    assert.equal(all.w, 823);
    assert.equal(all.h, 960);

    // Verify every platform's danger zones align flush with the safeRect without gaps
    for (const key of ['reels', 'tiktok', 'shorts', 'all']) {
        const spec = SafeZones.getSpec(key);
        const rFull = SafeZones.safeRect(key, 'full');
        assert.equal(rFull.x + rFull.w, 1080 - spec.safe.right);
        assert.equal(rFull.y + rFull.h, 1920 - spec.safe.bottom);

        const rightZone = spec.zones.find((z) => z.id === 'right_rail');
        assert.ok(rightZone, `Missing right rail danger zone for ${key}`);
        assert.equal(rightZone.x, rFull.x + rFull.w);
        assert.equal(rightZone.x + rightZone.w, 1080);

        const rightCrop = spec.zones.find((z) => z.id === 'right_crop');
        assert.ok(rightCrop, `Missing right crop zone for ${key}`);
        assert.equal(rightCrop.x, rFull.x + rFull.w);
        assert.equal(rightCrop.x + rightCrop.w, 1080);
    }
});

test('SafeZones scales accurately to 4K (2160x3840)', () => {
    const scaled = SafeZones.getScaledSpec('reels', 2160, 3840);
    assert.equal(scaled.top, 269 * 2);
    assert.equal(scaled.bottom, 672 * 2);
    assert.equal(scaled.left, 65 * 2);
    assert.equal(scaled.right, 146 * 2);
});

test('CompGuides centeredCrop calculates exact aspect masks', () => {
    const crop45 = CompGuides.centeredCrop(1080, 1920, 4 / 5);
    assert.equal(crop45.w, 1080);
    assert.equal(crop45.h, 1350);
    assert.equal(crop45.x, 0);
    assert.equal(crop45.y, (1920 - 1350) / 2);

    const crop34 = CompGuides.centeredCrop(1080, 1920, 3 / 4);
    assert.equal(crop34.w, 1080);
    assert.equal(crop34.h, 1440);
    assert.equal(crop34.y, (1920 - 1440) / 2);

    const crop11 = CompGuides.centeredCrop(1080, 1920, 1);
    assert.equal(crop11.w, 1080);
    assert.equal(crop11.h, 1080);
    assert.equal(crop11.y, (1920 - 1080) / 2);
});

test('Layout and Renderer wrapCaption handles single-line, multi-line, and truncation', () => {
    assert.ok(Layout.getLayout('reels'));
    assert.ok(Layout.getLayout('tiktok'));
    assert.ok(Layout.getLayout('shorts'));

    const mockCtx = {
        measureText: (str) => ({ width: str.length * 14 })
    };

    const shortWrap = Renderer.wrapCaption(mockCtx, 'Kisa baslik', 800, 2);
    assert.equal(shortWrap.truncated, false);
    assert.equal(shortWrap.lineCount, 1);

    const longText = 'Bu cok uzun bir video aciklama metnidir ve iki satiri astigi icin otomatik olarak devamini oku ekiyle kisaltilmalidir ki arayuz tasmamali.';
    const longWrap = Renderer.wrapCaption(mockCtx, longText, 500, 2);
    assert.equal(longWrap.truncated, true);
    assert.equal(longWrap.lineCount, 2);
    assert.ok(longWrap.lines[1].endsWith('... devamını oku'));
});

test('HookEngine computes 0-3s camera transforms, safe hook boxes, and keyframe recipes', () => {
    // Active inside 0.00s - 3.00s window
    const t0 = HookEngine.computeCameraTransform(0.2, 'punch_zoom', 3.0);
    assert.equal(t0.active, true);
    assert.ok(t0.scale > 1.0);

    // Inactive after 3.00s
    const tAfter = HookEngine.computeCameraTransform(3.5, 'punch_zoom', 3.0);
    assert.equal(tAfter.active, false);
    assert.equal(tAfter.scale, 1);

    // Safe hook box stays strictly inside platform safeRect
    for (const p of ['reels', 'tiktok', 'shorts', 'all']) {
        const sRect = SafeZones.safeRect(p, 'full');
        for (const place of ['top', 'center', 'lower']) {
            const box = HookEngine.computeSafeHookBox(p, place, SafeZones);
            assert.ok(box.x >= sRect.x);
            assert.ok(box.x + box.w <= sRect.x + sRect.w);
            assert.ok(box.centerY >= sRect.y + 150);
            assert.ok(box.centerY <= sRect.y + sRect.h - 150);
        }
    }

    // Fallback variations and keyframe recipe
    const vars = HookEngine.buildFallbackVariations({
        topic: 'Premiere Pro renk duzenleme',
        psychology: 'contrarian_shock',
        textAnimation: 'hormozi_pop',
        cameraMotion: 'punch_zoom'
    });
    assert.equal(vars.length, 3);
    assert.ok(vars[0].hookText.length > 5);

    const recipe = HookEngine.generateKeyframesRecipe(vars[0], 60);
    assert.equal(recipe.windowSeconds, 3.0);
    assert.equal(recipe.fps, 60);
    assert.ok(recipe.keyframes.length >= 8);
});

test('MercuryStream parseShmHeader decodes 96-byte lock-free seqlock header and PrTime ticks', () => {
    const MercuryStream = require('./mercury_stream.js');
    const buf = new ArrayBuffer(96);
    const view = new DataView(buf);
    view.setUint32(0, MercuryStream.SHM_MAGIC, true); // magic 'ALPT'
    view.setUint32(4, 1, true);                       // version 1
    view.setUint32(8, 42, true);                      // seq low = 42 (even -> committed)
    view.setUint32(12, 0, true);                      // seq high = 0
    view.setUint32(16, 1, true);                      // activeSlot = 1
    view.setUint32(20, 1080, true);                   // width = 1080
    view.setUint32(24, 1920, true);                   // height = 1920
    view.setUint32(28, 1080 * 4, true);               // stride = 4320
    view.setUint32(32, 1, true);                      // pixelFormat = 1 (RGBA8888)
    // 3.0 seconds in Premiere Pro PrTime ticks (3 * 254016000000 = 762048000000)
    const ticks = 762048000000;
    view.setUint32(36, ticks >>> 0, true);
    view.setInt32(40, Math.floor(ticks / 4294967296), true);
    view.setFloat64(44, 60.0, true);                  // fps = 60
    view.setUint8(52, 1);                             // isPlaying = 1

    const parsed = MercuryStream.parseShmHeader(buf, 0);
    assert.ok(parsed);
    assert.equal(parsed.seq, 42);
    assert.equal(parsed.isWriting, false);
    assert.equal(parsed.activeSlot, 1);
    assert.equal(parsed.width, 1080);
    assert.equal(parsed.height, 1920);
    assert.equal(parsed.timeSeconds, 3.0);
    assert.equal(parsed.fps, 60.0);
    assert.equal(parsed.isPlaying, true);
});

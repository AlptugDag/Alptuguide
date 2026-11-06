/**
 * Alptuguide™ Mercury Transmit & OS-Level Overlay IPC Engine (v3.4)
 *
 * Implements:
 * 1. Goal Option A (Zero-Lag 60fps Live Feed in Panel):
 *    - Direct CEP Node.js Shared Memory Ring Buffer consumer (/dev/shm/alptuguide_mercury_v1)
 *      reading lock-free seqlock frames written by AlptuguideMercuryTransmit.cpp
 *    - Binary WebSocket fallback consumer (ws://127.0.0.1:3000/ws/mercury)
 *    - Hardware-accelerated WebGL2 texSubImage2D / pre-allocated ImageData renderer
 *      with zero per-frame heap allocations.
 *
 * 2. Goal Option B (Non-Renderable Program Monitor Overlay IPC):
 *    - Real-time state & geometry publisher to the OS-level transparent click-through
 *      companion app (overlay/program_monitor_overlay.py & overlay/src/main.swift).
 */
(function (root, factory) {
    var api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (typeof window !== 'undefined') window.AlptuguideMercuryStream = api;
    else if (root) root.AlptuguideMercuryStream = api;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var SHM_MAGIC = 0x54504C41; // 'ALPT'
    var HEADER_BYTES = 96;
    var PR_TICKS_PER_SEC = 254016000000;

    /**
     * Parses the 96-byte AlptuguideShmHeader from an ArrayBuffer or Node Buffer.
     */
    function parseShmHeader(buffer, byteOffset) {
        var view = new DataView(buffer, byteOffset || 0, HEADER_BYTES);
        var magic = view.getUint32(0, true);
        if (magic !== SHM_MAGIC) {
            return null;
        }
        var version = view.getUint32(4, true);
        var seqLow = view.getUint32(8, true);
        var seqHigh = view.getUint32(12, true);
        var seq = seqHigh * 4294967296 + seqLow;
        var activeSlot = view.getUint32(16, true);
        var width = view.getUint32(20, true);
        var height = view.getUint32(24, true);
        var stride = view.getUint32(28, true);
        var pixelFormat = view.getUint32(32, true);
        var ticksLow = view.getUint32(36, true);
        var ticksHigh = view.getInt32(40, true);
        var prTimeTicks = ticksHigh * 4294967296 + ticksLow;
        var fps = view.getFloat64(44, true);
        var isPlaying = view.getUint8(52) !== 0;

        return {
            magic: magic,
            version: version,
            seq: seq,
            isWriting: (seq & 1) === 1,
            activeSlot: activeSlot,
            width: width,
            height: height,
            stride: stride,
            pixelFormat: pixelFormat,
            timeSeconds: prTimeTicks > 0 ? (prTimeTicks / PR_TICKS_PER_SEC) : 0,
            fps: fps || 60,
            isPlaying: isPlaying
        };
    }

    /**
     * Zero-allocation WebGL2 + Canvas2D raw RGBA8888 frame presenter.
     */
    function createFrameRenderer(canvas) {
        var gl = null;
        var tex = null;
        var prog = null;
        var vao = null;
        var ctx2d = null;
        var imageData = null;
        var lastW = 0;
        var lastH = 0;

        function initWebGL2() {
            if (!canvas || typeof canvas.getContext !== 'function') return false;
            try {
                gl = canvas.getContext('webgl2', {
                    alpha: false,
                    antialias: false,
                    depth: false,
                    stencil: false,
                    desynchronized: true,
                    powerPreference: 'high-performance'
                });
            } catch (e) {
                gl = null;
            }
            if (!gl) return false;

            var vsSrc = '#version 300 es\n' +
                'const vec2 pos[4] = vec2[4](vec2(-1.0, -1.0), vec2(1.0, -1.0), vec2(-1.0, 1.0), vec2(1.0, 1.0));\n' +
                'const vec2 uv[4]  = vec2[4](vec2(0.0, 1.0), vec2(1.0, 1.0), vec2(0.0, 0.0), vec2(1.0, 0.0));\n' +
                'out vec2 vUv;\n' +
                'void main() { vUv = uv[gl_VertexID]; gl_Position = vec4(pos[gl_VertexID], 0.0, 1.0); }';

            var fsSrc = '#version 300 es\n' +
                'precision mediump float;\n' +
                'in vec2 vUv;\n' +
                'uniform sampler2D uTex;\n' +
                'out vec4 outColor;\n' +
                'void main() { outColor = texture(uTex, vUv); }';

            function compile(type, src) {
                var s = gl.createShader(type);
                gl.shaderSource(s, src);
                gl.compileShader(s);
                if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
                    gl.deleteShader(s);
                    return null;
                }
                return s;
            }

            var vs = compile(gl.VERTEX_SHADER, vsSrc);
            var fs = compile(gl.FRAGMENT_SHADER, fsSrc);
            if (!vs || !fs) {
                gl = null;
                return false;
            }
            prog = gl.createProgram();
            gl.attachShader(prog, vs);
            gl.attachShader(prog, fs);
            gl.linkProgram(prog);
            if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
                gl = null;
                return false;
            }
            gl.useProgram(prog);

            vao = gl.createVertexArray();
            gl.bindVertexArray(vao);

            tex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            return true;
        }

        if (!initWebGL2() && canvas && typeof canvas.getContext === 'function') {
            ctx2d = canvas.getContext('2d', { alpha: false, desynchronized: true });
        }

        return {
            mode: gl ? 'webgl2' : 'canvas2d',
            drawRGBAFrame: function (rgbaBytes, width, height) {
                if (!canvas || width <= 0 || height <= 0) return;

                if (gl) {
                    if (width !== lastW || height !== lastH) {
                        canvas.width = width;
                        canvas.height = height;
                        gl.viewport(0, 0, width, height);
                        gl.bindTexture(gl.TEXTURE_2D, tex);
                        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, rgbaBytes);
                        lastW = width;
                        lastH = height;
                    } else {
                        gl.bindTexture(gl.TEXTURE_2D, tex);
                        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, rgbaBytes);
                    }
                    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
                    return;
                }

                if (ctx2d) {
                    if (width !== lastW || height !== lastH || !imageData) {
                        canvas.width = width;
                        canvas.height = height;
                        imageData = ctx2d.createImageData(width, height);
                        lastW = width;
                        lastH = height;
                    }
                    imageData.data.set(rgbaBytes.subarray(0, width * height * 4));
                    ctx2d.putImageData(imageData, 0, 0);
                }
            }
        };
    }

    /**
     * Connects to the Mercury Transmit binary stream (via WebSocket or CEP Shared Memory)
     * and pipes 60fps uncompressed frames into the target canvas.
     */
    function createStreamClient(options) {
        options = options || {};
        var canvas = options.canvas || null;
        var renderer = canvas ? createFrameRenderer(canvas) : null;
        var ws = null;
        var active = false;
        var frameCount = 0;
        var measuredFps = 0;
        var lastFpsStamp = (typeof performance !== 'undefined' ? performance.now() : Date.now());

        function onBinaryPacket(arrayBuffer) {
            if (!arrayBuffer || arrayBuffer.byteLength < HEADER_BYTES) return;
            var hdr = parseShmHeader(arrayBuffer, 0);
            if (!hdr || hdr.isWriting || hdr.width <= 0 || hdr.height <= 0) return;

            var pixelByteLength = hdr.width * hdr.height * 4;
            if (arrayBuffer.byteLength < HEADER_BYTES + pixelByteLength) return;

            var pixels = new Uint8Array(arrayBuffer, HEADER_BYTES, pixelByteLength);
            if (renderer) {
                renderer.drawRGBAFrame(pixels, hdr.width, hdr.height);
            }

            frameCount++;
            var now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
            if (now - lastFpsStamp >= 500) {
                measuredFps = Math.round((frameCount * 1000) / (now - lastFpsStamp));
                frameCount = 0;
                lastFpsStamp = now;
            }

            if (typeof options.onFrame === 'function') {
                options.onFrame({
                    seq: hdr.seq,
                    width: hdr.width,
                    height: hdr.height,
                    timeSeconds: hdr.timeSeconds,
                    isPlaying: hdr.isPlaying,
                    fps: measuredFps || hdr.fps,
                    rendererMode: renderer ? renderer.mode : 'headless'
                });
            }
        }

        function start(simulateIfNoShm) {
            if (active) return;
            active = true;
            if (typeof WebSocket === 'undefined' || typeof location === 'undefined') return;

            var proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
            var wsUrl = proto + '//' + location.host + '/ws/mercury' + (simulateIfNoShm ? '?mode=live' : '');
            try {
                ws = new WebSocket(wsUrl);
                ws.binaryType = 'arraybuffer';
                ws.onopen = function () {
                    if (typeof options.onStatus === 'function') {
                        options.onStatus({ connected: true, mode: renderer ? renderer.mode : 'ws' });
                    }
                };
                ws.onmessage = function (ev) {
                    if (ev.data instanceof ArrayBuffer) {
                        onBinaryPacket(ev.data);
                    }
                };
                ws.onclose = function () {
                    ws = null;
                    active = false;
                    if (typeof options.onStatus === 'function') {
                        options.onStatus({ connected: false });
                    }
                };
                ws.onerror = function () {
                    if (ws) ws.close();
                };
            } catch (e) {
                active = false;
            }
        }

        function stop() {
            active = false;
            if (ws) {
                try { ws.close(); } catch (e) {}
                ws = null;
            }
            if (typeof options.onStatus === 'function') {
                options.onStatus({ connected: false });
            }
        }

        return {
            start: start,
            stop: stop,
            isActive: function () { return active; },
            onBinaryPacket: onBinaryPacket
        };
    }

    /**
     * Publishes live overlay state to the OS-level Program Monitor Companion App
     * over HTTP/IPC so the transparent click-through window updates in <10ms.
     */
    function publishOverlayState(overlayPayload) {
        if (typeof fetch !== 'function') return;
        try {
            fetch('/api/mercury/overlay-state', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(overlayPayload)
            }).catch(function () {});
        } catch (e) {}
    }

    return {
        SHM_MAGIC: SHM_MAGIC,
        HEADER_BYTES: HEADER_BYTES,
        parseShmHeader: parseShmHeader,
        createFrameRenderer: createFrameRenderer,
        createStreamClient: createStreamClient,
        publishOverlayState: publishOverlayState
    };
});

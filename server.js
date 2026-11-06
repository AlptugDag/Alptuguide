/**
 * Alptuguide Studio — High-Performance Static, Mercury Transmit Binary Stream & Overlay IPC Server
 * Serves the NLE Studio Panel & Web Preview on 0.0.0.0:3000 with zero external dependencies.
 *
 * Includes:
 * 1. RFC 6455 Binary WebSocket Endpoint (/ws/mercury) piping 60fps uncompressed frames from
 *    Premiere Pro C++ Mercury Transmit Shared Memory (/dev/shm/alptuguide_mercury_v1) or
 *    real-time synthetic GPU test frames directly into the panel's WebGL2 canvas.
 * 2. OS-Level Transparent Program Monitor Overlay IPC state bus (/api/mercury/overlay-state).
 */
'use strict';

const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';
const ROOT = __dirname;

const SHM_MAGIC = 0x54504C41; // 'ALPT'
const SHM_HEADER_BYTES = 96;
const SHM_PATHS = [
    '/dev/shm/alptuguide_mercury_v1',
    '/tmp/alptuguide_mercury_v1'
];

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.icns': 'application/octet-stream',
    '.ttf': 'font/ttf',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime'
};

// In-memory cache for frequently accessed static assets (fonts, icons, core scripts)
const assetCache = new Map();

// Live IPC state shared with OS-Level Program Monitor Overlay companion (program_monitor_overlay.py & main.swift)
let liveOverlayState = {
    visible: false,
    host: 'PPRO',
    platform: 'reels',
    showSafeZones: true,
    showMockUi: true,
    feed45: false,
    grid34: false,
    thirds: false,
    center: false,
    broadcast: false,
    opacity: 1.0,
    aspect: 9 / 16,
    rev: 1,
    updatedAt: Date.now()
};

function serveStaticFile(req, res, filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const isImmutableAsset = ext === '.ttf' || ext === '.woff2' || ext === '.png' || ext === '.svg';

    if (isImmutableAsset && assetCache.has(filePath)) {
        const cached = assetCache.get(filePath);
        res.writeHead(200, {
            'Content-Type': contentType,
            'Content-Length': cached.length,
            'Cache-Control': 'public, max-age=3600'
        });
        if (req.method === 'HEAD') {
            res.end();
        } else {
            res.end(cached);
        }
        return;
    }

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ ok: false, error: 'Not Found' }));
            return;
        }

        // Handle HTTP Range requests for video streaming
        const range = req.headers.range;
        if (range && (ext === '.mp4' || ext === '.webm' || ext === '.mov')) {
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
            if (start >= stats.size || end >= stats.size) {
                res.writeHead(416, { 'Content-Range': `bytes */${stats.size}` });
                res.end();
                return;
            }
            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${stats.size}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': end - start + 1,
                'Content-Type': contentType
            });
            fs.createReadStream(filePath, { start, end }).pipe(res);
            return;
        }

        fs.readFile(filePath, (readErr, data) => {
            if (readErr) {
                res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ ok: false, error: 'Internal Server Error' }));
                return;
            }
            if (isImmutableAsset && data.length < 2 * 1024 * 1024) {
                assetCache.set(filePath, data);
            }
            res.writeHead(200, {
                'Content-Type': contentType,
                'Content-Length': data.length,
                'Cache-Control': isImmutableAsset ? 'public, max-age=3600' : 'no-cache'
            });
            if (req.method === 'HEAD') {
                res.end();
            } else {
                res.end(data);
            }
        });
    });
}

// ---------------------------------------------------------------------------
// Mercury Transmit Shared Memory Reader & High-Speed Frame Generator
// ---------------------------------------------------------------------------
function findActiveShmPath() {
    for (const p of SHM_PATHS) {
        try {
            if (fs.existsSync(p)) return p;
        } catch (e) {}
    }
    return null;
}

let simSeq = 2;
const SIM_W = 270;
const SIM_H = 480;
const SIM_PACKET = Buffer.allocUnsafe(SHM_HEADER_BYTES + SIM_W * SIM_H * 4);

function buildMercuryFramePacket(tSec) {
    const shmPath = findActiveShmPath();
    if (shmPath) {
        try {
            const fd = fs.openSync(shmPath, 'r');
            const hdrBuf = Buffer.allocUnsafe(SHM_HEADER_BYTES);
            fs.readSync(fd, hdrBuf, 0, SHM_HEADER_BYTES, 0);
            const magic = hdrBuf.readUInt32LE(0);
            const seq1 = hdrBuf.readBigUInt64LE(8);
            const slot = hdrBuf.readUInt32LE(16);
            const w = hdrBuf.readUInt32LE(20);
            const h = hdrBuf.readUInt32LE(24);
            if (magic === SHM_MAGIC && (seq1 & 1n) === 0n && w > 0 && h > 0 && w <= 1080 && h <= 1920) {
                const frameBytes = w * h * 4;
                const slotOffset = SHM_HEADER_BYTES + slot * (1080 * 1920 * 4);
                const out = Buffer.allocUnsafe(SHM_HEADER_BYTES + frameBytes);
                hdrBuf.copy(out, 0);
                fs.readSync(fd, out, SHM_HEADER_BYTES, frameBytes, slotOffset);
                fs.closeSync(fd);
                return out;
            }
            fs.closeSync(fd);
        } catch (e) {}
    }

    // Real-time Mercury Transmit 60fps pipeline synthesis when running outside Premiere Pro C++ host
    simSeq += 2;
    SIM_PACKET.fill(0, 0, SHM_HEADER_BYTES);
    SIM_PACKET.writeUInt32LE(SHM_MAGIC, 0);
    SIM_PACKET.writeUInt32LE(1, 4);
    SIM_PACKET.writeUInt32LE(simSeq >>> 0, 8);
    SIM_PACKET.writeUInt32LE(0, 12);
    SIM_PACKET.writeUInt32LE(0, 16);
    SIM_PACKET.writeUInt32LE(SIM_W, 20);
    SIM_PACKET.writeUInt32LE(SIM_H, 24);
    SIM_PACKET.writeUInt32LE(SIM_W * 4, 28);
    SIM_PACKET.writeUInt32LE(1, 32); // RGBA8888
    const prTicks = BigInt(Math.floor((tSec % 15) * 254016000000));
    SIM_PACKET.writeBigInt64LE(prTicks, 36);
    SIM_PACKET.writeDoubleLE(60.0, 44);
    SIM_PACKET.writeUInt8(1, 52);

    const cx = SIM_W * (0.5 + 0.18 * Math.sin(tSec * 1.7));
    const cy = SIM_H * (0.42 + 0.14 * Math.cos(tSec * 1.3));
    const scanY = Math.floor(((tSec * 180) % SIM_H));

    let ptr = SHM_HEADER_BYTES;
    for (let y = 0; y < SIM_H; y++) {
        const ny = y / SIM_H;
        const dy = y - cy;
        const isScanline = Math.abs(y - scanY) <= 1;
        for (let x = 0; x < SIM_W; x++) {
            const dx = x - cx;
            const distSq = dx * dx + dy * dy;
            const glow = distSq < 6400 ? ((6400 - distSq) / 6400) : 0;

            let r = Math.min(255, Math.floor(14 + ny * 28 + glow * 16));
            let g = Math.min(255, Math.floor(24 + (1 - ny) * 44 + glow * 175));
            let b = Math.min(255, Math.floor(46 + ny * 68 + glow * 145));
            if (isScanline) {
                r = Math.min(255, r + 25);
                g = Math.min(255, g + 70);
                b = Math.min(255, b + 55);
            }

            SIM_PACKET[ptr++] = r;
            SIM_PACKET[ptr++] = g;
            SIM_PACKET[ptr++] = b;
            SIM_PACKET[ptr++] = 255;
        }
    }
    return SIM_PACKET;
}

function encodeWsBinaryFrame(payloadBuffer) {
    const len = payloadBuffer.length;
    let header;
    if (len < 126) {
        header = Buffer.allocUnsafe(2);
        header[0] = 0x82; // FIN + Binary opcode (0x2)
        header[1] = len;
    } else if (len < 65536) {
        header = Buffer.allocUnsafe(4);
        header[0] = 0x82;
        header[1] = 126;
        header.writeUInt16BE(len, 2);
    } else {
        header = Buffer.allocUnsafe(10);
        header[0] = 0x82;
        header[1] = 127;
        header.writeBigUInt64BE(BigInt(len), 2);
    }
    return Buffer.concat([header, payloadBuffer]);
}

const server = http.createServer((req, res) => {
    const rawUrl = req.url || '/';
    const parsedUrl = new URL(rawUrl, `http://${req.headers.host || 'localhost'}`);
    const pathname = decodeURIComponent(parsedUrl.pathname);

    if (pathname === '/api/health') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true, service: 'Alptuguide Studio', version: '3.4.0' }));
        return;
    }

    if (pathname === '/api/mercury/status') {
        const shmPath = findActiveShmPath();
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
            ok: true,
            nativeShmActive: Boolean(shmPath),
            shmPath: shmPath || ALPTUGUIDE_DEFAULT_SHM_HINT(),
            wsEndpoint: '/ws/mercury',
            overlayIpcEndpoint: '/api/mercury/overlay-state',
            overlayState: liveOverlayState
        }));
        return;
    }

    if (pathname === '/api/mercury/overlay-state') {
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
                if (body.length < 65536) body += chunk;
            });
            req.on('end', () => {
                try {
                    const incoming = JSON.parse(body || '{}');
                    liveOverlayState = Object.assign({}, liveOverlayState, incoming, {
                        rev: (liveOverlayState.rev + 1) % 1000000,
                        updatedAt: Date.now()
                    });
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ ok: true, state: liveOverlayState }));
                } catch (e) {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ ok: false, error: 'Invalid JSON' }));
                }
            });
            return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(liveOverlayState));
        return;
    }

    if (pathname === '/' || pathname === '/index.html') {
        serveStaticFile(req, res, path.join(ROOT, 'index.html'));
        return;
    }

    // Prevent directory traversal
    const safeRel = path.normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, '');
    const targetPath = path.join(ROOT, safeRel);
    if (!targetPath.startsWith(ROOT)) {
        res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: 'Forbidden' }));
        return;
    }

    serveStaticFile(req, res, targetPath);
});

function ALPTUGUIDE_DEFAULT_SHM_HINT() {
    return process.platform === 'win32' ? 'Local\\AlptuguideMercuryV1' : '/alptuguide_mercury_v1';
}

// ---------------------------------------------------------------------------
// Zero-Dependency RFC 6455 WebSocket Server for 60fps Mercury Transmit Pipe
// ---------------------------------------------------------------------------
const wsClients = new Set();
let wsBroadcastTimer = null;
const streamStartMs = Date.now();

function startMercuryBroadcastLoop() {
    if (wsBroadcastTimer) return;
    wsBroadcastTimer = setInterval(() => {
        if (wsClients.size === 0) {
            clearInterval(wsBroadcastTimer);
            wsBroadcastTimer = null;
            return;
        }
        const elapsedSec = (Date.now() - streamStartMs) / 1000;
        const packet = buildMercuryFramePacket(elapsedSec);
        const wsFrame = encodeWsBinaryFrame(packet);
        for (const sock of wsClients) {
            if (sock.destroyed || !sock.writable) {
                wsClients.delete(sock);
                continue;
            }
            // Backpressure guard: drop frame if kernel socket send buffer is backed up
            if (sock.writableLength < 2 * 1024 * 1024) {
                sock.write(wsFrame);
            }
        }
    }, 16); // ~60fps (16.6ms)
}

server.on('upgrade', (req, socket) => {
    const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    if (parsedUrl.pathname !== '/ws/mercury') {
        socket.destroy();
        return;
    }
    const key = req.headers['sec-websocket-key'];
    if (!key) {
        socket.destroy();
        return;
    }
    const accept = crypto
        .createHash('sha1')
        .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
        .digest('base64');

    socket.write(
        'HTTP/1.1 101 Switching Protocols\r\n' +
        'Upgrade: websocket\r\n' +
        'Connection: Upgrade\r\n' +
        `Sec-WebSocket-Accept: ${accept}\r\n\r\n`
    );
    socket.setNoDelay(true);
    wsClients.add(socket);
    startMercuryBroadcastLoop();

    socket.on('data', buf => {
        // Check for client close frame (opcode 0x8)
        if (buf.length > 0 && (buf[0] & 0x0f) === 0x08) {
            wsClients.delete(socket);
            socket.end();
        }
    });
    socket.on('close', () => wsClients.delete(socket));
    socket.on('error', () => wsClients.delete(socket));
});

server.listen(PORT, HOST, () => {
    console.log(`Alptuguide Studio running at http://${HOST}:${PORT}`);
});

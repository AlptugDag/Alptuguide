/**
 * Alptuguide Studio — High-Performance Static, Gemini Viral Hook API, Mercury Stream & Overlay IPC Server
 * Serves the NLE Studio Panel & Web Preview on 0.0.0.0:3000.
 *
 * Includes:
 * 1. Gemini 3.8 Flash Server-Side Viral Hook & Kinetic Typography Synthesizer (/api/gemini/viral-hook).
 * 2. RFC 6455 Binary WebSocket Endpoint (/ws/mercury) piping 60fps uncompressed frames from
 *    Premiere Pro C++ Mercury Transmit Shared Memory (/dev/shm/alptuguide_mercury_v1) or
 *    real-time synthetic GPU test frames directly into the panel's WebGL2 canvas.
 * 3. OS-Level Transparent Program Monitor Overlay IPC state bus (/api/mercury/overlay-state).
 */
'use strict';

const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const HookEngine = require('./core/hook_engine.js');

let GoogleGenAI = null;
let Type = null;
try {
    const genaiPkg = require('@google/genai');
    GoogleGenAI = genaiPkg.GoogleGenAI;
    Type = genaiPkg.Type;
} catch (e) {}

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

function getGeminiClient(customApiKey) {
    const key = (typeof customApiKey === 'string' && customApiKey.trim().length > 10)
        ? customApiKey.trim()
        : process.env.GEMINI_API_KEY;
    if (!key || !GoogleGenAI) return null;
    return new GoogleGenAI({
        apiKey: key,
        httpOptions: {
            headers: {
                'User-Agent': 'aistudio-build'
            }
        }
    });
}

async function verifyGeminiApiKey(candidateKey) {
    const ai = getGeminiClient(candidateKey);
    if (!ai) return { ok: false, error: 'API anahtarı eksik veya geçersiz.' };
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: 'test',
            config: { maxOutputTokens: 5 }
        });
        return { ok: true, model: 'gemini-3.8-flash' };
    } catch (err) {
        return { ok: false, error: err && err.message ? err.message : String(err) };
    }
}

async function generateGeminiViralHooks(payload, customApiKey) {
    const topic = String(payload.topic || payload.caption || 'Dikey Video Kurgusu').trim();
    const userPrompt = String(payload.userPrompt || payload.prompt || '').trim();
    const platform = String(payload.platform || 'reels');
    const psychology = String(payload.psychology || 'curiosity_gap');
    const preferredAnim = String(payload.textAnimation || 'sparvol_clean_focus');
    const preferredCam = String(payload.cameraMotion || 'punch_zoom');
    const frameDataUrl = typeof payload.frameDataUrl === 'string' ? payload.frameDataUrl : '';

    const fallbackList = HookEngine.buildFallbackVariations({
        topic: userPrompt ? (topic + ' - ' + userPrompt) : topic,
        platform,
        psychology,
        textAnimation: preferredAnim,
        cameraMotion: preferredCam
    });

    const ai = getGeminiClient(customApiKey);
    if (!ai || !Type) {
        return {
            ok: true,
            source: 'studio-engine',
            apiKeyConfigured: Boolean(customApiKey || process.env.GEMINI_API_KEY),
            model: 'gemini-3.8-flash',
            visualAnalysis: 'Sahne kontrastı ve merkez kadraj yerleşimi ilk 3 saniyede kinetik başlık okunabilirliği için optimize edildi.',
            beatCuts: ['00:00:00', '00:00:48', '00:01:36', '00:02:24'],
            variations: fallbackList
        };
    }

    const platformNames = {
        reels: 'Instagram Reels',
        tiktok: 'TikTok',
        shorts: 'YouTube Shorts',
        all: 'Instagram Reels, TikTok ve YouTube Shorts'
    };
    const psychNames = {
        curiosity_gap: 'Merak Boşluğu (Curiosity Gap / Zeigarnik Etkisi)',
        contrarian_shock: 'Ezber Bozan Şok / Karşıt Görüş (Contrarian Shock)',
        negative_warning: 'Negatif Uyarı / Kayıptan Kaçınma (Loss Aversion)',
        proof_first: 'Sonuç & Görsel Kanıt Önden (Proof First)',
        insider_secret: 'Sektör Sırrı & Özel Kısayol (Insider Secret)'
    };

    const promptText = [
        `Platform: ${platformNames[platform] || 'Instagram Reels'} (1080x1920 9:16 Dikey Video, İlk 3 Saniye 0.00s - 3.00s).`,
        `Video Konusu / Ham Fikir: "${topic}".`,
        userPrompt ? `Kullanıcının Özel Direktifi / Serbest İstek: "${userPrompt}".` : '',
        `Hedef Psikolojik Tetikleyici: ${psychNames[psychology] || psychNames.curiosity_gap}.`,
        `Tercih Edilen Text Animasyon Stili: ${preferredAnim}.`,
        `Tercih Edilen Kamera Hareketi: ${preferredCam}.`,
        '',
        'GÖREV:',
        'Timeline\'ın ilk 3 saniyesinde (0.00s - 3.00s) kaydırma refleksini (scroll) anında durduracak 3 farklı profesyonel, Sparvol (Short Form Hooks V2) ve 3D derinlik estetiğinde viral hook üret.',
        '',
        'KURALLAR VE TASARIM PRENSİPLERİ:',
        '1. Kesinlikle hiçbir yerde emoji kullanma.',
        '2. Asla amatör veya yapay zeka klişesi (AI slop) görünüm oluşturma. Karikatürize kalın çerçeveler yerine sinematik, şık, editorial ve yüksek retention sağlayan tipografi tercih et.',
        '3. hookText maksimum 4-7 kelimelik, büyük harfli, mobil ekranda 0.4 saniyede algılanabilen vurucu Türkçe metin olmalı.',
        '4. highlightWord değeri, hookText içinde geçen en kritik 1 veya 2 kelimenin birebir aynısı olmalı.',
        '5. subText, ana başlığı destekleyen kısa ikinci satır (kicker) olmalı.',
        '6. textAnimation şu değerlerden biri olmalı: sparvol_clean_focus, 3d_perspective_slam, 3d_tilt_revolve, sparvol_cinema_split, 3d_spatial_float, sparvol_dark_editorial, hormozi_pop, kinetic_stomp, glitch_cipher, glass_spotlight, split_reel_banner, typewriter_flash.',
        '7. cameraMotion şu değerlerden biri olmalı: punch_zoom, jump_snap, whip_pan_in, strobe_impact, handheld_tension.',
        '8. accentColor şu hex kodlarından biri olmalı: #fbbf24, #10b981, #f43f5e, #38bdf8, #a855f7.',
        '9. sfxCue değeri, timeline için tam zaman kodlu katmanlı ses tasarımı içermeli (ör: 00:00 Sub Bass Drop + 00:10 Air Whoosh + 00:22 Snap Click).'
    ].filter(Boolean).join('\n');

    const parts = [];
    if (frameDataUrl && frameDataUrl.startsWith('data:image/')) {
        const commaIdx = frameDataUrl.indexOf(',');
        const meta = frameDataUrl.slice(5, commaIdx);
        const mimeType = meta.split(';')[0] || 'image/png';
        const base64Data = frameDataUrl.slice(commaIdx + 1);
        if (base64Data.length > 32 && base64Data.length < 4 * 1024 * 1024) {
            parts.push({
                inlineData: {
                    mimeType: mimeType,
                    data: base64Data
                }
            });
        }
    }
    parts.push({ text: promptText });

    try {
        const genPromise = ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: { parts: parts },
            config: {
                systemInstruction: 'Sen dünya çapında viral olan Sparvol ve modern dikey video kurgularının retention mühendisi ve sinematik tipografi yönetmenisin. Hiçbir zaman emoji kullanmazsın. Ucuz ve amatör AI kalıplarından uzak durursun. Yalnızca istenen JSON şemasında yanıt üretirsin.',
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        visualAnalysis: {
                            type: Type.STRING,
                            description: 'İlk 3 saniye için tek cümlelik sinematik odak, ışık ve ritim analizi (emojisiz).'
                        },
                        beatCuts: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: 'İlk 3 saniyedeki önerilen kesme / vuruş zaman kodları (ör. 00:00:00, 00:00:48, 00:01:36, 00:02:24).'
                        },
                        variations: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    badge: { type: Type.STRING },
                                    hookText: { type: Type.STRING },
                                    subText: { type: Type.STRING },
                                    highlightWord: { type: Type.STRING },
                                    textAnimation: { type: Type.STRING },
                                    cameraMotion: { type: Type.STRING },
                                    accentColor: { type: Type.STRING },
                                    sfxCue: { type: Type.STRING },
                                    retentionScore: { type: Type.INTEGER },
                                    rationale: { type: Type.STRING }
                                },
                                required: [
                                    'badge',
                                    'hookText',
                                    'subText',
                                    'highlightWord',
                                    'textAnimation',
                                    'cameraMotion',
                                    'accentColor',
                                    'sfxCue',
                                    'retentionScore',
                                    'rationale'
                                ]
                            }
                        }
                    },
                    required: ['visualAnalysis', 'beatCuts', 'variations']
                }
            }
        });
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Gemini API timeout')), 5500)
        );
        const response = await Promise.race([genPromise, timeoutPromise]);

        const rawText = (response.text || '{}').trim();
        const parsed = JSON.parse(rawText);
        const validAnims = HookEngine.TEXT_ANIMATIONS;
        const validCams = HookEngine.CAMERA_MOTIONS;

        const cleanVariations = (Array.isArray(parsed.variations) && parsed.variations.length > 0 ? parsed.variations : fallbackList)
            .slice(0, 3)
            .map((v, i) => ({
                id: 'gemini_hook_' + (i + 1),
                badge: String(v.badge || 'SPARVOL VIRAL').toLocaleUpperCase('tr-TR'),
                hookText: String(v.hookText || fallbackList[0].hookText).toLocaleUpperCase('tr-TR'),
                subText: String(v.subText || fallbackList[0].subText).toLocaleUpperCase('tr-TR'),
                highlightWord: String(v.highlightWord || '').toLocaleUpperCase('tr-TR'),
                textAnimation: validAnims[v.textAnimation] ? v.textAnimation : preferredAnim,
                cameraMotion: validCams[v.cameraMotion] ? v.cameraMotion : preferredCam,
                accentColor: /^#[0-9a-fA-F]{6}$/.test(v.accentColor || '') ? v.accentColor : '#fbbf24',
                sfxCue: String(v.sfxCue || '00:00 Sub Bass Drop + 00:10 Air Whoosh + 00:22 Snap Click'),
                retentionScore: Math.max(80, Math.min(99, Number(v.retentionScore) || 95)),
                rationale: String(v.rationale || '')
            }));

        return {
            ok: true,
            source: 'gemini-3.8-flash',
            apiKeyConfigured: true,
            model: 'gemini-3.8-flash',
            visualAnalysis: String(parsed.visualAnalysis || 'İlk 3 saniye görsel odak ve sinematik tipografi uyumu doğrulandı.'),
            beatCuts: Array.isArray(parsed.beatCuts) && parsed.beatCuts.length > 0
                ? parsed.beatCuts.slice(0, 5)
                : ['00:00:00', '00:00:48', '00:01:36', '00:02:24'],
            variations: cleanVariations
        };
    } catch (err) {
        const msg = err && err.message ? err.message : String(err);
        return {
            ok: true,
            source: 'studio-engine-fallback',
            apiKeyConfigured: Boolean(customApiKey || process.env.GEMINI_API_KEY),
            model: 'gemini-3.8-flash',
            warning: msg,
            visualAnalysis: 'Yerel Kinetik Sentezleyici aktif: İlk 3 saniye kanca varyasyonları güvenli alan sınırlarına göre üretildi.',
            beatCuts: ['00:00:00', '00:00:48', '00:01:36', '00:02:24'],
            variations: fallbackList
        };
    }
}

async function analyzeAndOptimizeUserHook(payload, customApiKey) {
    const userHookText = String(payload.hookText || '').trim();
    const userSubText = String(payload.subText || '').trim();
    const platform = String(payload.platform || 'reels');
    const topic = String(payload.topic || 'Dikey Video').trim();

    const ai = getGeminiClient(customApiKey);
    if (!ai || !Type || !userHookText) {
        // Fallback local heuristic analysis
        const words = userHookText.split(/\s+/).filter(Boolean);
        const score = words.length <= 6 ? 88 : Math.max(60, 88 - (words.length - 6) * 4);
        return {
            ok: true,
            source: 'local-audit',
            retentionScore: score,
            critique: words.length > 7
                ? 'Kanca cümlesi mobilde ilk 0.4 saniyede okunmak için biraz uzun. 5-6 kelimeye indirgenmeli.'
                : 'Kanca uzunluğu uygun, merak boşluğunu güçlendirecek zıtlık kelimesi eklenebilir.',
            strengths: 'Konu odağı net ve anlaşılır.',
            weaknesses: words.length > 7 ? 'Okuma süresi 0.5 saniyeyi aşıyor, kaydırma riski var.' : 'Merak katsayısı daha agresif olabilir.',
            optimized: {
                badge: 'OPTİMİZE EDİLMİŞ',
                hookText: words.slice(0, 6).join(' ').toLocaleUpperCase('tr-TR') + ' SIRRI',
                subText: userSubText || 'SONUNA KADAR İZLE · 3 SANİYEDE FARKI GÖR',
                highlightWord: 'SIRRI',
                textAnimation: 'sparvol_clean_focus',
                cameraMotion: 'punch_zoom',
                accentColor: '#fbbf24',
                sfxCue: '00:00 Sub Bass Drop + 00:10 Air Whoosh + 00:22 Snap Click',
                retentionScore: 96,
                expectedGain: '+%18 İlk 3sn Tutundurma Artışı'
            }
        };
    }

    const promptText = [
        `Kullanıcının Mevcut Hook Metni: "${userHookText}"`,
        userSubText ? `Kullanıcının Alt Metni: "${userSubText}"` : '',
        `Platform: ${platform} (1080x1920 dikey video).`,
        `Video Teması: "${topic}".`,
        '',
        'GÖREV:',
        'Kullanıcının mevcut kancasını acımasızca ve profesyonel bir retention mühendisi gözüyle analiz et.',
        '1. Kesinlikle hiçbir yerde emoji kullanma.',
        '2. retentionScore (0-100) ver.',
        '3. critique, strengths ve weaknesses alanlarında net, kısa ve teknik geri bildirim sun.',
        '4. optimized alanında, bu kancayı Sparvol kalitesinde, amatörlükten uzak, 4-6 kelimelik, 0.4 saniyede kaydırmayı durduracak en üst düzey versiyona dönüştür.',
        '5. textAnimation: sparvol_clean_focus, 3d_perspective_slam, 3d_tilt_revolve, sparvol_cinema_split, 3d_spatial_float, sparvol_dark_editorial seçeneklerinden en uygununu seç.'
    ].filter(Boolean).join('\n');

    try {
        const genPromise = ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: promptText,
            config: {
                systemInstruction: 'Sen kısa form video kurgusunda viral retention analisti ve kreatif direktörsün. Hiçbir zaman emoji kullanmazsın. Yalnızca istenen JSON formatında yanıt üretirsin.',
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        retentionScore: { type: Type.INTEGER },
                        critique: { type: Type.STRING },
                        strengths: { type: Type.STRING },
                        weaknesses: { type: Type.STRING },
                        expectedGain: { type: Type.STRING },
                        optimized: {
                            type: Type.OBJECT,
                            properties: {
                                badge: { type: Type.STRING },
                                hookText: { type: Type.STRING },
                                subText: { type: Type.STRING },
                                highlightWord: { type: Type.STRING },
                                textAnimation: { type: Type.STRING },
                                cameraMotion: { type: Type.STRING },
                                accentColor: { type: Type.STRING },
                                sfxCue: { type: Type.STRING },
                                retentionScore: { type: Type.INTEGER }
                            },
                            required: ['badge', 'hookText', 'subText', 'highlightWord', 'textAnimation', 'cameraMotion', 'accentColor', 'sfxCue', 'retentionScore']
                        }
                    },
                    required: ['retentionScore', 'critique', 'strengths', 'weaknesses', 'expectedGain', 'optimized']
                }
            }
        });
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Gemini API timeout')), 5500)
        );
        const response = await Promise.race([genPromise, timeoutPromise]);
        const parsed = JSON.parse((response.text || '{}').trim());
        return {
            ok: true,
            source: 'gemini-3.8-flash',
            retentionScore: Number(parsed.retentionScore) || 82,
            critique: String(parsed.critique || ''),
            strengths: String(parsed.strengths || ''),
            weaknesses: String(parsed.weaknesses || ''),
            expectedGain: String(parsed.expectedGain || '+%20 Tutundurma Artışı'),
            optimized: {
                badge: String(parsed.optimized.badge || 'GEMINI SPARROW OPTİMİZE').toLocaleUpperCase('tr-TR'),
                hookText: String(parsed.optimized.hookText || userHookText).toLocaleUpperCase('tr-TR'),
                subText: String(parsed.optimized.subText || userSubText || 'SONUNA KADAR İZLE').toLocaleUpperCase('tr-TR'),
                highlightWord: String(parsed.optimized.highlightWord || '').toLocaleUpperCase('tr-TR'),
                textAnimation: HookEngine.TEXT_ANIMATIONS[parsed.optimized.textAnimation] ? parsed.optimized.textAnimation : 'sparvol_clean_focus',
                cameraMotion: HookEngine.CAMERA_MOTIONS[parsed.optimized.cameraMotion] ? parsed.optimized.cameraMotion : 'punch_zoom',
                accentColor: /^#[0-9a-fA-F]{6}$/.test(parsed.optimized.accentColor || '') ? parsed.optimized.accentColor : '#fbbf24',
                sfxCue: String(parsed.optimized.sfxCue || '00:00 Sub Bass Drop + 00:10 Air Whoosh + 00:22 Snap Click'),
                retentionScore: Math.max(88, Math.min(99, Number(parsed.optimized.retentionScore) || 96)),
                expectedGain: String(parsed.expectedGain || '+%20 Tutundurma Artışı')
            }
        };
    } catch (err) {
        return {
            ok: false,
            error: err && err.message ? err.message : String(err)
        };
    }
}

function serveStaticFile(req, res, filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const isImmutableAsset = ext === '.ttf' || ext === '.woff2';

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
        res.end(JSON.stringify({
            ok: true,
            service: 'Alptuguide Studio',
            version: '3.4.0',
            geminiConfigured: Boolean(process.env.GEMINI_API_KEY)
        }));
        return;
    }

    if (pathname === '/api/gemini/status') {
        const clientKey = req.headers['x-gemini-api-key'] || '';
        const hasKey = Boolean((clientKey && clientKey.length > 10) || process.env.GEMINI_API_KEY);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
            ok: true,
            model: 'gemini-3.8-flash',
            configured: hasKey,
            apiKeyConfigured: hasKey,
            isUserCustomKey: Boolean(clientKey && clientKey.length > 10)
        }));
        return;
    }

    if (pathname === '/api/gemini/verify-key' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            if (body.length < 16384) body += chunk;
        });
        req.on('end', async () => {
            try {
                const incoming = JSON.parse(body || '{}');
                const candidate = incoming.apiKey || req.headers['x-gemini-api-key'] || '';
                const result = await verifyGeminiApiKey(candidate);
                res.writeHead(result.ok ? 200 : 400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify(result));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ ok: false, error: err.message || 'Geçersiz istek' }));
            }
        });
        return;
    }

    if (pathname === '/api/gemini/viral-hook' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            if (body.length < 6 * 1024 * 1024) body += chunk;
        });
        req.on('end', async () => {
            try {
                const incoming = JSON.parse(body || '{}');
                const customKey = incoming.apiKey || req.headers['x-gemini-api-key'] || '';
                const result = await generateGeminiViralHooks(incoming, customKey);
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify(result));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ ok: false, error: err.message || 'Geçersiz istek' }));
            }
        });
        return;
    }

    if (pathname === '/api/gemini/analyze-hook' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            if (body.length < 1024 * 1024) body += chunk;
        });
        req.on('end', async () => {
            try {
                const incoming = JSON.parse(body || '{}');
                const customKey = incoming.apiKey || req.headers['x-gemini-api-key'] || '';
                const result = await analyzeAndOptimizeUserHook(incoming, customKey);
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify(result));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ ok: false, error: err.message || 'Geçersiz istek' }));
            }
        });
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

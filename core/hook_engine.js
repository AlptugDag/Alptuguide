/**
 * Alptuguide Studio — İlk 3 Saniye Viral Hook & Kinetik Tipografi Motoru
 * Copyright (c) 2026 Alptuğ Dağ (@alptugdag). All rights reserved.
 *
 * Pure mathematical keyframe synthesizer & 60fps Canvas 2D kinetic text renderer
 * for Instagram Reels, TikTok, and YouTube Shorts (0.00s - 3.00s retention window).
 */
(function (root, factory) {
    var Z = (root && root.AlptuguideSafeZones) || (typeof window !== 'undefined' && window.AlptuguideSafeZones) ||
        (typeof require !== 'undefined' ? require('./safezones.js') : null);
    var api = factory(Z);
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (typeof window !== 'undefined') window.AlptuguideHookEngine = api;
    else if (root) root.AlptuguideHookEngine = api;
}(typeof self !== 'undefined' ? self : this, function (Z) {
    'use strict';

    var W = 1080;
    var H = 1920;
    var HOOK_WINDOW_SEC = 3.0;

    var TEXT_ANIMATIONS = {
        sparvol_clean_focus: {
            id: 'sparvol_clean_focus',
            name: 'Sparvol Sinematik Odak (Short Form Hooks V2)',
            desc: 'Torsten Roscoe / Sparvol tarzı ultra-temiz tipografi, yumuşak derinlik vinyeti ve sıfır-klişe zarif kanca'
        },
        '3d_perspective_slam': {
            id: '3d_perspective_slam',
            name: '3D İzometrik Slam & Hacimsel Derinlik',
            desc: '3D kamera uzayından açıyla çarpan, katmanlı derinlik ekstrüzyonlu hacimsel tipografi'
        },
        '3d_tilt_revolve': {
            id: '3d_tilt_revolve',
            name: '3D Mekansal Eksen Rotasyonu & Parıltı',
            desc: 'Yatay ve dikey 3D açısal salınım üzerinde gezen sinematik metalik yansıma sweep efekti'
        },
        sparvol_cinema_split: {
            id: 'sparvol_cinema_split',
            name: 'Sparvol Çift Maske Split & Sinema Çizgisi',
            desc: 'Kamera vizörü gibi ortadan zıt yönlere açılan çift parçalı sinematik maske ve mikro kromatik kenar'
        },
        '3d_spatial_float': {
            id: '3d_spatial_float',
            name: '3D Sıfır Yerçekimi Mekansal Yüzme',
            desc: 'Z ekseninde süzülen 3D harfler, yumuşak zemin gölgesi ve yüksek retention sağlayan hipnotik salınım'
        },
        sparvol_dark_editorial: {
            id: 'sparvol_dark_editorial',
            name: 'Sparvol Dark Editorial & Neon İz',
            desc: 'Lüks koyu tema dergi mizanpajı, üst mikro etiket ve altta neon ışıma çizgisi'
        },
        hormozi_pop: {
            id: 'hormozi_pop',
            name: 'Hormozi Pop & Vurgu Kutu',
            desc: 'Kelime kelime yaylanan pop-in, eğik vurgu kutusu ve sinematik yumuşak gölge'
        },
        kinetic_stomp: {
            id: 'kinetic_stomp',
            name: 'Kinetik Stomp (3 Darbe)',
            desc: '0.0s, 0.45s ve 0.90s anlarında ekrana çarpan yüksek kontrastlı blok tipografi'
        },
        glitch_cipher: {
            id: 'glitch_cipher',
            name: 'Glitch RGB & Şifre Çözüm',
            desc: 'Kromatik RGB ayrışması ve karakter çözülmesiyle kilitlenen siber başlık'
        },
        glass_spotlight: {
            id: 'glass_spotlight',
            name: 'Liquid Glass & Neon Çizgi',
            desc: 'Buzlu koyu cam plaka üzerinde akan neon sınır ve odaklı kelime vurgusu'
        },
        split_reel_banner: {
            id: 'split_reel_banner',
            name: 'Çift Ton Viral Bant',
            desc: 'Üstte yüksek dikkat çeken uyarı şeridi, altta büyük darbeli ana kanca'
        },
        typewriter_flash: {
            id: 'typewriter_flash',
            name: 'Flaş Kesme & Daktilo',
            desc: 'Negatif flaş patlaması ardından kare hassasiyetli daktilo ve alt çizgi'
        }
    };

    var CAMERA_MOTIONS = {
        punch_zoom: {
            id: 'punch_zoom',
            name: 'Smooth Punch Zoom + Sarsıntı',
            desc: '%100 -> %122 eksponansiyel yaklaşma ve ilk 0.45sn oküler refleks sarsıntısı'
        },
        jump_snap: {
            id: 'jump_snap',
            name: 'Ritmik 3x Jump-Cut Sıçrama',
            desc: '0.0s, 0.85s ve 1.75s vuruşlarında %100 -> %110 -> %120 keskin ritmik sıçrama'
        },
        whip_pan_in: {
            id: 'whip_pan_in',
            name: 'Yatay Whip-Pan Savrulma',
            desc: 'İlk 0.28 saniyede yatay savrulma ile merkeze kilitlenen dinamik giriş'
        },
        strobe_impact: {
            id: 'strobe_impact',
            name: 'Strobe Flaş + Gerilim Zum',
            desc: 'İlk 4 karede pozlama flaşı ve 3. saniyeye kadar %114 -> %122 süzülme'
        },
        handheld_tension: {
            id: 'handheld_tension',
            name: 'Organik Handheld Gerilim',
            desc: 'Doğal el kamerası salınımı, mikro rotasyon ve kademeli odak yaklaşması'
        }
    };

    var HOOK_PSYCHOLOGY = {
        curiosity_gap: {
            id: 'curiosity_gap',
            name: 'Merak Boşluğu (Curiosity Gap)'
        },
        contrarian_shock: {
            id: 'contrarian_shock',
            name: 'Ezber Bozan Şok (Contrarian)'
        },
        negative_warning: {
            id: 'negative_warning',
            name: 'Negatif Uyarı (Bunu Yapma)'
        },
        proof_first: {
            id: 'proof_first',
            name: 'Sonuç & Kanıt Önden'
        },
        insider_secret: {
            id: 'insider_secret',
            name: 'Sektör Sırrı & Kısayol'
        }
    };

    function clamp(v, min, max) {
        return Math.max(min, Math.min(max, v));
    }

    function easeOutBack(x) {
        var c1 = 1.70158;
        var c3 = c1 + 1;
        var p = clamp(x, 0, 1) - 1;
        return 1 + c3 * p * p * p + c1 * p * p;
    }

    function easeOutCubic(x) {
        var p = 1 - clamp(x, 0, 1);
        return 1 - p * p * p;
    }

    /**
     * Computes deterministic 60fps camera motion transform for timeSec (in seconds).
     */
    function computeCameraTransform(timeSec, motionId, hookDuration) {
        var dur = Number(hookDuration) || HOOK_WINDOW_SEC;
        var t = Number(timeSec);
        if (isNaN(t) || t < 0 || t > dur) {
            return {
                active: false,
                scale: 1,
                offsetX: 0,
                offsetY: 0,
                rotateDeg: 0,
                flashAlpha: 0,
                rgbSplitPx: 0
            };
        }

        var id = CAMERA_MOTIONS[motionId] ? motionId : 'punch_zoom';
        var scale = 1.0;
        var offsetX = 0;
        var offsetY = 0;
        var rotateDeg = 0;
        var flashAlpha = 0;
        var rgbSplitPx = 0;

        if (id === 'punch_zoom') {
            var punchProgress = easeOutCubic(clamp(t / 2.4, 0, 1));
            scale = 1.0 + 0.22 * punchProgress;
            if (t < 0.48) {
                var decay = Math.pow(1 - t / 0.48, 2);
                offsetX = Math.sin(t * 68) * 16 * decay;
                offsetY = Math.cos(t * 54) * -11 * decay;
                rotateDeg = Math.sin(t * 45) * 1.1 * decay;
            }
        } else if (id === 'jump_snap') {
            if (t < 0.85) {
                scale = 1.04;
                if (t < 0.12) {
                    var d0 = 1 - t / 0.12;
                    offsetX = 9 * d0;
                    offsetY = -7 * d0;
                }
            } else if (t < 1.75) {
                scale = 1.12;
                var dt1 = t - 0.85;
                if (dt1 < 0.12) {
                    var d1 = 1 - dt1 / 0.12;
                    offsetX = -11 * d1;
                    offsetY = 8 * d1;
                }
            } else {
                scale = 1.21;
                var dt2 = t - 1.75;
                if (dt2 < 0.14) {
                    var d2 = 1 - dt2 / 0.14;
                    offsetX = 13 * d2;
                    offsetY = -9 * d2;
                    rgbSplitPx = 6 * d2;
                }
            }
        } else if (id === 'whip_pan_in') {
            if (t < 0.28) {
                var wp = 1 - easeOutBack(t / 0.28);
                offsetX = -140 * wp;
                rotateDeg = -2.4 * wp;
                rgbSplitPx = Math.abs(14 * wp);
            }
            scale = 1.06 + 0.12 * easeOutCubic(clamp(t / 2.6, 0, 1));
        } else if (id === 'strobe_impact') {
            scale = 1.14 + 0.08 * clamp(t / dur, 0, 1);
            if (t < 0.22) {
                flashAlpha = Math.max(0, Math.cos(t * 42) * (1 - t / 0.22) * 0.65);
                rgbSplitPx = (1 - t / 0.22) * 10;
            }
            if (t < 0.35) {
                var ds = 1 - t / 0.35;
                offsetX = Math.sin(t * 80) * 14 * ds;
                offsetY = Math.cos(t * 70) * 10 * ds;
            }
        } else if (id === 'handheld_tension') {
            scale = 1.05 + 0.11 * easeOutCubic(clamp(t / dur, 0, 1));
            offsetX = Math.sin(t * 5.2) * 8 + Math.cos(t * 13.5) * 3;
            offsetY = Math.cos(t * 4.4) * 7 + Math.sin(t * 11.0) * 2.5;
            rotateDeg = Math.sin(t * 3.8) * 0.85;
        }

        return {
            active: true,
            scale: Math.round(scale * 10000) / 10000,
            offsetX: Math.round(offsetX * 100) / 100,
            offsetY: Math.round(offsetY * 100) / 100,
            rotateDeg: Math.round(rotateDeg * 100) / 100,
            flashAlpha: Math.round(flashAlpha * 1000) / 1000,
            rgbSplitPx: Math.round(rgbSplitPx * 100) / 100
        };
    }

    /**
     * Computes the guaranteed Safe Zone vertical center Y in 1080x1920 space
     * so hook typography never collides with Reels/TikTok/Shorts native UI.
     */
    function computeSafeHookBox(platform, placement, safeZonesMod) {
        var sz = safeZonesMod || Z;
        var rect = (sz && typeof sz.safeRect === 'function')
            ? sz.safeRect(platform || 'reels', 'full')
            : { x: 65, y: 288, w: 855, h: 960 };

        var padX = 24;
        var boxX = rect.x + padX;
        var boxW = Math.max(480, rect.w - padX * 2);
        var minCenterY = rect.y + 150;
        var maxCenterY = rect.y + rect.h - 150;

        var targetY;
        if (placement === 'top') {
            targetY = rect.y + 175;
        } else if (placement === 'lower') {
            targetY = rect.y + rect.h - 165;
        } else {
            targetY = rect.y + Math.round(rect.h * 0.44);
        }

        return {
            x: boxX,
            w: boxW,
            centerX: Math.round(boxX + boxW / 2),
            centerY: clamp(targetY, minCenterY, maxCenterY),
            safeRect: rect
        };
    }

    function fmtTimecode(sec, fps) {
        var f = Math.max(1, Math.round(fps || 60));
        var totalFrames = Math.max(0, Math.round(sec * f));
        var secs = Math.floor(totalFrames / f);
        var frames = totalFrames % f;
        var mins = Math.floor(secs / 60);
        var remSecs = secs % 60;
        function pad(n) { return n < 10 ? '0' + n : String(n); }
        return '00:' + pad(mins) + ':' + pad(remSecs) + ':' + pad(frames);
    }

    /**
     * Builds an exact NLE keyframe recipe for Premiere Pro, After Effects, and DaVinci Resolve.
     */
    function generateKeyframesRecipe(hookConfig, fps) {
        var cfg = hookConfig || {};
        var frameRate = Number(fps) || 60;
        var camId = cfg.cameraMotion || 'punch_zoom';
        var animId = cfg.textAnimation || 'hormozi_pop';
        var sampleTimes = [0.0, 0.12, 0.28, 0.45, 0.85, 1.40, 1.75, 2.40, 3.00];

        var keyframes = sampleTimes.map(function (t) {
            var tr = computeCameraTransform(t, camId, HOOK_WINDOW_SEC);
            return {
                timeSec: t,
                timecode: fmtTimecode(t, frameRate),
                scalePct: Math.round(tr.scale * 1000) / 10,
                posX: Math.round(540 + tr.offsetX),
                posY: Math.round(960 + tr.offsetY),
                rotateDeg: tr.rotateDeg
            };
        });

        return {
            version: '3.4',
            windowSeconds: HOOK_WINDOW_SEC,
            fps: frameRate,
            hookText: cfg.hookText || 'BUNU BİLMİYORDUNUZ!',
            subText: cfg.subText || 'İLK 3 SANİYEDE İZLEYİCİYİ KİLİTLE',
            highlightWord: cfg.highlightWord || 'BİLMİYORDUNUZ!',
            textAnimation: animId,
            cameraMotion: camId,
            accentColor: cfg.accentColor || '#fbbf24',
            sfxCue: cfg.sfxCue || '00:00 Sub Drop + 00:12 Whoosh Hit',
            keyframes: keyframes
        };
    }

    /**
     * Generates 3 deterministic, domain-grounded Turkish viral hook variations
     * when offline or when instant local synthesis is requested.
     */
    function buildFallbackVariations(params) {
        params = params || {};
        var rawTopic = String(params.topic || '').trim();
        var psychology = params.psychology || 'curiosity_gap';
        var preferredAnim = params.textAnimation || 'sparvol_clean_focus';
        var preferredCam = params.cameraMotion || 'punch_zoom';

        // Extract meaningful keywords from user topic and normalize Turkish suffixes for natural grammar
        var stopWords = { 'ICIN': 1, 'İÇİN': 1, 'ILE': 1, 'İLE': 1, 'OLAN': 1, 'GIBI': 1, 'GİBİ': 1, 'DAHA': 1, 'COK': 1, 'ÇOK': 1, 'BIR': 1, 'BİR': 1, 'ILK': 1, 'İLK': 1 };
        function normalizeTurkishRoot(w) {
            var u = w.toLocaleUpperCase('tr-TR');
            return u.replace(/(LARDA|LERDE|LARDAN|LERDEN|NDA|NDE|DA|DE|TA|TE|DAN|DEN|YI|Yİ|YU|YÜ|NI|Nİ)$/, '');
        }
        var cleanWords = rawTopic
            .replace(/[^\w\sğüşıöçĞÜŞİÖÇ0-9%]/g, ' ')
            .split(/\s+/)
            .map(normalizeTurkishRoot)
            .filter(function (w) { return w.length > 2 && !stopWords[w]; });

        var subjectWord = cleanWords.length > 0
            ? cleanWords.slice(0, 2).join(' ')
            : 'VİDEO KURGU';
        var focusWord = cleanWords.length > 1
            ? cleanWords[cleanWords.length - 1]
            : 'SIRRI';

        var templatesByPsych = {
            curiosity_gap: [
                {
                    badge: 'SPARVOL ODAK',
                    hookText: subjectWord + ' İÇİN KİMSENİN SÖYLEMEDİĞİ ' + focusWord,
                    subText: 'SONUNA KADAR İZLE · 3 SANİYEDE FARKI GÖR',
                    highlightWord: focusWord,
                    textAnimation: preferredAnim,
                    cameraMotion: preferredCam,
                    accentColor: '#fbbf24',
                    sfxCue: '00:00 Sub Bass Drop + 00:10 Air Whoosh + 00:22 Snap Click',
                    retentionScore: 97,
                    rationale: 'Sparvol sinematik derinliği ve Zeigarnik merak boşluğu kaydırma refleksini ilk 0.4 saniyede durdurur.'
                },
                {
                    badge: '3D İZOMETRİK',
                    hookText: 'NEDEN ' + subjectWord + ' VİDEOLARIN İZLENMİYOR?',
                    subText: 'İLK 3 SANİYEDEKİ KRİTİK HATAYI DÜZELT',
                    highlightWord: 'İZLENMİYOR?',
                    textAnimation: '3d_perspective_slam',
                    cameraMotion: 'jump_snap',
                    accentColor: '#10b981',
                    sfxCue: '00:00 3D Bass Slam + 00:22 Snap Click + 01:45 Impact',
                    retentionScore: 94,
                    rationale: 'Hacimsel 3D derinlik ve doğrudan izleyici sorununa odaklanan soru kalıbı göz takibini merkeze kilitler.'
                },
                {
                    badge: 'SİNEMA SPLİT',
                    hookText: 'SADECE 1 AYAR İLE ' + subjectWord + ' ETKİSİ',
                    subText: 'ÖNCESİ VE SONRASI ARASINDAKİ FARKA BAK',
                    highlightWord: '1 AYAR',
                    textAnimation: 'sparvol_cinema_split',
                    cameraMotion: 'whip_pan_in',
                    accentColor: '#38bdf8',
                    sfxCue: '00:00 Whip Swish + 00:14 Sinema Kilit + 01:30 Sub Pulse',
                    retentionScore: 92,
                    rationale: 'Düşük efor - yüksek ödül vaadi (1 ayar) ve çift maske açılışı izlenme süresini zirvede tutar.'
                }
            ],
            contrarian_shock: [
                {
                    badge: 'EZBER BOZAN ŞOK',
                    hookText: subjectWord + ' HAKKINDA BİLDİĞİN HER ŞEY YANLIŞ',
                    subText: 'PROFESYONELLERİN KULLANDIĞI GERÇEK YÖNTEM',
                    highlightWord: 'YANLIŞ',
                    textAnimation: preferredAnim,
                    cameraMotion: preferredCam,
                    accentColor: '#f43f5e',
                    sfxCue: '00:00 Şok Darbe + 00:08 Tiz Glitch + 01:20 Kinetik Bas',
                    retentionScore: 96,
                    rationale: 'Bilişsel uyumsuzluk (Cognitive Dissonance) yaratarak izleyicinin savunma ve doğrulama güdüsünü harekete geçirir.'
                },
                {
                    badge: 'KARŞIT GÖRÜŞ',
                    hookText: 'ARTIK ESKİ ' + subjectWord + ' TEKNİĞİNİ BIRAK',
                    subText: '2026 ALGORİTMASI BUNU ÖDÜLLENDİRİYOR',
                    highlightWord: 'BIRAK',
                    textAnimation: 'split_reel_banner',
                    cameraMotion: 'strobe_impact',
                    accentColor: '#fbbf24',
                    sfxCue: '00:00 Strobe Flash + 00:18 Tape Rip + 01:40 Low Boom',
                    retentionScore: 93,
                    rationale: 'Çift tonlu uyarı bandı ve ilk 4 karedeki pozlama flaşı kaydırma hızını anında keser.'
                },
                {
                    badge: 'RADİKAL TEST',
                    hookText: subjectWord + ' KURALLARINI TAMAMEN YIKTIK',
                    subText: 'ORTAYA ÇIKAN SONUÇ SENİ ŞAŞIRTACAK',
                    highlightWord: 'YIKTIK',
                    textAnimation: 'glitch_cipher',
                    cameraMotion: 'jump_snap',
                    accentColor: '#a855f7',
                    sfxCue: '00:00 Cyber Decode + 00:30 Snap Cut + 01:45 Impact',
                    retentionScore: 91,
                    rationale: 'Kromatik RGB ayrışması ve şifre çözülme efekti ilk 0.6 saniyede görsel odaklanmayı maksimuma çıkarır.'
                }
            ],
            negative_warning: [
                {
                    badge: 'KRİTİK UYARI',
                    hookText: 'SAKIN ' + subjectWord + ' YAPARKEN BUNU DENEME',
                    subText: 'EĞER BU HATAYI YAPIYORSAN HEMEN DURDUR',
                    highlightWord: 'DENEME',
                    textAnimation: 'split_reel_banner',
                    cameraMotion: 'punch_zoom',
                    accentColor: '#f43f5e',
                    sfxCue: '00:00 Uyarı Darbesi + 00:12 Sub Drop + 01:10 Click',
                    retentionScore: 96,
                    rationale: 'Kayıptan kaçınma (Loss Aversion) psikolojisi pozitif vaatlere göre 2.3 kat daha yüksek 3 saniye tutundurma sağlar.'
                },
                {
                    badge: ' %99 HATA',
                    hookText: 'HERKESİN DÜŞTÜĞÜ ' + subjectWord + ' TUZAĞI',
                    subText: '3 SANİYEDE KURGUNU KURTARACAK ÇÖZÜM',
                    highlightWord: 'TUZAĞI',
                    textAnimation: preferredAnim,
                    cameraMotion: 'strobe_impact',
                    accentColor: '#fbbf24',
                    sfxCue: '00:00 Kamera Flaş + 00:15 Kinetik Pop + 01:30 Riser',
                    retentionScore: 93,
                    rationale: 'İzleyicide hata yapma korkusu uyandırarak videonun çözüm kısmına kadar kalmasını garantiler.'
                },
                {
                    badge: 'ACİL DÜZELTME',
                    hookText: subjectWord + ' KALİTENİ DÜŞÜREN GİZLİ DETAY',
                    subText: 'BU AYARI KAPATMADAN EXPORT ALMA',
                    highlightWord: 'GİZLİ DETAY',
                    textAnimation: 'typewriter_flash',
                    cameraMotion: 'handheld_tension',
                    accentColor: '#10b981',
                    sfxCue: '00:00 Mekanik Tuş + 00:20 Derin Bas + 01:50 Sweep',
                    retentionScore: 90,
                    rationale: 'Somut eylem uyarısı (Export alma) aktif içerik üreticilerini anında yakalar.'
                }
            ],
            proof_first: [
                {
                    badge: 'KANIT ÖNDEN',
                    hookText: '0\'DAN ZİRVEYE: ' + subjectWord + ' SONUCU',
                    subText: 'ADIM ADIM NASIL YAPILDIĞINI İZLE',
                    highlightWord: 'SONUCU',
                    textAnimation: preferredAnim,
                    cameraMotion: preferredCam,
                    accentColor: '#10b981',
                    sfxCue: '00:00 Crisp Chime + 00:10 Punch Bass + 01:20 Whoosh',
                    retentionScore: 94,
                    rationale: 'Sonucu ilk karede göstermek izleyicinin "nasıl yapıldı" sorusuna yanıt aramasını sağlar.'
                },
                {
                    badge: 'CANLI VAKA',
                    hookText: '3 SANİYEDE ' + subjectWord + ' DÖNÜŞÜMÜ',
                    subText: 'GERÇEK ZAMANLI UYGULAMA VE REÇETE',
                    highlightWord: 'DÖNÜŞÜMÜ',
                    textAnimation: 'glass_spotlight',
                    cameraMotion: 'whip_pan_in',
                    accentColor: '#38bdf8',
                    sfxCue: '00:00 Hızlı Savrulma + 00:18 Neon Kilit + 01:35 Hit',
                    retentionScore: 92,
                    rationale: 'Yüksek hızda görsel dönüşüm vaadi dikkat süresini ilk 3 saniye boyunca korur.'
                },
                {
                    badge: 'NET VERİ',
                    hookText: subjectWord + ' İLE 10 KAT DAHA HIZLI AKIŞ',
                    subText: 'TEST EDİLMİŞ STÜDYO İŞ AKIŞI',
                    highlightWord: '10 KAT',
                    textAnimation: 'kinetic_stomp',
                    cameraMotion: 'jump_snap',
                    accentColor: '#fbbf24',
                    sfxCue: '00:00 3x Stomp Drum + 00:45 Bas Vuruşu',
                    retentionScore: 90,
                    rationale: 'Sayısal değer içeren kancalar okuma hızını artırır ve güven oluşturur.'
                }
            ],
            insider_secret: [
                {
                    badge: 'STÜDYO SIRRI',
                    hookText: 'ÜST DÜZEY EDİTÖRLERİN ' + subjectWord + ' HİLESİ',
                    subText: 'BU KISAYOL SAATLERİNİ KURTARACAK',
                    highlightWord: 'HİLESİ',
                    textAnimation: preferredAnim,
                    cameraMotion: preferredCam,
                    accentColor: '#fbbf24',
                    sfxCue: '00:00 Secret Sub + 00:14 Pop Reveal + 01:25 Swish',
                    retentionScore: 95,
                    rationale: 'İçeriden bilgi (Insider Knowledge) çerçevelemesi izleyicide kaydetme (Save) davranışını tetikler.'
                },
                {
                    badge: 'PRO TEKNİK',
                    hookText: subjectWord + ' İÇİN YASAKLI GİBİ GÖRÜNEN KISAYOL',
                    subText: 'KAYDETMEYİ UNUTMA · İHTİYACIN OLACAK',
                    highlightWord: 'KISAYOL',
                    textAnimation: 'glitch_cipher',
                    cameraMotion: 'strobe_impact',
                    accentColor: '#38bdf8',
                    sfxCue: '00:00 Glitch Spark + 00:16 Sub Boom + 01:40 Click',
                    retentionScore: 93,
                    rationale: 'Kaydetme çağrısı ile birleşen nadir teknik vaadi algoritma etkileşim puanını yükseltir.'
                },
                {
                    badge: 'ALTIN KURAL',
                    hookText: 'İLK 3 SANİYEDE ' + subjectWord + ' KİLİT TEKNİĞİ',
                    subText: 'İZLEYİCİYİ EKRANA ÇİVİLEYEN FORMÜL',
                    highlightWord: 'KİLİT',
                    textAnimation: 'kinetic_stomp',
                    cameraMotion: 'jump_snap',
                    accentColor: '#10b981',
                    sfxCue: '00:00 Metalik Kilit + 00:25 Bass Drop',
                    retentionScore: 91,
                    rationale: 'Kısa, sert ve ritmik kelimeler mobil ekranda 0.4 saniyede algılanır.'
                }
            ]
        };

        var list = templatesByPsych[psychology] || templatesByPsych.curiosity_gap;
        return list.map(function (item, idx) {
            return Object.assign({ id: 'hook_var_' + (idx + 1) }, item);
        });
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

    function wrapHookLines(ctx, text, maxWidth) {
        var words = String(text || '').trim().split(/\s+/).filter(Boolean);
        if (!words.length) return [];
        var lines = [];
        var current = [words[0]];
        for (var i = 1; i < words.length; i++) {
            var candidate = current.concat([words[i]]).join(' ');
            if (ctx.measureText(candidate).width <= maxWidth || current.length === 0) {
                current.push(words[i]);
            } else {
                lines.push(current);
                current = [words[i]];
            }
        }
        if (current.length) lines.push(current);
        return lines.slice(0, 3);
    }

    function cleanToken(w) {
        return String(w || '').replace(/[.,!?;:'"()[\]]/g, '').toLocaleUpperCase('tr-TR');
    }

    function isHighlightedWord(word, highlightTarget) {
        if (!word || !highlightTarget) return false;
        var cw = cleanToken(word);
        var targets = String(highlightTarget).split(/\s+/).map(cleanToken).filter(Boolean);
        for (var i = 0; i < targets.length; i++) {
            if (cw && targets[i] && (cw === targets[i] || cw.indexOf(targets[i]) >= 0)) {
                return true;
            }
        }
        return false;
    }

    var CIPHER_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&*';
    function scrambleWord(word, progress, seedIdx) {
        if (progress >= 1) return word;
        var out = '';
        for (var i = 0; i < word.length; i++) {
            var charThreshold = (i + 1) / (word.length + 1);
            if (progress >= charThreshold) {
                out += word[i];
            } else {
                var idx = Math.abs(Math.floor(progress * 37 + i * 13 + (seedIdx || 0) * 7)) % CIPHER_CHARS.length;
                out += CIPHER_CHARS[idx];
            }
        }
        return out;
    }

    /**
     * Renders the 0.00s - 3.00s Viral Hook & Kinetic Typography directly onto a 2D Canvas.
     */
    function drawHookOverlay(ctx, w, h, timeSec, hookConfig, safeZonesMod) {
        if (!ctx || !hookConfig || !hookConfig.enabled) return;
        var t = Number(timeSec);
        var dur = Number(hookConfig.duration) || HOOK_WINDOW_SEC;
        if (isNaN(t) || t < 0 || t > dur) return;

        var s = Math.min(w / W, h / H);
        var platform = hookConfig.platform || 'reels';
        var placement = hookConfig.placement || 'center';
        var animId = hookConfig.textAnimation || 'hormozi_pop';
        var camId = hookConfig.cameraMotion || 'punch_zoom';
        var accent = hookConfig.accentColor || '#fbbf24';
        var headline = String(hookConfig.hookText || 'BUNU BİLMİYORDUNUZ!').toLocaleUpperCase('tr-TR');
        var subText = String(hookConfig.subText || '').toLocaleUpperCase('tr-TR');
        var highlightWord = String(hookConfig.highlightWord || '');

        var cam = computeCameraTransform(t, camId, dur);
        var box = computeSafeHookBox(platform, placement, safeZonesMod);

        ctx.save();
        ctx.translate((w - W * s) / 2, (h - H * s) / 2);
        ctx.scale(s, s);

        // 1. Optional Strobe Exposure Flash in first frames
        if (cam.flashAlpha > 0.01) {
            ctx.save();
            ctx.fillStyle = 'rgba(255, 255, 255, ' + cam.flashAlpha + ')';
            ctx.fillRect(0, 0, W, H);
            ctx.restore();
        }

        // Apply subtle kinetic motion sync to text container
        var exitFade = t > (dur - 0.22) ? clamp((dur - t) / 0.22, 0, 1) : 1;
        ctx.globalAlpha = exitFade * (typeof hookConfig.opacity === 'number' ? hookConfig.opacity : 1);

        var cx = box.centerX + cam.offsetX * 0.35;
        var cy = box.centerY + cam.offsetY * 0.35;
        var maxTextW = box.w - 48;

        ctx.font = '800 58px Montserrat, Inter, -apple-system, sans-serif';
        var wordLines = wrapHookLines(ctx, headline, maxTextW);
        var lineH = 76;
        var totalTextH = wordLines.length * lineH;
        var startY = cy - totalTextH / 2 + lineH / 2;

        // Flatten word count for sequential animations
        var totalWords = 0;
        wordLines.forEach(function (lw) { totalWords += lw.length; });

        // Background plate & atmospheric depth depending on animation style
        if (animId === 'sparvol_clean_focus') {
            // Sparvol signature cinematic depth vignette behind text (zero cartoon borders)
            ctx.save();
            var radGrad = ctx.createRadialGradient(cx, cy, 30, cx, cy, Math.max(box.w * 0.55, 340));
            radGrad.addColorStop(0, 'rgba(6, 8, 14, 0.72)');
            radGrad.addColorStop(0.55, 'rgba(6, 8, 14, 0.42)');
            radGrad.addColorStop(1, 'rgba(6, 8, 14, 0)');
            ctx.fillStyle = radGrad;
            ctx.beginPath();
            ctx.arc(cx, cy, Math.max(box.w * 0.55, 340), 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        } else if (animId === 'sparvol_cinema_split') {
            // Clean cinematic letterbox divider lines
            var splitProgress = easeOutCubic(clamp(t / 0.32, 0, 1));
            ctx.save();
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
            var lineHalf = (maxTextW + 40) * 0.5 * splitProgress;
            ctx.beginPath();
            ctx.moveTo(cx - lineHalf, cy - totalTextH / 2 - 24);
            ctx.lineTo(cx + lineHalf, cy - totalTextH / 2 - 24);
            ctx.moveTo(cx - lineHalf, cy + totalTextH / 2 + 24);
            ctx.lineTo(cx + lineHalf, cy + totalTextH / 2 + 24);
            ctx.stroke();
            ctx.restore();
        } else if (animId === 'sparvol_dark_editorial') {
            // High-fashion micro-kicker badge above headline
            var edTag = hookConfig.badge || 'EDITORIAL · RETENTION';
            ctx.save();
            ctx.font = '700 16px Inter, sans-serif';
            ctx.letterSpacing = '3px';
            ctx.fillStyle = accent;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            var tagY = startY - lineH / 2 - 28;
            ctx.fillText(edTag, cx, tagY);
            ctx.restore();
        } else if (animId === 'glass_spotlight') {
            var cardPadX = 36;
            var cardPadY = 34;
            var cardW = Math.min(box.w, maxTextW + cardPadX * 2);
            var cardH = totalTextH + (subText ? 66 : 16) + cardPadY * 2;
            var cardX = cx - cardW / 2;
            var cardY = cy - cardH / 2;
            var cardScale = easeOutBack(clamp(t / 0.32, 0, 1));

            ctx.save();
            ctx.translate(cx, cy);
            ctx.scale(cardScale, cardScale);
            ctx.translate(-cx, -cy);

            roundRect(ctx, cardX, cardY, cardW, cardH, 26);
            ctx.fillStyle = 'rgba(8, 12, 22, 0.86)';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
            ctx.shadowBlur = 28;
            ctx.shadowOffsetY = 10;
            ctx.fill();
            ctx.shadowBlur = 0;

            ctx.lineWidth = 3.5;
            ctx.strokeStyle = accent;
            ctx.stroke();

            // Animated top progress bar inside glass card
            var progW = (cardW - 48) * clamp(t / dur, 0, 1);
            roundRect(ctx, cardX + 24, cardY + 14, Math.max(12, progW), 6, 3);
            ctx.fillStyle = accent;
            ctx.fill();
            ctx.restore();
        } else if (animId === 'split_reel_banner') {
            var bannerW = Math.min(box.w, maxTextW + 56);
            var bannerH = totalTextH + 46;
            var bannerX = cx - bannerW / 2;
            var bannerY = startY - lineH / 2 - 20;
            var slideIn = easeOutCubic(clamp(t / 0.25, 0, 1));

            ctx.save();
            ctx.translate((1 - slideIn) * -80, 0);
            var topTag = hookConfig.badge || 'DİKKAT · İLK 3 SANİYE';
            ctx.font = '800 24px Montserrat, Inter, sans-serif';
            var topW = Math.min(bannerW, ctx.measureText(topTag).width + 48);
            roundRect(ctx, cx - topW / 2, bannerY - 44, topW, 40, 10);
            ctx.fillStyle = accent;
            ctx.fill();
            ctx.fillStyle = '#090b10';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(topTag, cx, bannerY - 23);

            roundRect(ctx, bannerX, bannerY, bannerW, bannerH, 18);
            ctx.fillStyle = 'rgba(10, 12, 18, 0.92)';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
            ctx.shadowBlur = 24;
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.lineWidth = 3;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
            ctx.stroke();
            ctx.restore();
        }

        // Global 3D Perspective Matrix for '3d_perspective_slam' & '3d_tilt_revolve'
        var is3dAnim = animId === '3d_perspective_slam' || animId === '3d_tilt_revolve' || animId === '3d_spatial_float';
        if (animId === '3d_perspective_slam') {
            var slamT = clamp(t / 0.38, 0, 1);
            var slamScale = 1.9 - 0.9 * easeOutBack(slamT);
            var pitch3d = (1 - easeOutCubic(slamT)) * 0.42;
            var yaw3d = (1 - easeOutCubic(slamT)) * -0.22;
            ctx.save();
            ctx.translate(cx, cy);
            ctx.scale(slamScale, slamScale);
            ctx.transform(1, pitch3d, yaw3d, 1, 0, 0);
            ctx.translate(-cx, -cy);
        } else if (animId === '3d_tilt_revolve') {
            var revPitch = Math.sin(t * 3.2) * 0.08;
            var revYaw = Math.cos(t * 2.5) * 0.12;
            ctx.save();
            ctx.translate(cx, cy);
            ctx.transform(1, revPitch, revYaw, 1, 0, 0);
            ctx.translate(-cx, -cy);
        }

        // Draw word-by-word or line-by-line kinetic typography
        var globalWordIdx = 0;
        for (var lineIdx = 0; lineIdx < wordLines.length; lineIdx++) {
            var words = wordLines[lineIdx];
            var lineY = startY + lineIdx * lineH;

            // Line-level split/stomp transforms
            if (animId === 'kinetic_stomp') {
                var lineDelay = lineIdx * 0.36;
                var lineProgress = clamp((t - lineDelay) / 0.22, 0, 1);
                if (lineProgress <= 0) continue;
                var stompScale = 1.65 - 0.65 * easeOutBack(lineProgress);
                ctx.save();
                ctx.translate(cx, lineY);
                ctx.scale(stompScale, stompScale);
                ctx.translate(-cx, -lineY);
            } else if (animId === 'sparvol_cinema_split') {
                var splitDir = (lineIdx % 2 === 0) ? -1 : 1;
                var splitLineT = easeOutBack(clamp(t / 0.32, 0, 1));
                var splitOffset = (1 - splitLineT) * 75 * splitDir;
                ctx.save();
                ctx.translate(splitOffset, 0);
            }

            ctx.font = '800 58px Montserrat, Inter, -apple-system, sans-serif';
            var spaceW = ctx.measureText(' ').width * 1.15;
            var wordWidths = words.map(function (w) { return ctx.measureText(w).width; });
            var totalLineW = wordWidths.reduce(function (a, b) { return a + b; }, 0) + Math.max(0, words.length - 1) * spaceW;
            var curX = cx - totalLineW / 2;

            for (var wIdx = 0; wIdx < words.length; wIdx++) {
                var rawWord = words[wIdx];
                var ww = wordWidths[wIdx];
                var wordCenterX = curX + ww / 2;
                var isHi = isHighlightedWord(rawWord, highlightWord);

                var wordDelay = globalWordIdx * 0.08;
                var wordLocalT = clamp((t - wordDelay) / 0.22, 0, 1);
                var wordScale = 1.0;
                var wordOffsetY = 0;
                var displayWord = rawWord;

                if (animId === 'sparvol_clean_focus') {
                    // Minimalist anti-slop smooth ease-in with subtle tracking expansion
                    if (t < wordDelay) {
                        globalWordIdx++;
                        curX += ww + spaceW;
                        continue;
                    }
                    wordScale = 0.94 + 0.06 * easeOutCubic(wordLocalT);
                    if (isHi) {
                        wordScale *= 1.04 + 0.02 * Math.sin(t * 6);
                    }
                } else if (animId === '3d_spatial_float') {
                    // 3D zero-G kinetic floating
                    var floatPhase = t * 3.4 + globalWordIdx * 0.65;
                    wordOffsetY = Math.sin(floatPhase) * 11;
                    wordScale = 1.0 + Math.cos(floatPhase) * 0.04;
                } else if (animId === 'hormozi_pop' || animId === 'glass_spotlight') {
                    if (t < wordDelay) {
                        globalWordIdx++;
                        curX += ww + spaceW;
                        continue;
                    }
                    wordScale = easeOutBack(wordLocalT);
                    if (isHi && wordLocalT >= 0.8) {
                        wordScale *= 1.05 + 0.03 * Math.sin((t - wordDelay) * 10);
                    }
                } else if (animId === 'glitch_cipher') {
                    var decodeProgress = clamp((t - wordDelay * 0.6) / 0.52, 0, 1);
                    displayWord = scrambleWord(rawWord, decodeProgress, globalWordIdx);
                } else if (animId === 'typewriter_flash') {
                    var typeTrigger = (globalWordIdx / Math.max(1, totalWords)) * 0.85;
                    if (t < typeTrigger) {
                        globalWordIdx++;
                        curX += ww + spaceW;
                        continue;
                    }
                }

                ctx.save();
                ctx.translate(wordCenterX, lineY + wordOffsetY);
                ctx.scale(wordScale, wordScale);

                // Highlight pill or subtle glow behind target keyword
                if (isHi) {
                    ctx.save();
                    if (animId === 'sparvol_clean_focus' || animId === 'sparvol_dark_editorial') {
                        // Anti-slop Sparvol minimal highlight: soft accent glow instead of chunky box
                        ctx.shadowColor = accent;
                        ctx.shadowBlur = 24;
                        roundRect(ctx, -ww / 2 - 8, -32, ww + 16, 64, 8);
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
                        ctx.fill();
                        ctx.shadowBlur = 0;
                    } else {
                        ctx.rotate(-0.02);
                        roundRect(ctx, -ww / 2 - 14, -34, ww + 28, 66, 12);
                        ctx.fillStyle = accent;
                        ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
                        ctx.shadowBlur = 14;
                        ctx.shadowOffsetY = 4;
                        ctx.fill();
                    }
                    ctx.restore();
                }

                ctx.font = '800 58px Montserrat, Inter, -apple-system, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                // 3D Depth Extrusion Pass for 3D styles
                if (animId === '3d_perspective_slam' || animId === '3d_tilt_revolve') {
                    ctx.save();
                    ctx.shadowBlur = 0;
                    for (var d = 5; d >= 1; d--) {
                        var extrudeAlpha = 0.85 - d * 0.12;
                        ctx.fillStyle = isHi ? 'rgba(30, 20, 5, ' + extrudeAlpha + ')' : 'rgba(8, 12, 20, ' + extrudeAlpha + ')';
                        ctx.fillText(displayWord, d * 1.6, d * 2.2);
                    }
                    ctx.restore();
                } else if (animId === '3d_spatial_float') {
                    // Soft floor ambient occlusion shadow
                    ctx.save();
                    ctx.beginPath();
                    var shadowScale = 1.0 - (wordOffsetY / 25);
                    ctx.ellipse(0, 48 - wordOffsetY * 0.4, (ww * 0.45) * shadowScale, 8 * shadowScale, 0, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
                    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
                    ctx.shadowBlur = 16;
                    ctx.fill();
                    ctx.restore();
                }

                // Chromatic RGB split layer for glitch_cipher or high-impact moments
                var splitOffset = animId === 'glitch_cipher'
                    ? (t < 0.75 ? Math.sin(t * 90 + globalWordIdx) * 7 : 2.5)
                    : (animId === 'sparvol_cinema_split' && t < 0.35 ? 2.0 : cam.rgbSplitPx);

                if (Math.abs(splitOffset) > 0.8 && !isHi) {
                    ctx.fillStyle = 'rgba(0, 242, 234, 0.75)';
                    ctx.fillText(displayWord, -splitOffset, 0);
                    ctx.fillStyle = 'rgba(255, 0, 80, 0.75)';
                    ctx.fillText(displayWord, splitOffset, 0);
                }

                // Clean, anti-slop typography rendering:
                // NO chunky 11px cartoon outline!
                // High-retention cinematic drop shadow instead:
                var isSparvolOr3d = animId === 'sparvol_clean_focus' || animId === '3d_perspective_slam' ||
                    animId === '3d_tilt_revolve' || animId === 'sparvol_cinema_split' ||
                    animId === '3d_spatial_float' || animId === 'sparvol_dark_editorial';

                if (!isHi && !isSparvolOr3d && animId !== 'glass_spotlight') {
                    // Legacy style: gentle 4px stroke outline for high-contrast without being garish
                    ctx.lineWidth = 4.5;
                    ctx.lineJoin = 'round';
                    ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
                    ctx.strokeText(displayWord, 0, 2);
                } else if (isSparvolOr3d && !isHi) {
                    // Subtle crisp 1.5px backing for pure readability on any background
                    ctx.lineWidth = 2.0;
                    ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
                    ctx.strokeText(displayWord, 0, 1);
                }

                // Main Fill with metallic specular sweep for 3d_tilt_revolve
                if (animId === '3d_tilt_revolve' && !isHi) {
                    var gleamPos = ((t * 1.6 + globalWordIdx * 0.3) % 2.5) - 1.25;
                    var gleamGrad = ctx.createLinearGradient(-ww / 2, 0, ww / 2, 0);
                    gleamGrad.addColorStop(0, '#ffffff');
                    gleamGrad.addColorStop(clamp(gleamPos, 0, 1), accent);
                    gleamGrad.addColorStop(Math.min(1, clamp(gleamPos + 0.15, 0, 1)), '#ffffff');
                    ctx.fillStyle = gleamGrad;
                } else if (isHi && (animId === 'sparvol_clean_focus' || animId === 'sparvol_dark_editorial')) {
                    ctx.fillStyle = accent;
                } else {
                    ctx.fillStyle = isHi ? '#090b10' : '#ffffff';
                }

                ctx.shadowColor = isHi ? 'transparent' : 'rgba(0, 0, 0, 0.85)';
                ctx.shadowBlur = isHi ? 0 : (isSparvolOr3d ? 22 : 12);
                ctx.shadowOffsetY = isSparvolOr3d ? 6 : 2;
                ctx.fillText(displayWord, 0, 0);
                ctx.shadowBlur = 0;

                // Underline sweeps for highlighted words
                if (isHi && (animId === 'sparvol_clean_focus' || animId === 'sparvol_dark_editorial' || animId === 'typewriter_flash')) {
                    var sweepProgress = clamp((t - wordDelay) / 0.28, 0, 1);
                    var ulW = (ww + 6) * sweepProgress;
                    ctx.fillStyle = accent;
                    ctx.fillRect(-ww / 2 - 3, 26, ulW, 4.5);
                }

                ctx.restore();
                curX += ww + spaceW;
                globalWordIdx++;
            }

            if (animId === 'kinetic_stomp' || animId === 'sparvol_cinema_split') {
                ctx.restore();
            }
        }

        if (animId === '3d_perspective_slam' || animId === '3d_tilt_revolve') {
            ctx.restore();
        }

        // Subtitle Kicker Pill below main headline
        if (subText && t >= 0.22) {
            var subAppear = easeOutCubic(clamp((t - 0.22) / 0.28, 0, 1));
            var subY = startY + (wordLines.length - 1) * lineH + 64;
            ctx.save();
            ctx.globalAlpha *= subAppear;
            ctx.font = '700 24px Montserrat, Inter, sans-serif';
            var subW = Math.min(box.w - 32, ctx.measureText(subText).width + 44);
            roundRect(ctx, cx - subW / 2, subY - 22, subW, 44, 22);
            ctx.fillStyle = 'rgba(9, 13, 22, 0.9)';
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = accent;
            ctx.stroke();

            ctx.fillStyle = accent;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(subText, cx, subY + 1);
            ctx.restore();
        }

        // Top-left 0-3s Hook Active HUD indicator inside Safe Zone when Safe Zones are visible
        if (hookConfig.showHudBadge) {
            var hudX = box.safeRect.x + 14;
            var hudY = box.safeRect.y + 56;
            var rem = Math.max(0, dur - t).toFixed(1);
            var hudLabel = 'HOOK AKTİF · ' + rem + 's';
            ctx.save();
            ctx.font = '700 18px Inter, sans-serif';
            var hw = ctx.measureText(hudLabel).width + 26;
            roundRect(ctx, hudX, hudY, hw, 32, 8);
            ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
            ctx.fill();
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = accent;
            ctx.stroke();
            ctx.fillStyle = accent;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(hudLabel, hudX + 13, hudY + 17);
            ctx.restore();
        }

        ctx.restore();
    }

    return {
        W: W,
        H: H,
        HOOK_WINDOW_SEC: HOOK_WINDOW_SEC,
        TEXT_ANIMATIONS: TEXT_ANIMATIONS,
        CAMERA_MOTIONS: CAMERA_MOTIONS,
        HOOK_PSYCHOLOGY: HOOK_PSYCHOLOGY,
        computeCameraTransform: computeCameraTransform,
        computeSafeHookBox: computeSafeHookBox,
        generateKeyframesRecipe: generateKeyframesRecipe,
        buildFallbackVariations: buildFallbackVariations,
        drawHookOverlay: drawHookOverlay
    };
}));

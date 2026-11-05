# Alptuguide™ Studio v3.0

**Alptuguide™ Studio**, dikey video kurgularında (**Instagram Reels**, **TikTok**, **YouTube Shorts** ve **3'lü Ortak Kesişim**) birebir doğrulanmış güvenli alan (safe-zone) kılavuzlarını ve gerçek zamanlı sosyal medya arayüz simülasyonunu **sıfır gecikme (zero-lag)** ile sunan çift mimarili (**Adobe CEP Eklentisi** + **Yerel macOS Uygulaması**) profesyonel bir kurgu aracıdır.

Geliştirici: **Alptuğ Dağ** ([@alptugdag](https://github.com/AlptugDag))

---

## Öne Çıkan Özellikler (v3.0)

1. **1:1 Doğrulanmış Platform Kılavuzları (`1080 × 1920` Referans & Otomatik `4K 2160 × 3840` Ölçekleme)**
   - **Instagram Reels (`reels`)**: Meta resmi güvenli alan standartlarına birebir uyumlu; üst `269 px` (`%14`), alt `672 px` (`%35` tam güvenli sınır) / `440 px` (`y: 1480..1810` organik açıklama + ses alanı) + `110 px` (`y: 1810..1920` alt navigasyon barı), sol `65 px` (`%6`), sağ `146 px` (`x: 934..1080` beğeni/yorum/kaydetme/paylaşım sütunu).
   - **TikTok (`tiktok`)**: TikTok Creative Center standartlarına birebir uyumlu; üst `252 px` (`%13.1`), alt `620 px` (`%32` geniş açıklama) / `490 px` (`y: 1430..1758` organik kullanıcı/açıklama/ses alanı) + `162 px` (`y: 1758..1920` alt siyah navigasyon barı), sol `60 px`, sağ `184 px` (`x: 896..1080` sağ aksiyon sütunu ve dönen plak).
   - **YouTube Shorts (`shorts`)**: YouTube Studio 9:16 standartlarına birebir uyumlu; üst `288 px` (`%15`), alt `672 px` (`%35` tam güvenli sınır) / `480 px` (`y: 1440..1776` kanal/Abone ol/başlık/ses alanı) + `144 px` (`y: 1776..1920` alt navigasyon barı ve kırmızı ilerleme çizgisi), sol `48 px`, sağ `192 px` (`x: 888..1080` sağ aksiyon sütunu).
   - **Ortak Kılavuz (`all`)**: Tek videoyu aynı anda hem Reels, hem TikTok, hem YouTube Shorts'ta paylaşan içerik üreticileri için **3 platformun en sıkı kesişim alanı**:
     - Üst: `288 px` | Alt: `672 px` (Organik: `490 px`) | Sol: `65 px` | Sağ: `192 px`
     - **Net %100 Güvenli Merkez Alan**: `823 × 960 px` (`x: 65..888`, `y: 288..1248`) — Organik modda `823 × 1142 px` (`y: 288..1430`).

| Platform | Üst Boşluk | Alt Boşluk (Tam / Organik UI) | Alt Nav Bar | Sol Boşluk | Sağ Aksiyon Sütunu | Altyazı Güvenli Y |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Instagram Reels** | `269 px` | `672 px` / `440 px` (`y: 1480`) | `110 px` (`y: 1810`) | `65 px` | `146 px` (`x: 934`) | `1420 px` |
| **TikTok** | `252 px` | `620 px` / `490 px` (`y: 1430`) | `162 px` (`y: 1758`) | `60 px` | `184 px` (`x: 896`) | `1375 px` |
| **YouTube Shorts** | `288 px` | `672 px` / `480 px` (`y: 1440`) | `144 px` (`y: 1776`) | `48 px` | `192 px` (`x: 888`) | `1385 px` |
| **Ortak (3 Platform)** | `288 px` | `672 px` / `490 px` (`y: 1430`) | `162 px` (`y: 1758`) | `65 px` | `192 px` (`x: 888`) | `1375 px` |

2. **Sıfır Takılma & Sıfır CPU/GPU Yükü Mimarisi**
   - **Asenkron Kare Yakalama**: ExtendScript içinde ana iş parçacığını (main thread) donduran `$.sleep()` döngüleri tamamen kaldırıldı; kare yazımı tamamlanana kadar Node.js arka planda asenkron bekler.
   - **Playhead Settle Algılama**: Timeline üzerinde gezinirken (scrubbing) veya video oynatılırken Premiere Pro'nun `BE::WriteMutex` kilidini asla meşgul etmez; yalnızca playhead durduğunda kareyi günceller.
   - **Path2D Önbellekleme & 0% Idle GPU**: İkon vektörleri (`Path2D`) önbellekten çizilir, her karede yeniden `canvas` nesnesi oluşturulmaz ve `CEPHtmlEngine` üzerinde arka planda GPU tüketen sonsuz CSS animasyonları kaldırılmıştır.

3. **Yerel macOS Ekran Üstü Overlay Uygulaması (`Alptuguide.app`)**
   - Timeline'a hiçbir katman eklemeden Program Monitörü veya Viewer üzerine oturan, tıklamaları alta geçiren (`ignoresMouseEvents`) yerel macOS (`arm64` + `x86_64` Universal Binary) uygulaması içerir.
   - Menü çubuğundaki **Alptuguide** ikonu üzerinden **Premiere Pro**, **After Effects**, **DaVinci Resolve**, **Final Cut Pro** ve **CapCut** üzerinde bağımsız (standalone) olarak da kullanılabilir.
   - `kqueue` (`DispatchSourceFileSystemObject`) dosya izleme mimarisiyle boşta **%0.0 CPU** tüketir.

---

## Kurulum

```bash
git clone https://github.com/AlptugDag/Alptuguide.git
cd Alptuguide
./install.sh
```

Kurulum betiği:
1. Adobe `CSXS.9` – `CSXS.20` (`2020` – `2030+`) sürümleri için `PlayerDebugMode` ayarını otomatik açar.
2. CEP eklentisini `~/Library/Application Support/Adobe/CEP/extensions/com.alptug.alptuguide` dizinine kurar.
3. Yerel macOS uygulamasını derleyerek hem `/Applications/Alptuguide.app` hem de `~/Library/Application Support/Alptuguide/Alptuguide Overlay.app` konumuna yükler.

---

## Lisans

© 2026 **Alptuğ Dağ** (`@alptugdag`). Tüm hakları saklıdır.

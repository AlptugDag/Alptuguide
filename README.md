<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/imza.svg">
    <img src="assets/alptuguide_logo.png" width="150" alt="Alptuguide Logo">
  </picture>
</p>

<h1 align="center">Alptuguide™ Studio v3.0</h1>

<p align="center">
  <strong>Alptuguide™ Studio</strong>, dikey video kurgularında (<strong>Instagram Reels</strong>, <strong>TikTok</strong>, <strong>YouTube Shorts</strong> ve <strong>3'lü Ortak Kesişim</strong>) birebir doğrulanmış güvenli alan (safe-zone) kılavuzlarını ve gerçek zamanlı sosyal medya arayüz simülasyonunu <strong>sıfır gecikme (zero-lag)</strong> ile sunan çift mimarili (<strong>Adobe CEP Eklentisi</strong> + <strong>Yerel macOS Uygulaması</strong>) profesyonel bir kurgu aracıdır.
  <br><br>
  <img src="https://img.shields.io/badge/macOS-13%2B-black" alt="macOS 13+">
  <img src="https://img.shields.io/badge/Apple%20Silicon%20%26%20Intel-Universal-blue" alt="Universal Binary">
  <img src="https://img.shields.io/badge/Adobe%20CEP-Premiere%20Pro%20%26%20After%20Effects-7c3aed" alt="Adobe CEP">
  <img src="https://img.shields.io/badge/version-3.0.0-10b981" alt="v3.0.0">
</p>

<p align="center">
  Geliştirici: <strong>Alptuğ Dağ</strong> (<a href="https://github.com/AlptugDag">@alptugdag</a>)
</p>

---

## Öne Çıkan Özellikler (v3.0)

1. **1:1 Doğrulanmış Platform Kılavuzları (`1080 × 1920` Referans & Otomatik `4K 2160 × 3840` Ölçekleme)**

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

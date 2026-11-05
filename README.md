<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/imza.svg">
    <img src="assets/alptuguide_logo.png" width="160" alt="Alptuguide Logo">
  </picture>
</p>

<h1 align="center">Alptuguide™ Studio v3.1</h1>

<p align="center">
  <strong>Alptuguide™ Studio</strong>; dikey video prodüksiyonlarında (<strong>Instagram Reels</strong>, <strong>TikTok</strong>, <strong>YouTube Shorts</strong> ve <strong>3'lü Ortak Kesişim</strong>) birebir doğrulanmış güvenli alan (safe-zone) kılavuzlarını ve canlı sosyal medya UI simülasyonunu <strong>sıfır gecikme (zero-lag)</strong> ile sunan, <strong>Apple Liquid Glass</strong> arayüzüne ve çoklu platform desteğine (<strong>Adobe Premiere Pro</strong>, <strong>Adobe After Effects</strong>, <strong>DaVinci Resolve Studio</strong> ve <strong>macOS Native Studio</strong>) sahip profesyonel bir kurgu paketidir.
  <br><br>
  <img src="https://img.shields.io/badge/macOS-13%2B-black" alt="macOS 13+">
  <img src="https://img.shields.io/badge/Apple%20Silicon%20%26%20Intel-Universal-blue" alt="Universal Binary">
  <img src="https://img.shields.io/badge/Adobe%20CEP-Premiere%20Pro%20%26%20After%20Effects-7c3aed" alt="Adobe CEP">
  <img src="https://img.shields.io/badge/DaVinci%20Resolve-Studio%2018%20%26%2019%2B-ea580c" alt="DaVinci Resolve">
  <img src="https://img.shields.io/badge/UI%20Design-Apple%20Liquid%20Glass-0284c7" alt="Apple Liquid Glass">
  <img src="https://img.shields.io/badge/version-3.1.0-10b981" alt="v3.1.0">
</p>

<p align="center">
  Geliştirici: <strong>Alptuğ Dağ</strong> (<a href="https://github.com/AlptugDag">@alptugdag</a>)
</p>

---

<p align="center">
  <img src="docs/screenshots/alptuguide_hero_showcase.png" alt="Alptuguide Studio Hero Showcase" width="100%">
</p>

---

## Öne Çıkan Yenilikler ve Mimari (v3.1)

### 1. 💎 Apple Liquid Glass Arayüz Tasarımı
Alptuguide Studio v3.1, modern macOS ve Apple tasarım diline uygun **Liquid Glass** mimarisiyle sıfırdan tasarlandı:
- **Refractive Specular Sheen**: Yarı saydam cam katmanların üst kenarında ışık kırılması ve parıltı hissi veren özel yansıma hatları.
- **Translucent Backdrop Blur**: macOS `NSVisualEffectView` ve modern CSS `backdrop-filter: blur(32px)` ile panel arkasındaki kurgu ortamını zarifçe yansıtan derinlikli cam efekti.
- **Liquid Capsule Controls**: Akıcı geçişlere sahip kapsül segmentli sekmeler, sıvı parıltılı butonlar ve dokunsal mikro etkileşimler.
- **Kompakt Çoklu Panel**: Her monitör çözünürlüğünde kristal netliğinde vektörel ikonografi ve pürüzsüz çalışma alanı.

<p align="center">
  <img src="docs/screenshots/liquid_glass_panel.png" alt="Alptuguide Studio Liquid Glass UI" width="70%">
</p>

---

### 2. 🎬 DaVinci Resolve Studio Tam Entegrasyonu
DaVinci Resolve kullanıcıları için sıfır eforla çalışan çift katmanlı yerel entegrasyon eklendi:
- **Workflow Integration Plugin**: DaVinci Resolve Studio'nun yerel Electron mimarisi üzerinden çalışan bağımsız Liquid Glass Studio arayüzü (`~/Library/Application Support/Blackmagic Design/DaVinci Resolve/Workflow Integration Plugins/com.alptug.alptuguide`).
- **Fusion / Edit Scripts**: DaVinci Resolve menüsünden (`Workspace > Scripts > Alptuguide Studio`) tek tıkla tetiklenebilen yerel Python otomasyonu.
- **Python SDK Köprüsü (`resolve_bridge.py`)**:
  - **Otomatik Çözünürlük Algılama**: Timeline'ın `1080×1920`, `2160×3840 (4K)` veya yatay formatını anında okuyup kılavuzları dinamik olarak ölçekler.
  - **Viewer Kare Yakalama (`ExportCurrentFrameAsStill`)**: Playhead üzerindeki kareyi anında yakalayıp Alptuguide Studio önizlemesine aktarır.
  - **Tek Tıkla Timeline'a Kılavuz Ekleme (`AppendToTimeline`)**: İlgili güvenli alan kılavuzunu timeline'ın en üst video izine otomatik ekler veya tek tıkla temizler.

---

### 3. 📱 1:1 Doğrulanmış Sosyal Medya Güvenli Alanları
Platformların güncel resmi tasarım kılavuzları ve canlı testleri baz alınarak piksel hassasiyetinde (`1080 × 1920` referans, `4K 2160 × 3840` otomatik ölçek) kalibre edildi:

<p align="center">
  <img src="docs/screenshots/safezones_4up.png" alt="Doğrulanmış 4'lü Güvenli Alanlar" width="100%">
</p>

| Platform | Üst Boşluk | Alt Boşluk (Tam / Organik UI) | Alt Nav Bar | Sol Boşluk | Sağ Aksiyon Sütunu | Altyazı Güvenli Y |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Instagram Reels** | `269 px` | `672 px` / `440 px` (`y: 1480`) | `110 px` (`y: 1810`) | `65 px` | `146 px` (`x: 934`) | `1420 px` |
| **TikTok** | `252 px` | `620 px` / `490 px` (`y: 1430`) | `162 px` (`y: 1758`) | `60 px` | `184 px` (`x: 896`) | `1375 px` |
| **YouTube Shorts** | `288 px` | `672 px` / `480 px` (`y: 1440`) | `144 px` (`y: 1776`) | `48 px` | `192 px` (`x: 888`) | `1385 px` |
| **Ortak (3 Platform)** | `288 px` | `672 px` / `490 px` (`y: 1430`) | `162 px` (`y: 1758`) | `65 px` | `192 px` (`x: 888`) | `1375 px` |

- **Instagram Reels (`reels`)**: Meta resmi standartlarına birebir uyumlu; üst `269 px` (`%14`), alt `672 px` (`%35` tam güvenli sınır) / `440 px` (`y: 1480..1810` organik açıklama + ses alanı) + `110 px` (`y: 1810..1920` alt navigasyon barı), sol `65 px` (`%6`), sağ `146 px` (`x: 934..1080` beğeni/yorum/kaydetme/paylaşım sütunu).
- **TikTok (`tiktok`)**: TikTok Creative Center standartlarına birebir uyumlu; üst `252 px` (`%13.1`), alt `620 px` (`%32` geniş açıklama) / `490 px` (`y: 1430..1758` organik kullanıcı/açıklama/ses alanı) + `162 px` (`y: 1758..1920` alt siyah navigasyon barı), sol `60 px`, sağ `184 px` (`x: 896..1080` sağ aksiyon sütunu ve dönen plak).
- **YouTube Shorts (`shorts`)**: YouTube Studio 9:16 standartlarına birebir uyumlu; üst `288 px` (`%15`), alt `672 px` (`%35` tam güvenli sınır) / `480 px` (`y: 1440..1776` kanal/Abone ol/başlık/ses alanı) + `144 px` (`y: 1776..1920` alt navigasyon barı ve kırmızı ilerleme çizgisi), sol `48 px`, sağ `192 px` (`x: 888..1080` sağ aksiyon sütunu).
- **Ortak Kılavuz (`all`)**: Tek videoyu aynı anda hem Reels, hem TikTok, hem YouTube Shorts'ta paylaşan içerik üreticileri için **3 platformun en sıkı kesişim alanı**:
  - Üst: `288 px` | Alt: `672 px` (Organik: `490 px`) | Sol: `65 px` | Sağ: `192 px`
  - **Net %100 Güvenli Merkez Alan**: `823 × 960 px` (`x: 65..888`, `y: 288..1248`) — Organik modda `823 × 1142 px` (`y: 288..1430`).

---

### 4. ⚡️ Sıfır Takılma & Sıfır CPU/GPU Yükü Mimarisi
- **Asenkron Kare Yakalama**: ExtendScript ve Python işlemlerinde ana iş parçacığını donduran tüm bloklayıcı döngüler kaldırıldı; asenkron Event-Driven mimari kullanılır.
- **Playhead Settle Algılama**: Timeline üzerinde gezinirken (scrubbing) veya video oynatılırken kurgu yazılımının kilit mekanizmalarını asla meşgul etmez; yalnızca playhead durduğunda kareyi günceller.
- **Path2D Önbellekleme & 0% Idle GPU**: İkon vektörleri (`Path2D`) önbellekten çizilir, her karede yeniden nesne oluşturulmaz ve arka planda GPU tüketen sonsuz CSS animasyonları kaldırılmıştır.

---

### 5. 🖥️ Yerel macOS Ekran Üstü Overlay & Studio Uygulaması (`/Applications/Alptuguide.app`)
- Timeline'a hiçbir katman eklemeden Program Monitörü veya DaVinci Viewer üzerine oturan, tıklamaları alta geçiren (`ignoresMouseEvents`) yerel macOS (`arm64` + `x86_64` Universal Binary) uygulaması.
- Çift pencere mimarisi: Hem **Liquid Glass Studio** yönetim paneli hem de **Şeffaf Ekran Üstü Kılavuz (HUD)** tek bir tıkla menü çubuğundan yönetilebilir.
- **Premiere Pro**, **After Effects**, **DaVinci Resolve**, **Final Cut Pro** ve **CapCut** üzerinde bağımsız (standalone) olarak da çalışır.

---

## Kurulum

```bash
git clone https://github.com/AlptugDag/Alptuguide.git
cd Alptuguide
./install.sh
```

Kurulum betiği (`./install.sh`):
1. **Adobe CEP Entegrasyonu**: Adobe `CSXS.9` – `CSXS.20` (`2020` – `2030+`) sürümleri için `PlayerDebugMode` ayarını otomatik açar ve eklentiyi `~/Library/Application Support/Adobe/CEP/extensions/com.alptug.alptuguide` dizinine kurar.
2. **DaVinci Resolve Entegrasyonu**: DaVinci Resolve Workflow Integration eklentisini ve `Fusion/Scripts` klasörlerine Python Studio betiklerini yerleştirir.
3. **Yerel macOS Uygulaması**: Evrensel (`arm64` + `x86_64`) ikiliyi derleyerek `/Applications/Alptuguide.app` konumuna yükler.

---

## Lisans

© 2026 **Alptuğ Dağ** (<a href="https://github.com/AlptugDag">@alptugdag</a>). Tüm hakları saklıdır.

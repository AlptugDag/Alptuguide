#!/bin/bash
# Alptuguide™ Studio v3.0 — One-Command macOS Installer
# Installs:
#   1. Adobe Premiere Pro & After Effects CEP Extension (2020–2030+ future-proof)
#   2. Native macOS Universal App (/Applications/Alptuguide.app & Alptuguide Overlay.app)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
CEP_EXT_DIR="$HOME/Library/Application Support/Adobe/CEP/extensions/com.alptug.alptuguide"
SHARE_DIR="$HOME/Library/Application Support/Alptuguide"

echo "==> [1/4] Adobe CSXS PlayerDebugMode etkinleştiriliyor (CSXS.9 .. CSXS.20)..."
for ver in $(seq 9 20); do
    defaults write "com.adobe.CSXS.${ver}" PlayerDebugMode 1 2>/dev/null || true
done

echo "==> [2/4] Adobe CEP Eklentisi kuruluyor: $CEP_EXT_DIR"
mkdir -p "$CEP_EXT_DIR"
rsync -a --delete \
    --exclude ".git" \
    --exclude ".DS_Store" \
    --exclude "dist" \
    "$ROOT_DIR/" "$CEP_EXT_DIR/"

echo "==> [3/4] Eski Adobe CEP önbelleği (cep_cache) temizleniyor..."
rm -rf "$HOME/Library/Caches/CSXS/cep_cache/"*alptuguide* 2>/dev/null || true

echo "==> [4/4] Yerel macOS Uygulaması (Alptuguide.app & Overlay) derleniyor..."
chmod +x "$ROOT_DIR/overlay/build.sh"
"$ROOT_DIR/overlay/build.sh"

# Seed default 1:1 Reels guide into shared overlay folder if overlay.png does not exist yet
mkdir -p "$SHARE_DIR"
if [ ! -f "$SHARE_DIR/overlay.png" ] && [ -f "$ROOT_DIR/assets/reels_guides.png" ]; then
    cp -f "$ROOT_DIR/assets/reels_guides.png" "$SHARE_DIR/overlay.png"
fi

echo ""
echo "=================================================================="
echo " Alptuguide™ Studio v3.0 başarıyla kuruldu!"
echo " - Adobe CEP Paneli : Window > Extensions > Alptuguide Studio"
echo " - macOS Uygulaması : /Applications/Alptuguide.app"
echo "=================================================================="

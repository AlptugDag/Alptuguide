#!/bin/bash
# Alptuguide™ Liquid Glass Studio v3.2 — One-Command macOS Installer
# Installs:
#   1. Adobe Premiere Pro & After Effects CEP Extension (2020–2030+ future-proof)
#   2. DaVinci Resolve Integration (Workspace > Scripts > Alptuguide Studio & Workflow Integration)
#   3. Native macOS Liquid Glass Universal App (/Applications/Alptuguide.app & Alptuguide Overlay.app)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
CEP_EXT_DIR="$HOME/Library/Application Support/Adobe/CEP/extensions/com.alptug.alptuguide"
SHARE_DIR="$HOME/Library/Application Support/Alptuguide"
RESOLVE_USER_SCRIPTS_UTIL="$HOME/Library/Application Support/Blackmagic Design/DaVinci Resolve/Fusion/Scripts/Utility"
RESOLVE_USER_SCRIPTS_EDIT="$HOME/Library/Application Support/Blackmagic Design/DaVinci Resolve/Fusion/Scripts/Edit"
RESOLVE_USER_WORKFLOW="$HOME/Library/Application Support/Blackmagic Design/DaVinci Resolve/Workflow Integration Plugins/com.alptug.alptuguide"
RESOLVE_SYS_WORKFLOW="/Library/Application Support/Blackmagic Design/DaVinci Resolve/Workflow Integration Plugins/com.alptug.alptuguide"
RESOLVE_SDK_NODE="/Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer/Workflow Integrations/Examples/CompatibleSamplePlugin/WorkflowIntegration.node"

echo "==> [1/5] Adobe CSXS PlayerDebugMode etkinleştiriliyor (CSXS.9 .. CSXS.20)..."
for ver in $(seq 9 20); do
    defaults write "com.adobe.CSXS.${ver}" PlayerDebugMode 1 2>/dev/null || true
done

echo "==> [2/5] Adobe CEP Eklentisi kuruluyor: $CEP_EXT_DIR"
mkdir -p "$CEP_EXT_DIR"
rsync -a --delete \
    --exclude ".git" \
    --exclude ".DS_Store" \
    --exclude "dist" \
    "$ROOT_DIR/" "$CEP_EXT_DIR/"

echo "==> [3/5] Eski Adobe CEP önbelleği (cep_cache) temizleniyor..."
rm -rf "$HOME/Library/Caches/CSXS/cep_cache/"*alptuguide* 2>/dev/null || true

echo "==> [4/5] DaVinci Resolve Entegrasyonu kuruluyor (Scripts & Workflow Integration)..."
mkdir -p "$RESOLVE_USER_SCRIPTS_UTIL" "$RESOLVE_USER_SCRIPTS_EDIT"
cp -f "$ROOT_DIR/resolve/Alptuguide_Studio.py" "$RESOLVE_USER_SCRIPTS_UTIL/Alptuguide Studio.py"
cp -f "$ROOT_DIR/resolve/Alptuguide_Studio.py" "$RESOLVE_USER_SCRIPTS_EDIT/Alptuguide Studio.py"
chmod +x "$RESOLVE_USER_SCRIPTS_UTIL/Alptuguide Studio.py" "$RESOLVE_USER_SCRIPTS_EDIT/Alptuguide Studio.py"

install_resolve_workflow() {
    local target_dir="$1"
    mkdir -p "$target_dir" 2>/dev/null || return 0
    rsync -a --delete \
        --exclude ".git" \
        --exclude ".DS_Store" \
        --exclude "dist" \
        "$ROOT_DIR/" "$target_dir/" 2>/dev/null || return 0
    cp -f "$ROOT_DIR/resolve/manifest.xml" "$target_dir/manifest.xml" 2>/dev/null || true
    cp -f "$ROOT_DIR/resolve/package.json" "$target_dir/package.json" 2>/dev/null || true
    if [ -f "$RESOLVE_SDK_NODE" ]; then
        cp -f "$RESOLVE_SDK_NODE" "$target_dir/resolve/WorkflowIntegration.node" 2>/dev/null || true
    fi
}

install_resolve_workflow "$RESOLVE_USER_WORKFLOW"
if [ -w "/Library/Application Support/Blackmagic Design/DaVinci Resolve" ]; then
    install_resolve_workflow "$RESOLVE_SYS_WORKFLOW"
fi

echo "==> [5/5] Yerel macOS Liquid Glass Uygulaması (Alptuguide.app & Overlay) derleniyor..."
chmod +x "$ROOT_DIR/overlay/build.sh"
"$ROOT_DIR/overlay/build.sh"

# Seed default 1:1 Reels guide into shared overlay folder if overlay.png does not exist yet
mkdir -p "$SHARE_DIR"
if [ ! -f "$SHARE_DIR/overlay.png" ] && [ -f "$ROOT_DIR/assets/reels_guides.png" ]; then
    cp -f "$ROOT_DIR/assets/reels_guides.png" "$SHARE_DIR/overlay.png"
fi

echo ""
echo "=================================================================="
echo " Alptuguide™ Liquid Glass Studio v3.2 başarıyla kuruldu!"
echo " - Adobe Premiere & AE : Window > Extensions > Alptuguide Studio"
echo " - DaVinci Resolve     : Workspace > Scripts > Alptuguide Studio"
echo " - macOS Uygulaması    : /Applications/Alptuguide.app"
echo "=================================================================="

#!/bin/bash
# Builds "Alptuguide Overlay.app" and "/Applications/Alptuguide.app" (Universal Binary: arm64 + x86_64)
# Bundled with:
# - Full Liquid Glass Studio UI (index.html, css, core, js, assets, resolve bridge)
# - 1:1 verified platform safe-zone guides (Reels, TikTok, Shorts, Ortak)
set -euo pipefail
cd "$(dirname "$0")"

APP="Alptuguide Overlay.app"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources/ui"

swiftc -O -target arm64-apple-macos13.0 -framework Cocoa -framework WebKit src/main.swift -o "$APP/Contents/MacOS/AlptuguideOverlay.arm64"
swiftc -O -target x86_64-apple-macos13.0 -framework Cocoa -framework WebKit src/main.swift -o "$APP/Contents/MacOS/AlptuguideOverlay.x86_64"
lipo -create "$APP/Contents/MacOS/AlptuguideOverlay.arm64" "$APP/Contents/MacOS/AlptuguideOverlay.x86_64" \
     -output "$APP/Contents/MacOS/AlptuguideOverlay"
rm "$APP/Contents/MacOS/AlptuguideOverlay.arm64" "$APP/Contents/MacOS/AlptuguideOverlay.x86_64"

# Bundle 1:1 verified safe-zone guide PNGs and official Alptuguide logo/icon into Resources
if [ -d "../assets" ]; then
    cp -f ../assets/*_guides.png "$APP/Contents/Resources/" 2>/dev/null || true
    cp -f ../assets/imza.svg "$APP/Contents/Resources/" 2>/dev/null || true
    cp -f ../assets/AppIcon.icns "$APP/Contents/Resources/" 2>/dev/null || true
fi

# Bundle full Liquid Glass Studio UI + DaVinci Resolve bridge into Resources/ui
cp -f ../index.html "$APP/Contents/Resources/ui/"
cp -R ../css ../core ../js ../assets ../resolve "$APP/Contents/Resources/ui/"
chmod +x "$APP/Contents/Resources/ui/resolve/resolve_bridge.py" "$APP/Contents/Resources/ui/resolve/Alptuguide_Studio.py"

cat > "$APP/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleIdentifier</key><string>com.alptug.alptuguide.overlay</string>
    <key>CFBundleName</key><string>Alptuguide</string>
    <key>CFBundleDisplayName</key><string>Alptuguide</string>
    <key>CFBundleExecutable</key><string>AlptuguideOverlay</string>
    <key>CFBundleIconFile</key><string>AppIcon</string>
    <key>CFBundlePackageType</key><string>APPL</string>
    <key>CFBundleShortVersionString</key><string>3.2.0</string>
    <key>CFBundleVersion</key><string>320</string>
    <key>LSMinimumSystemVersion</key><string>13.0</string>
    <key>LSUIElement</key><true/>
    <key>NSHighResolutionCapable</key><true/>
    <key>NSHumanReadableCopyright</key><string>© 2026 Alptuğ Dağ (@alptugdag)</string>
</dict>
</plist>
PLIST

codesign --force --deep -s - "$APP"

DEST="$HOME/Library/Application Support/Alptuguide"
mkdir -p "$DEST"
rm -rf "$DEST/$APP"
cp -R "$APP" "$DEST/"

# Also install standalone app bundle to /Applications/Alptuguide.app
rm -rf "/Applications/Alptuguide.app" 2>/dev/null || true
cp -R "$APP" "/Applications/Alptuguide.app" 2>/dev/null || true

echo "Installed: $DEST/$APP"
echo "Installed: /Applications/Alptuguide.app"

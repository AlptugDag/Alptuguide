// Alptuguide™ Native macOS App & Floating Safe-Zone Overlay v3.0
// Copyright (c) 2026 Alptuğ Dağ (@alptugdag). All rights reserved.
//
// Zero-lag, click-through floating overlay window for:
// - Adobe Premiere Pro & After Effects (CEP Panel Live Sync + Built-in 1:1 Guides)
// - DaVinci Resolve, Final Cut Pro, CapCut, QuickTime (Standalone 1:1 Guides)

import Cocoa

let shareDir = FileManager.default.homeDirectoryForCurrentUser
    .appendingPathComponent("Library/Application Support/Alptuguide", isDirectory: true)
let imageURL = shareDir.appendingPathComponent("overlay.png")
let stateURL = shareDir.appendingPathComponent("state.json")

struct OverlayState: Codable {
    var visible: Bool?
    var edit: Bool?
    var host: String?
    var platform: String?
    var rev: Int?
    var quit: Bool?
}

enum GuideSourceMode: String {
    case panelSync = "sync"
    case reels = "reels"
    case tiktok = "tiktok"
    case shorts = "shorts"
    case all = "all"
}

final class OverlayView: NSView {
    var image: NSImage?
    var editing = false
    var overlayOpacity: CGFloat = 1.0

    override var acceptsFirstResponder: Bool { true }

    func fitRect(_ size: NSSize) -> NSRect {
        guard size.width > 0, size.height > 0 else { return bounds }
        let s = min(bounds.width / size.width, bounds.height / size.height)
        let w = size.width * s, h = size.height * s
        return NSRect(x: (bounds.width - w) / 2, y: (bounds.height - h) / 2, width: w, height: h)
    }

    override func draw(_ dirtyRect: NSRect) {
        NSColor.clear.setFill()
        dirtyRect.fill(using: .copy)

        if editing {
            NSColor(calibratedRed: 0.08, green: 0.72, blue: 0.65, alpha: 0.14).setFill()
            bounds.fill()
            let border = NSBezierPath(rect: bounds.insetBy(dx: 1.5, dy: 1.5))
            border.lineWidth = 3
            NSColor(calibratedRed: 0.02, green: 0.95, blue: 0.99, alpha: 0.95).setStroke()
            border.stroke()
        }

        if let img = image {
            img.draw(in: fitRect(img.size), from: .zero, operation: .sourceOver, fraction: overlayOpacity)
        }

        if editing {
            let text = "Alptuguide™ Hizalama Modu\nPencereyi Program Monitörü / Viewer video karesine oturtun.\nKenarlardan boyutlandırın, ortadan sürükleyin.\nKilitlemek için Enter veya Esc tuşuna basın."
            let para = NSMutableParagraphStyle()
            para.alignment = .center
            let attrs: [NSAttributedString.Key: Any] = [
                .font: NSFont.systemFont(ofSize: 12, weight: .semibold),
                .foregroundColor: NSColor.white,
                .backgroundColor: NSColor(calibratedWhite: 0.04, alpha: 0.78),
                .paragraphStyle: para
            ]
            let r = NSRect(x: 10, y: bounds.midY - 38, width: bounds.width - 20, height: 76)
            (text as NSString).draw(in: r, withAttributes: attrs)
        }
    }

    override func keyDown(with event: NSEvent) {
        if event.keyCode == 36 || event.keyCode == 53 {
            (NSApp.delegate as? AppDelegate)?.setEditing(false)
        } else {
            super.keyDown(with: event)
        }
    }
}

final class OverlayWindow: NSWindow {
    override var canBecomeKey: Bool { true }
}

final class AppDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate {
    var window: OverlayWindow!
    var view: OverlayView!
    var statusItem: NSStatusItem!

    var editItem: NSMenuItem!
    var visibleItem: NSMenuItem!
    var alwaysOnTopItem: NSMenuItem!
    var modeItems: [GuideSourceMode: NSMenuItem] = [:]
    var opacityItems: [Int: NSMenuItem] = [:]

    var dirWatcher: DispatchSourceFileSystemObject?
    var dirFD: Int32 = -1
    var fallbackTimer: Timer?

    var host = "PPRO"
    var sourceMode: GuideSourceMode = .panelSync
    var wantVisible = true
    var showInAllApps = false
    var editing = false
    var lastStateDate: Date?
    var lastImageDate: Date?
    var lastRev = -1

    func applicationDidFinishLaunching(_ note: Notification) {
        try? FileManager.default.createDirectory(at: shareDir, withIntermediateDirectories: true)

        view = OverlayView(frame: NSRect(x: 0, y: 0, width: 360, height: 640))
        window = OverlayWindow(
            contentRect: NSRect(x: 200, y: 200, width: 360, height: 640),
            styleMask: [.borderless],
            backing: .buffered,
            defer: false
        )
        window.contentView = view
        window.isOpaque = false
        window.backgroundColor = .clear
        window.hasShadow = false
        window.level = .floating
        window.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .stationary, .ignoresCycle]
        window.ignoresMouseEvents = true
        window.isMovableByWindowBackground = true
        window.isReleasedWhenClosed = false
        window.delegate = self

        buildMenu()
        reloadState(force: true)
        reloadActiveImage(force: true)
        restoreFrame()

        NSWorkspace.shared.notificationCenter.addObserver(
            self,
            selector: #selector(frontAppChanged),
            name: NSWorkspace.didActivateApplicationNotification,
            object: nil
        )

        setupDirectoryWatcher()
        fallbackTimer = Timer.scheduledTimer(withTimeInterval: 1.5, repeats: true) { [weak self] _ in
            self?.reloadState(force: false)
            self?.reloadActiveImage(force: false)
        }
        updateVisibility()
    }

    func setupDirectoryWatcher() {
        dirFD = open(shareDir.path, O_EVTONLY)
        guard dirFD >= 0 else { return }
        let source = DispatchSource.makeFileSystemObjectSource(
            fileDescriptor: dirFD,
            eventMask: [.write, .rename, .extend, .attrib],
            queue: .main
        )
        source.setEventHandler { [weak self] in
            self?.reloadState(force: false)
            self?.reloadActiveImage(force: false)
        }
        source.setCancelHandler { [weak self] in
            if let fd = self?.dirFD, fd >= 0 {
                close(fd)
                self?.dirFD = -1
            }
        }
        source.resume()
        dirWatcher = source
    }

    func buildMenu() {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        if let sigURL = Bundle.main.resourceURL?.appendingPathComponent("imza.svg"),
           let sigImg = NSImage(contentsOf: sigURL) {
            sigImg.size = NSSize(width: 18, height: 18)
            sigImg.isTemplate = true
            statusItem.button?.image = sigImg
            statusItem.button?.imagePosition = .imageLeading
        }
        statusItem.button?.title = "Alptuguide"
        statusItem.button?.toolTip = "Alptuguide™ 1:1 Safe-Zone & Overlay Studio"

        let menu = NSMenu()

        let headerItem = NSMenuItem(title: "Alptuguide™ Studio v3.0", action: nil, keyEquivalent: "")
        headerItem.isEnabled = false
        menu.addItem(headerItem)
        menu.addItem(.separator())

        editItem = NSMenuItem(title: "Hizala / Boyutlandır (Düzenleme Modu)", action: #selector(toggleEdit), keyEquivalent: "e")
        visibleItem = NSMenuItem(title: "Overlay'i Gizle", action: #selector(toggleVisible), keyEquivalent: "h")
        alwaysOnTopItem = NSMenuItem(title: "Her Uygulamada Göster (Standalone Mod)", action: #selector(toggleAlwaysShow), keyEquivalent: "a")

        menu.addItem(editItem)
        menu.addItem(visibleItem)
        menu.addItem(alwaysOnTopItem)
        menu.addItem(NSMenuItem(title: "Konumu Sıfırla", action: #selector(resetFrame), keyEquivalent: "r"))
        menu.addItem(.separator())

        // Platform Guide Selector
        let platformHeader = NSMenuItem(title: "1:1 Kılavuz Kaynağı", action: nil, keyEquivalent: "")
        platformHeader.isEnabled = false
        menu.addItem(platformHeader)

        let modes: [(GuideSourceMode, String, String)] = [
            (.panelSync, "Adobe CEP Panel Canlı Senkron", "1"),
            (.reels, "Instagram Reels (1:1 Doğrulanmış)", "2"),
            (.tiktok, "TikTok (1:1 Doğrulanmış)", "3"),
            (.shorts, "YouTube Shorts (1:1 Doğrulanmış)", "4"),
            (.all, "Ortak Kılavuz (Reels + TikTok + Shorts)", "5")
        ]

        for (m, title, key) in modes {
            let item = NSMenuItem(title: title, action: #selector(selectGuideMode(_:)), keyEquivalent: key)
            item.representedObject = m.rawValue
            item.state = (m == sourceMode) ? .on : .off
            menu.addItem(item)
            modeItems[m] = item
        }

        menu.addItem(.separator())

        // Opacity Submenu
        let opacityMenu = NSMenu()
        for pct in [100, 80, 60, 40] {
            let opItem = NSMenuItem(title: "%\(pct)", action: #selector(selectOpacity(_:)), keyEquivalent: "")
            opItem.tag = pct
            opItem.state = (pct == 100) ? .on : .off
            opItem.target = self
            opacityMenu.addItem(opItem)
            opacityItems[pct] = opItem
        }
        let opacityRoot = NSMenuItem(title: "Overlay Opaklığı", action: nil, keyEquivalent: "")
        opacityRoot.submenu = opacityMenu
        menu.addItem(opacityRoot)

        menu.addItem(.separator())
        menu.addItem(NSMenuItem(title: "Alptuguide'dan Çık", action: #selector(quit), keyEquivalent: "q"))

        for item in menu.items where item.action != nil {
            item.target = self
        }
        statusItem.menu = menu
    }

    @objc func selectGuideMode(_ sender: NSMenuItem) {
        guard let raw = sender.representedObject as? String,
              let mode = GuideSourceMode(rawValue: raw) else { return }
        sourceMode = mode
        for (m, item) in modeItems {
            item.state = (m == mode) ? .on : .off
        }
        wantVisible = true
        reloadActiveImage(force: true)
        updateVisibility()
    }

    @objc func selectOpacity(_ sender: NSMenuItem) {
        let pct = sender.tag
        view.overlayOpacity = CGFloat(pct) / 100.0
        for (k, item) in opacityItems {
            item.state = (k == pct) ? .on : .off
        }
        view.needsDisplay = true
    }

    @objc func toggleAlwaysShow() {
        showInAllApps.toggle()
        alwaysOnTopItem.state = showInAllApps ? .on : .off
        if showInAllApps {
            wantVisible = true
        }
        updateVisibility()
    }

    func modDate(_ url: URL) -> Date? {
        (try? FileManager.default.attributesOfItem(atPath: url.path))?[.modificationDate] as? Date
    }

    func reloadState(force: Bool) {
        guard let d = modDate(stateURL), force || d != lastStateDate else { return }
        lastStateDate = d
        guard let data = try? Data(contentsOf: stateURL),
              let s = try? JSONDecoder().decode(OverlayState.self, from: data) else { return }
        if s.quit == true { NSApp.terminate(nil); return }
        let newHost = s.host ?? host
        if newHost != host {
            saveFrame()
            host = newHost
            restoreFrame()
        }
        if let rev = s.rev, rev != lastRev {
            lastRev = rev
            if let v = s.visible { wantVisible = v }
            if let e = s.edit, e != editing { setEditing(e) }
        }
        updateVisibility()
    }

    func loadBundledGuide(_ name: String) -> NSImage? {
        if let resURL = Bundle.main.resourceURL?.appendingPathComponent("\(name)_guides.png"),
           let img = NSImage(contentsOf: resURL) {
            return img
        }
        return nil
    }

    func reloadActiveImage(force: Bool) {
        if sourceMode != .panelSync {
            if let img = loadBundledGuide(sourceMode.rawValue) {
                view.image = img
                applyAspect()
                view.needsDisplay = true
            }
            return
        }

        if let d = modDate(imageURL) {
            if force || d != lastImageDate {
                lastImageDate = d
                if let data = try? Data(contentsOf: imageURL), let img = NSImage(data: data) {
                    let firstImage = view.image == nil
                    let oldSize = view.image?.size
                    view.image = img
                    if firstImage || oldSize.map({ abs($0.width / $0.height - img.size.width / img.size.height) > 0.01 }) == true {
                        applyAspect()
                    }
                    view.needsDisplay = true
                    return
                }
            } else if view.image != nil {
                return
            }
        }

        // Fallback to built-in 1:1 Reels guide if overlay.png does not exist yet
        if view.image == nil, let fallback = loadBundledGuide("reels") {
            view.image = fallback
            applyAspect()
            view.needsDisplay = true
        }
    }

    var aspect: CGFloat {
        if let s = view.image?.size, s.height > 0 { return s.width / s.height }
        return 9.0 / 16.0
    }

    func applyAspect() {
        let a = aspect
        window.contentAspectRatio = NSSize(width: a * 1000, height: 1000)
        var f = window.frame
        f.size.width = f.size.height * a
        window.setFrame(f, display: true)
    }

    func frameKey() -> String { "frame.\(host)" }

    func restoreFrame() {
        if let s = UserDefaults.standard.string(forKey: frameKey()) {
            let rect = NSRectFromString(s)
            if rect.width > 80 && rect.height > 80 {
                window.setFrame(rect, display: true)
                applyAspect()
                return
            }
        }
        resetFrame()
    }

    func saveFrame() {
        UserDefaults.standard.set(NSStringFromRect(window.frame), forKey: frameKey())
    }

    @objc func resetFrame() {
        let screen = NSScreen.main?.visibleFrame ?? NSRect(x: 0, y: 0, width: 1440, height: 900)
        let h = screen.height * 0.62
        let w = h * aspect
        window.setFrame(NSRect(x: screen.midX - w / 2, y: screen.midY - h / 2, width: w, height: h), display: true)
        saveFrame()
    }

    func windowDidMove(_ notification: Notification) { saveFrame() }
    func windowDidResize(_ notification: Notification) { saveFrame(); view.needsDisplay = true }

    func setEditing(_ on: Bool) {
        editing = on
        view.editing = on
        window.styleMask = on ? [.titled, .resizable, .fullSizeContentView] : [.borderless]
        window.titlebarAppearsTransparent = true
        window.titleVisibility = .hidden
        window.ignoresMouseEvents = !on
        applyAspect()
        editItem.title = on ? "Kilitle (Tıklamalar Geçsin)" : "Hizala / Boyutlandır (Düzenleme Modu)"
        if on {
            NSApp.activate(ignoringOtherApps: true)
            window.makeKeyAndOrderFront(nil)
            window.makeFirstResponder(view)
        } else {
            saveFrame()
        }
        view.needsDisplay = true
        updateVisibility()
    }

    @objc func toggleEdit() { setEditing(!editing) }

    @objc func toggleVisible() {
        wantVisible.toggle()
        updateVisibility()
    }

    @objc func quit() { NSApp.terminate(nil) }

    func isCreativeHostFront() -> Bool {
        if showInAllApps { return true }
        guard let app = NSWorkspace.shared.frontmostApplication else { return false }
        if app.processIdentifier == ProcessInfo.processInfo.processIdentifier { return true }
        let id = (app.bundleIdentifier ?? "").lowercased()
        let name = (app.localizedName ?? "").lowercased()
        return id.hasPrefix("com.adobe.premierepro")
            || id.hasPrefix("com.adobe.aftereffects")
            || id.contains("blackmagic")
            || name.contains("davinci")
            || id.contains("finalcut")
            || id.contains("capcut")
            || name.contains("premiere")
            || name.contains("after effects")
    }

    @objc func frontAppChanged() { updateVisibility() }

    func updateVisibility() {
        visibleItem.title = wantVisible ? "Overlay'i Gizle" : "Overlay'i Göster"
        let show = editing || (wantVisible && view.image != nil && isCreativeHostFront())
        if show {
            if !window.isVisible { window.orderFrontRegardless() }
        } else if window.isVisible {
            window.orderOut(nil)
        }
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.accessory)
app.run()

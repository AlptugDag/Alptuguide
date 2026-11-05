// Alptuguide™ Native macOS Liquid Glass Studio & Floating Safe-Zone Overlay v3.2
// Copyright (c) 2026 Alptuğ Dağ (@alptugdag). All rights reserved.
//
// Dual-window architecture:
// 1. StudioWindow: Translucent Apple Liquid Glass Studio panel (NSVisualEffectView + WKWebView)
//    connected directly to DaVinci Resolve (via resolve_bridge.py) & macOS Floating Overlay.
// 2. OverlayWindow: Zero-lag, click-through floating safe-zone overlay for Premiere Pro,
//    After Effects, DaVinci Resolve, Final Cut Pro, CapCut, and QuickTime.

import Cocoa
import WebKit
import Carbon.HIToolbox

let shareDir = FileManager.default.homeDirectoryForCurrentUser
    .appendingPathComponent("Library/Application Support/Alptuguide", isDirectory: true)
let imageURL = shareDir.appendingPathComponent("overlay.png")
let stateURL = shareDir.appendingPathComponent("state.json")
let statusURL = shareDir.appendingPathComponent("overlay_status.json")

struct OverlayState: Codable {
    var visible: Bool?
    var edit: Bool?
    var openStudio: Bool?
    var host: String?
    var platform: String?
    var aspect: Double?
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
            let text = "Alptuguide™ Hizalama\nVideo karesine oturtun: ortadan sürükleyin, kenardan boyutlandırın.\nOk tuşları 1px (⇧ 10px) · + / − ölçek · Enter kilitler.\nAyar editör penceresine göre kaydedilir ve pencereyi takip eder."
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
        guard let d = NSApp.delegate as? AppDelegate else { return super.keyDown(with: event) }
        let step: CGFloat = event.modifierFlags.contains(.shift) ? 10 : 1
        switch event.keyCode {
        case 36, 76, 53: d.setEditing(false)                 // Enter / Esc -> lock
        case 123: d.nudge(dx: -step, dy: 0)                  // ←
        case 124: d.nudge(dx: step, dy: 0)                   // →
        case 125: d.nudge(dx: 0, dy: -step)                  // ↓
        case 126: d.nudge(dx: 0, dy: step)                   // ↑
        case 24, 69: d.scaleOverlay(by: 1 + 0.004 * step)    // + / =
        case 27, 78: d.scaleOverlay(by: 1 - 0.004 * step)    // -
        default: super.keyDown(with: event)
        }
    }
}

final class OverlayWindow: NSWindow {
    override var canBecomeKey: Bool { true }
}

final class TransparentWebView: WKWebView {
    override var isOpaque: Bool { false }
}

final class AppDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate, WKScriptMessageHandler {
    var window: OverlayWindow!
    var view: OverlayView!
    var studioWindow: NSWindow?
    var studioWebView: WKWebView?
    var statusItem: NSStatusItem!

    var studioItem: NSMenuItem!
    var editItem: NSMenuItem!
    var visibleItem: NSMenuItem!
    var alwaysOnTopItem: NSMenuItem!
    var modeItems: [GuideSourceMode: NSMenuItem] = [:]
    var opacityItems: [Int: NSMenuItem] = [:]

    var dirWatcher: DispatchSourceFileSystemObject?
    var dirFD: Int32 = -1
    var fallbackTimer: Timer?

    var host = "RESOLVE"
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

        NSEvent.addGlobalMonitorForEvents(matching: .keyDown) { [weak self] event in
            if event.modifierFlags.contains([.control, .option]) && event.keyCode == 5 {
                DispatchQueue.main.async { self?.toggleVisible() }
            }
        }
        NSEvent.addLocalMonitorForEvents(matching: .keyDown) { [weak self] event in
            if event.modifierFlags.contains([.control, .option]) && event.keyCode == 5 {
                DispatchQueue.main.async { self?.toggleVisible() }
                return nil
            }
            return event
        }
        writeStatus()

        let args = CommandLine.arguments
        if args.contains("--studio") {
            openStudioWindow()
        }
    }

    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        openStudioWindow()
        return true
    }

    // MARK: - Native Liquid Glass Studio Window (macOS + DaVinci Resolve)

    @objc func openStudioWindow() {
        if let win = studioWindow {
            NSApp.activate(ignoringOtherApps: true)
            win.makeKeyAndOrderFront(nil)
            return
        }

        let rect = NSRect(x: 120, y: 120, width: 410, height: 860)
        let win = NSWindow(
            contentRect: rect,
            styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView],
            backing: .buffered,
            defer: false
        )
        win.title = "Alptuguide™ Liquid Glass Studio"
        win.titlebarAppearsTransparent = true
        win.titleVisibility = .hidden
        win.isOpaque = false
        win.backgroundColor = NSColor(calibratedRed: 0.03, green: 0.05, blue: 0.09, alpha: 0.78)
        win.minSize = NSSize(width: 360, height: 540)
        win.isReleasedWhenClosed = false
        win.level = .normal

        let visualEffect = NSVisualEffectView(frame: rect)
        visualEffect.material = .hudWindow
        visualEffect.blendingMode = .behindWindow
        visualEffect.state = .active
        visualEffect.autoresizingMask = [.width, .height]

        let config = WKWebViewConfiguration()
        config.userContentController.add(self, name: "alptuguide")
        config.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")

        let webFrame = NSRect(x: 0, y: 0, width: rect.width, height: rect.height)
        let webView = TransparentWebView(frame: webFrame, configuration: config)
        webView.autoresizingMask = [.width, .height]
        webView.setValue(false, forKey: "drawsBackground")

        if let uiDir = Bundle.main.resourceURL?.appendingPathComponent("ui"),
           FileManager.default.fileExists(atPath: uiDir.appendingPathComponent("index.html").path) {
            let indexURL = uiDir.appendingPathComponent("index.html")
            webView.loadFileURL(indexURL, allowingReadAccessTo: uiDir)
        }

        visualEffect.addSubview(webView)
        win.contentView = visualEffect
        studioWindow = win
        studioWebView = webView

        win.center()
        NSApp.activate(ignoringOtherApps: true)
        win.makeKeyAndOrderFront(nil)
    }

    func replyToWebView(callbackId: Int?, result: String) {
        guard let cid = callbackId, let wv = studioWebView else { return }
        if let jsonData = try? JSONEncoder().encode(result),
           let escaped = String(data: jsonData, encoding: .utf8) {
            DispatchQueue.main.async {
                wv.evaluateJavaScript("window.__alptuguideNativeCallback && window.__alptuguideNativeCallback(\(cid), \(escaped));", completionHandler: nil)
            }
        }
    }

    func runResolveBridge(cmd: String, arg1: String = "", arg2: String = "", completion: @escaping (String) -> Void) {
        DispatchQueue.global(qos: .userInitiated).async {
            guard let scriptURL = Bundle.main.resourceURL?.appendingPathComponent("ui/resolve/resolve_bridge.py"),
                  FileManager.default.fileExists(atPath: scriptURL.path) else {
                completion("{\"ok\":false,\"status\":\"NO_SCRIPT\",\"message\":\"DaVinci Resolve köprüsü bulunamadı.\",\"host\":\"RESOLVE\"}")
                return
            }
            let proc = Process()
            proc.executableURL = URL(fileURLWithPath: "/usr/bin/python3")
            var args = [scriptURL.path, cmd]
            if !arg1.isEmpty { args.append(arg1) }
            if !arg2.isEmpty { args.append(arg2) }
            proc.arguments = args

            let pipe = Pipe()
            proc.standardOutput = pipe
            proc.standardError = FileHandle.nullDevice
            do {
                try proc.run()
                proc.waitUntilExit()
                let data = pipe.fileHandleForReading.readDataToEndOfFile()
                let out = String(data: data, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
                completion(out)
            } catch {
                completion("{\"ok\":false,\"error\":\"\(error.localizedDescription)\",\"host\":\"RESOLVE\"}")
            }
        }
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any],
              let action = body["action"] as? String else { return }
        let callbackId = body["callbackId"] as? Int

        switch action {
        case "publishOverlay":
            if let b64 = body["pngBase64"] as? String,
               let data = Data(base64Encoded: b64) {
                try? data.write(to: imageURL)
                reloadActiveImage(force: true)
            }
            if let stDict = body["state"] as? [String: Any],
               let stData = try? JSONSerialization.data(withJSONObject: stDict) {
                try? stData.write(to: stateURL)
            }
            replyToWebView(callbackId: callbackId, result: "OK")

        case "toggleOverlay":
            if let vis = body["visible"] as? Bool { wantVisible = vis }
            if let ed = body["edit"] as? Bool { setEditing(ed) }
            updateVisibility()
            replyToWebView(callbackId: callbackId, result: "OK")

        case "exportDesktop":
            if let fileName = body["fileName"] as? String,
               let b64 = body["pngBase64"] as? String,
               let data = Data(base64Encoded: b64) {
                let desktop = FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Desktop")
                let outURL = desktop.appendingPathComponent(fileName)
                do {
                    try data.write(to: outURL)
                    replyToWebView(callbackId: callbackId, result: "OK")
                } catch {
                    replyToWebView(callbackId: callbackId, result: error.localizedDescription)
                }
            } else {
                replyToWebView(callbackId: callbackId, result: "Geçersiz PNG verisi")
            }

        case "insertLayer":
            guard let fileName = body["fileName"] as? String,
                  let displayName = body["displayName"] as? String,
                  let b64 = body["pngBase64"] as? String,
                  let data = Data(base64Encoded: b64) else {
                replyToWebView(callbackId: callbackId, result: "Geçersiz katman verisi")
                return
            }
            let outURL = shareDir.appendingPathComponent(fileName)
            do {
                try data.write(to: outURL)
            } catch {
                replyToWebView(callbackId: callbackId, result: error.localizedDescription)
                return
            }
            let isLive = (body["isLivePreview"] as? Bool) ?? false
            let cmd = isLive ? "initOrUpdateProgramMonitor" : "insertClipPermanent"
            runResolveBridge(cmd: cmd, arg1: outURL.path, arg2: displayName) { [weak self] res in
                self?.replyToWebView(callbackId: callbackId, result: res)
            }

        case "hostCommand":
            let cmd = (body["cmd"] as? String) ?? ""
            let args = (body["args"] as? [Any]) ?? []
            let a1 = args.count > 0 ? String(describing: args[0]) : ""
            let a2 = args.count > 1 ? String(describing: args[1]) : ""

            runResolveBridge(cmd: cmd, arg1: a1, arg2: a2) { [weak self] res in
                guard let self = self else { return }
                if cmd == "captureFrameToTempPath",
                   let rData = res.data(using: .utf8),
                   var jsonObj = (try? JSONSerialization.jsonObject(with: rData)) as? [String: Any],
                   let ok = jsonObj["ok"] as? Bool, ok,
                   let framePath = jsonObj["path"] as? String,
                   let imgData = try? Data(contentsOf: URL(fileURLWithPath: framePath)) {
                    try? FileManager.default.removeItem(atPath: framePath)
                    jsonObj["base64"] = imgData.base64EncodedString()
                    if let updatedData = try? JSONSerialization.data(withJSONObject: jsonObj),
                       let updatedStr = String(data: updatedData, encoding: .utf8) {
                        self.replyToWebView(callbackId: callbackId, result: updatedStr)
                        return
                    }
                }
                self.replyToWebView(callbackId: callbackId, result: res)
            }

        default:
            replyToWebView(callbackId: callbackId, result: "")
        }
    }

    // MARK: - Directory Watcher & Menu Bar

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
        statusItem.button?.toolTip = "Alptuguide™ Liquid Glass Studio & 1:1 Safe-Zone Overlay"

        let menu = NSMenu()

        let headerItem = NSMenuItem(title: "Alptuguide™ Liquid Glass Studio v3.1", action: nil, keyEquivalent: "")
        headerItem.isEnabled = false
        menu.addItem(headerItem)
        menu.addItem(.separator())

        studioItem = NSMenuItem(title: "Studio Panelini Aç (Liquid Glass / DaVinci Resolve)", action: #selector(openStudioWindow), keyEquivalent: "o")
        editItem = NSMenuItem(title: "Overlay'i Hizala / Boyutlandır", action: #selector(toggleEdit), keyEquivalent: "e")
        visibleItem = NSMenuItem(title: "Overlay'i Gizle", action: #selector(toggleVisible), keyEquivalent: "h")
        alwaysOnTopItem = NSMenuItem(title: "Her Uygulamada Göster (Standalone Mod)", action: #selector(toggleAlwaysShow), keyEquivalent: "a")

        menu.addItem(studioItem)
        menu.addItem(.separator())
        menu.addItem(editItem)
        menu.addItem(visibleItem)
        menu.addItem(alwaysOnTopItem)
        menu.addItem(NSMenuItem(title: "Overlay Konumunu Sıfırla", action: #selector(resetFrame), keyEquivalent: "r"))
        menu.addItem(.separator())

        let platformHeader = NSMenuItem(title: "1:1 Kılavuz Kaynağı", action: nil, keyEquivalent: "")
        platformHeader.isEnabled = false
        menu.addItem(platformHeader)

        let modes: [(GuideSourceMode, String, String)] = [
            (.panelSync, "Studio Panel Canlı Senkron", "1"),
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
            if s.openStudio == true { openStudioWindow() }
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

    func windowDidMove(_ notification: Notification) {
        if (notification.object as? NSWindow) === window { saveFrame() }
    }

    func windowDidResize(_ notification: Notification) {
        if (notification.object as? NSWindow) === window {
            saveFrame()
            view.needsDisplay = true
        }
    }


    func nudge(dx: CGFloat, dy: CGFloat) {
        var f = window.frame
        f.origin.x += dx
        f.origin.y += dy
        window.setFrame(f, display: true)
        saveFrame()
    }

    func scaleOverlay(by factor: CGFloat) {
        var f = window.frame
        let newH = max(120, f.height * factor)
        let newW = newH * aspect
        let dx = (newW - f.width) / 2
        let dy = (newH - f.height) / 2
        f.origin.x -= dx
        f.origin.y -= dy
        f.size.width = newW
        f.size.height = newH
        window.setFrame(f, display: true)
        saveFrame()
        view.needsDisplay = true
    }

    func writeStatus() {
        let dict: [String: Any] = [
            "visible": wantVisible,
            "editing": editing,
            "host": host,
            "timestamp": Date().timeIntervalSince1970
        ]
        if let d = try? JSONSerialization.data(withJSONObject: dict) {
            try? d.write(to: statusURL)
        }
    }

    func setEditing(_ on: Bool) {
        editing = on
        view.editing = on
        window.styleMask = on ? [.titled, .resizable, .fullSizeContentView] : [.borderless]
        window.titlebarAppearsTransparent = true
        window.titleVisibility = .hidden
        window.ignoresMouseEvents = !on
        applyAspect()
        editItem.title = on ? "Kilitle (Tıklamalar Geçsin)" : "Overlay'i Hizala / Boyutlandır"
        if on {
            NSApp.activate(ignoringOtherApps: true)
            window.makeKeyAndOrderFront(nil)
            window.makeFirstResponder(view)
        } else {
            saveFrame()
        }
        view.needsDisplay = true
        updateVisibility()
        writeStatus()
    }

    @objc func toggleEdit() { setEditing(!editing) }

    @objc func toggleVisible() {
        wantVisible.toggle()
        updateVisibility()
        writeStatus()
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

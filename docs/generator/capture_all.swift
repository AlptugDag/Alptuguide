import Cocoa
import WebKit

let generatorDir = URL(fileURLWithPath: "/Users/alptug/.gemini/antigravity/scratch/Alptuguide/docs/generator", isDirectory: true)
let outDir = URL(fileURLWithPath: "/Users/alptug/.gemini/antigravity/scratch/Alptuguide/docs/screenshots", isDirectory: true)
try? FileManager.default.createDirectory(at: outDir, withIntermediateDirectories: true)

struct Target {
    let htmlFile: String
    let outFile: String
    let width: CGFloat
    let height: CGFloat
}

let targets: [Target] = [
    Target(htmlFile: "hero_showcase.html", outFile: "alptuguide_hero_showcase.png", width: 2400, height: 1350),
    Target(htmlFile: "panel_snapshot.html", outFile: "liquid_glass_panel.png", width: 760, height: 1040),
    Target(htmlFile: "safezones_4up.html", outFile: "safezones_4up.png", width: 2400, height: 1350)
]

final class BatchCapturer: NSObject, WKNavigationDelegate {
    var currentIndex = 0
    var window: NSWindow!
    var webView: WKWebView!

    func startNext() {
        if currentIndex >= targets.count {
            print("All 3 targets captured successfully!")
            NSApp.terminate(nil)
            return
        }

        let target = targets[currentIndex]
        print("--> Capturing [\(currentIndex + 1)/\(targets.count)]: \(target.htmlFile) -> \(target.outFile)")

        let rect = NSRect(x: 0, y: 0, width: target.width, height: target.height)
        if window != nil {
            window.orderOut(nil)
        }
        window = NSWindow(contentRect: rect, styleMask: [.borderless], backing: .buffered, defer: false)
        window.isOpaque = true
        window.backgroundColor = .black

        let config = WKWebViewConfiguration()
        config.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")
        webView = WKWebView(frame: rect, configuration: config)
        webView.navigationDelegate = self
        window.contentView = webView
        window.orderBack(nil)

        let url = generatorDir.appendingPathComponent(target.htmlFile)
        webView.loadFileURL(url, allowingReadAccessTo: generatorDir.deletingLastPathComponent().deletingLastPathComponent())
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        waitForReady(attempts: 0)
    }

    func waitForReady(attempts: Int) {
        webView.evaluateJavaScript("window.__isReady === true") { [weak self] res, _ in
            guard let self = self else { return }
            let ready = (res as? Bool) ?? false
            if ready || attempts >= 50 {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) {
                    self.takeSnapshotAndSave()
                }
            } else {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                    self.waitForReady(attempts: attempts + 1)
                }
            }
        }
    }

    func takeSnapshotAndSave() {
        let target = targets[currentIndex]
        let cfg = WKSnapshotConfiguration()
        cfg.rect = NSRect(x: 0, y: 0, width: target.width, height: target.height)
        cfg.snapshotWidth = NSNumber(value: Double(target.width))

        webView.takeSnapshot(with: cfg) { [weak self] image, err in
            guard let self = self else { return }
            if let image = image,
               let tiff = image.tiffRepresentation,
               let rep = NSBitmapImageRep(data: tiff),
               let png = rep.representation(using: .png, properties: [:]) {
                let outURL = outDir.appendingPathComponent(target.outFile)
                try? png.write(to: outURL)
                print("    ✓ Saved \(target.outFile) (\(png.count) bytes, \(Int(target.width))x\(Int(target.height)))")
            } else {
                print("    ✗ Error capturing \(target.outFile): \(String(describing: err))")
            }
            self.currentIndex += 1
            self.startNext()
        }
    }
}

let app = NSApplication.shared
app.setActivationPolicy(.accessory)
let capturer = BatchCapturer()
capturer.startNext()
app.run()

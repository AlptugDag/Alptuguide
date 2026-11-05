/**
 * Alptuguide™ Studio — DaVinci Resolve Workflow Integration Main Process
 * Copyright (c) 2026 Alptuğ Dağ (@alptugdag). All rights reserved.
 */
const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
    const rootDir = path.resolve(__dirname, '..');
    const mainWindow = new BrowserWindow({
        width: 420,
        height: 860,
        minWidth: 360,
        minHeight: 540,
        title: 'Alptuguide™ Studio — DaVinci Resolve',
        backgroundColor: '#06080f',
        titleBarStyle: 'hiddenInset',
        vibrancy: 'hud',
        visualEffectState: 'active',
        webPreferences: {
            preload: path.join(__dirname, 'resolve_preload.js'),
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.on('close', function () {
        app.quit();
    });

    mainWindow.loadFile(path.join(rootDir, 'index.html'));
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

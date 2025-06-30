"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = require("path");
const menu_1 = require("./menu");
// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
    electron_1.app.quit();
}
class EngieApp {
    constructor() {
        this.mainWindow = null;
        this.initializeApp();
    }
    initializeApp() {
        // This method will be called when Electron has finished initialization
        electron_1.app.whenReady().then(() => {
            this.createWindow();
            this.setupApplicationMenu();
            this.setupIpcHandlers();
            electron_1.app.on('activate', () => {
                // On macOS it's common to re-create a window in the app when the
                // dock icon is clicked and there are no other windows open.
                if (electron_1.BrowserWindow.getAllWindows().length === 0) {
                    this.createWindow();
                }
            });
        });
        // Quit when all windows are closed, except on macOS
        electron_1.app.on('window-all-closed', () => {
            if (process.platform !== 'darwin') {
                electron_1.app.quit();
            }
        });
        // Security: Prevent new window creation
        electron_1.app.on('web-contents-created', (_, contents) => {
            contents.setWindowOpenHandler(({ url }) => {
                electron_1.shell.openExternal(url);
                return { action: 'deny' };
            });
        });
    }
    createWindow() {
        // Create the browser window
        this.mainWindow = new electron_1.BrowserWindow({
            height: 800,
            width: 1200,
            minHeight: 600,
            minWidth: 900,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: (0, path_1.join)(__dirname, '../preload/preload.js'),
            },
            titleBarStyle: 'hiddenInset',
            vibrancy: 'under-window',
            transparent: true,
            show: false, // Don't show until ready-to-show
        });
        // Load the app
        const isDev = process.env.NODE_ENV === 'development';
        if (isDev) {
            this.mainWindow.loadURL('http://localhost:5173');
            this.mainWindow.webContents.openDevTools();
        }
        else {
            this.mainWindow.loadFile((0, path_1.join)(__dirname, '../renderer/index.html'));
        }
        // Show window when ready to prevent visual flash
        this.mainWindow.once('ready-to-show', () => {
            this.mainWindow?.show();
        });
        // Handle window closed
        this.mainWindow.on('closed', () => {
            this.mainWindow = null;
        });
    }
    setupApplicationMenu() {
        const menu = (0, menu_1.createMenu)({
            onAbout: () => {
                // Handle about dialog
            },
            onPreferences: () => {
                // Handle preferences
            },
            onQuit: () => {
                electron_1.app.quit();
            },
        });
        electron_1.Menu.setApplicationMenu(menu);
    }
    setupIpcHandlers() {
        // Handle app version request
        electron_1.ipcMain.handle('get-app-version', () => {
            return electron_1.app.getVersion();
        });
        // Handle system theme
        electron_1.ipcMain.handle('get-system-theme', () => {
            return require('electron').nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
        });
        // Handle opening external links
        electron_1.ipcMain.handle('open-external', (_, url) => {
            electron_1.shell.openExternal(url);
        });
    }
}
// Initialize Engie
new EngieApp();

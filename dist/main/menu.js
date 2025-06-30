"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMenu = createMenu;
const electron_1 = require("electron");
function createMenu(callbacks) {
    const template = [
        {
            label: 'Gauntlet App',
            submenu: [
                {
                    label: 'About Gauntlet App',
                    click: callbacks.onAbout,
                },
                { type: 'separator' },
                {
                    label: 'Preferences...',
                    accelerator: 'Cmd+,',
                    click: callbacks.onPreferences,
                },
                { type: 'separator' },
                {
                    label: 'Hide Gauntlet App',
                    accelerator: 'Cmd+H',
                    role: 'hide',
                },
                {
                    label: 'Hide Others',
                    accelerator: 'Cmd+Alt+H',
                    role: 'hideOthers',
                },
                {
                    label: 'Show All',
                    role: 'unhide',
                },
                { type: 'separator' },
                {
                    label: 'Quit',
                    accelerator: 'Cmd+Q',
                    click: callbacks.onQuit,
                },
            ],
        },
        {
            label: 'Edit',
            submenu: [
                {
                    label: 'Undo',
                    accelerator: 'Cmd+Z',
                    role: 'undo',
                },
                {
                    label: 'Redo',
                    accelerator: 'Shift+Cmd+Z',
                    role: 'redo',
                },
                { type: 'separator' },
                {
                    label: 'Cut',
                    accelerator: 'Cmd+X',
                    role: 'cut',
                },
                {
                    label: 'Copy',
                    accelerator: 'Cmd+C',
                    role: 'copy',
                },
                {
                    label: 'Paste',
                    accelerator: 'Cmd+V',
                    role: 'paste',
                },
                {
                    label: 'Select All',
                    accelerator: 'Cmd+A',
                    role: 'selectAll',
                },
            ],
        },
        {
            label: 'View',
            submenu: [
                {
                    label: 'Reload',
                    accelerator: 'Cmd+R',
                    role: 'reload',
                },
                {
                    label: 'Force Reload',
                    accelerator: 'Cmd+Shift+R',
                    role: 'forceReload',
                },
                {
                    label: 'Toggle Developer Tools',
                    accelerator: 'F12',
                    role: 'toggleDevTools',
                },
                { type: 'separator' },
                {
                    label: 'Actual Size',
                    accelerator: 'Cmd+0',
                    role: 'resetZoom',
                },
                {
                    label: 'Zoom In',
                    accelerator: 'Cmd+Plus',
                    role: 'zoomIn',
                },
                {
                    label: 'Zoom Out',
                    accelerator: 'Cmd+-',
                    role: 'zoomOut',
                },
                { type: 'separator' },
                {
                    label: 'Toggle Fullscreen',
                    accelerator: 'Ctrl+Cmd+F',
                    role: 'togglefullscreen',
                },
            ],
        },
        {
            label: 'Window',
            submenu: [
                {
                    label: 'Minimize',
                    accelerator: 'Cmd+M',
                    role: 'minimize',
                },
                {
                    label: 'Close',
                    accelerator: 'Cmd+W',
                    role: 'close',
                },
                { type: 'separator' },
                {
                    label: 'Bring All to Front',
                    role: 'front',
                },
            ],
        },
    ];
    return electron_1.Menu.buildFromTemplate(template);
}

const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = require('electron-is-dev');
const conversionService = require('../core/conversion-service');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, '..', 'preload', 'preload.js')
        }
    });

    mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

    if (isDev) {
        mainWindow.webContents.openDevTools();
    }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// --- IPC Handlers ---

ipcMain.handle('choose-directory', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openDirectory']
    });
    
    if (!result.canceled) {
        return { success: true, path: result.filePaths[0] };
    }
    return { success: false, error: 'Директория не выбрана' };
});

ipcMain.handle('check-tools', async () => {
    return await conversionService.checkTools();
});

ipcMain.handle('get-gif-info', async (event, { filePath, ditherType }) => {
    const info = await conversionService.getGifInfo(filePath);
    info.ditherType = ditherType;
    return info;
});

ipcMain.handle('get-png-files', async (event, directory) => {
    return conversionService.getPngFiles(directory);
});

ipcMain.handle('convert-to-gif', async (event, args) => {
    const { groupName, pngFilePaths, outputDir, ...settings } = args;
    return await conversionService.convertToGif(groupName, pngFilePaths, outputDir, settings);
});

ipcMain.handle('open-folder', (event, folderPath) => {
    shell.openPath(folderPath);
});

ipcMain.handle('get-config', () => {
    const configPath = path.join(__dirname, 'config.json');
    const defaultConfig = { 
        frameDelay: 5,
        colorCount: 256
    };

    try {
        if (fs.existsSync(configPath)) {
            const configData = fs.readFileSync(configPath, 'utf-8');
            return { ...defaultConfig, ...JSON.parse(configData) };
        }
    } catch (error) {
        console.error('Ошибка чтения config.json:', error);
    }
    return defaultConfig;
});
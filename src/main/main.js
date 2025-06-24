const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = require('electron-is-dev');
const conversionService = require('../core/conversion-service');
const { spawn } = require('child_process');

let mainWindow;
let isReactMode = false; // По умолчанию используем обычную версию

// ================================================================================
// ФУНКЦИЯ ДЛЯ СОЗДАНИЯ КРАТКОГО ОТЧЕТА
// ================================================================================

function generateQuickSummary(fullReport) {
    const lines = fullReport.split('\n');
    let summary = '';
    
    summary += '╔════════════════════════════════════════════╗\n';
    summary += '║           КРАТКИЙ ОТЧЕТ                    ║\n';
    summary += '╚════════════════════════════════════════════╝\n\n';
    
    // Извлекаем ключевую информацию из полного отчета
    lines.forEach(line => {
        if (line.includes('Дата окончания:') ||
            line.includes('Продолжительность:') ||
            line.includes('Успешно сконвертировано:') ||
            line.includes('Неудачных конвертаций:') ||
            line.includes('Общий размер результатов:') ||
            line.includes('Процент успеха:')) {
            summary += line + '\n';
        }
    });
    
    summary += '\n📁 Подробный отчет см. в файле ОТЧЕТ_КОНВЕРТАЦИИ_*.txt\n';
    summary += `🕒 Создано: ${new Date().toLocaleString('ru-RU')}\n`;
    
    return summary;
}

// ================================================================================
// ОСНОВНОЙ КОД ПРИЛОЖЕНИЯ
// ================================================================================

// Функция для сборки React версии
function buildReactApp() {
    return new Promise((resolve, reject) => {
        console.log('[BUILD] Сборка React версии...');
        const webpack = spawn('npx', ['webpack', '--mode=development'], {
            cwd: path.join(__dirname, '..', '..'),
            stdio: 'inherit'
        });
        
        webpack.on('close', (code) => {
            if (code === 0) {
                console.log('[BUILD] React версия собрана успешно');
                resolve();
            } else {
                console.error('[BUILD] Ошибка сборки React версии');
                reject(new Error(`Webpack завершился с кодом ${code}`));
            }
        });
    });
}

async function createWindow() {
    mainWindow = new BrowserWindow({
        width: 900,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, '..', 'preload', 'preload.js'),
            webSecurity: false // Нужно для загрузки файлов через file://
        }
    });

    // Проверяем аргументы командной строки для выбора версии
    if (process.argv.includes('--react')) {
        isReactMode = true;
    }

    if (isReactMode) {
        try {
            // Собираем React версию если нужно
            const reactBuildPath = path.join(__dirname, '..', '..', 'dist', 'react', 'index.html');
            if (!fs.existsSync(reactBuildPath) || isDev) {
                await buildReactApp();
            }
            
            console.log('[WINDOW] Загружаем React версию');
            mainWindow.loadFile(reactBuildPath);
        } catch (error) {
            console.error('[WINDOW] Ошибка загрузки React версии, переключаемся на обычную:', error);
            isReactMode = false;
            mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
        }
    } else {
        console.log('[WINDOW] Загружаем обычную версию');
        mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
    }

    if (isDev) {
        mainWindow.webContents.openDevTools();
    }

    // Добавляем меню для переключения версий
    mainWindow.webContents.on('did-finish-load', () => {
        if (isDev) {
            mainWindow.webContents.executeJavaScript(`
                console.log('Текущая версия: ${isReactMode ? 'React' : 'Vanilla'}');
                console.log('Для переключения на React версию запустите с флагом --react');
            `);
        }
    });
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

ipcMain.handle('path-join', async (event, ...args) => {
    return path.join(...args);
});

ipcMain.handle('convert-to-gif', async (event, args) => {
    const { groupName, files, outputDir, ...settings } = args;
    return await conversionService.convertToGif(groupName, files, outputDir, settings);
});

ipcMain.handle('open-folder', (event, folderPath) => {
    shell.openPath(folderPath);
});

// ================================================================================
// УЛУЧШЕННЫЙ ОБРАБОТЧИК СОХРАНЕНИЯ ОТЧЕТА
// ================================================================================

ipcMain.handle('save-log', (event, { logContent, directory }) => {
    if (!logContent || !directory) {
        console.error('[REPORT] Недостаточно данных для сохранения отчета');
        return { success: false, error: 'Недостаточно данных' };
    }
    
    try {
        // Убедимся, что директория для отчета существует.
        // { recursive: true } создаст все необходимые родительские директории.
        fs.mkdirSync(directory, { recursive: true });

        // Создаем красивое имя файла с временной меткой
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const logPath = path.join(directory, `ОТЧЕТ_КОНВЕРТАЦИИ_${timestamp}.txt`);
        
        // Записываем отчет в UTF-8 с BOM для лучшей совместимости
        const BOM = '\uFEFF';
        fs.writeFileSync(logPath, BOM + logContent, 'utf-8');
        
        console.log(`[REPORT] Детальный отчет сохранен: ${logPath}`);
        
        // Также сохраняем краткую версию для быстрого просмотра
        const summaryPath = path.join(directory, 'КРАТКИЙ_ОТЧЕТ.txt');
        const summaryContent = generateQuickSummary(logContent);
        fs.writeFileSync(summaryPath, BOM + summaryContent, 'utf-8');
        
        console.log(`[REPORT] Краткий отчет сохранен: ${summaryPath}`);
        
        return { 
            success: true, 
            reportPath: logPath, 
            summaryPath: summaryPath 
        };
    } catch (error) {
        console.error('[REPORT] Ошибка сохранения отчета:', error);
        return { 
            success: false, 
            error: error.message 
        };
    }
});

// ================================================================================
// ДОПОЛНИТЕЛЬНЫЕ ОБРАБОТЧИКИ
// ================================================================================

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

// Обработчик для получения информации о файле
ipcMain.handle('get-file-info', (event, filePath) => {
    try {
        if (!fs.existsSync(filePath)) {
            return { success: false, error: 'Файл не найден' };
        }
        
        const stats = fs.statSync(filePath);
        return {
            success: true,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
            isFile: stats.isFile(),
            isDirectory: stats.isDirectory()
        };
    } catch (error) {
        console.error('[FILE_INFO] Ошибка получения информации о файле:', error);
        return { 
            success: false, 
            error: error.message 
        };
    }
});

ipcMain.handle('show-item-in-folder', (event, filePath) => {
    if (filePath) {
        shell.showItemInFolder(filePath);
    }
});

ipcMain.handle('open-path', (event, pathToOpen) => {
    if (pathToOpen) {
        shell.openPath(pathToOpen);
    }
});

ipcMain.handle('open-external', (event, url) => {
    if (url) {
        shell.openExternal(url);
    }
});

// Добавляем обработчики для старого формата (на случай совместимости)
ipcMain.on('app:show-item-in-folder', (event, filePath) => {
    if (filePath) {
        shell.showItemInFolder(filePath);
    }
});

ipcMain.on('app:open-path', (event, path) => {
    if (path) {
        shell.openPath(path);
    }
});

ipcMain.on('app:open-external', (event, url) => {
    if (url) {
        shell.openExternal(url);
    }
});
const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = require('electron-is-dev');
const conversionService = require('../core/conversion-service');

let mainWindow;

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
    
    return result;
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
    return await conversionService.getPngFiles(directory);
});

// Новый обработчик для конвертации одной группы
ipcMain.handle('convert-group', async (event, { groupName, files, settings, outputDirectory }) => {
    try {
        const result = await conversionService.convertToGif(groupName, files, outputDirectory, settings);
        return result;
    } catch (error) {
        console.error(`Ошибка конвертации группы ${groupName}:`, error);
        throw error;
    }
});

ipcMain.handle('path-join', async (event, ...args) => {
    return path.join(...args);
});

// Новый обработчик для запуска всей конвертации
ipcMain.handle('start-conversion', async (event, { groupedFiles, outputDirectory, settings }) => {
    const conversionResults = [];
    const sessionLog = [];
    const groupNames = Object.keys(groupedFiles);
    let completedCount = 0;

    // Создаем директорию для результатов сессии
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const sessionOutputDir = path.join(outputDirectory, `Результаты конвертации - ${timestamp}`);
    fs.mkdirSync(sessionOutputDir, { recursive: true });

    for (const groupName of groupNames) {
        const files = groupedFiles[groupName];
        // Отправляем прогресс на рендерер
        event.sender.send('conversion:progress', { groupName: groupName, status: 'Начинаем конвертацию...' });
        sessionLog.push(`[ПРОГРЕСС] Начинаем конвертацию группы: ${groupName}`);

        try {
            const result = await conversionService.convertToGif(groupName, files, sessionOutputDir, settings);
            conversionResults.push(result);
            sessionLog.push(...result.logMessages || []);
            if (result.success) {
                completedCount++;
                event.sender.send('conversion:progress', { groupName: groupName, status: 'Успешно завершено.' });
                sessionLog.push(`[УСПЕХ] Группа ${groupName} успешно сконвертирована.`);
            } else {
                event.sender.send('conversion:progress', { groupName: groupName, status: `Ошибка: ${result.error}` });
                sessionLog.push(`[ОШИБКА] Группа ${groupName} ошибка: ${result.error}`);
            }
        } catch (error) {
            console.error(`Ошибка при конвертации группы ${groupName}:`, error);
            conversionResults.push({ success: false, groupName: groupName, error: error.message });
            event.sender.send('conversion:progress', { groupName: groupName, status: `Критическая ошибка: ${error.message}` });
            sessionLog.push(`[КРИТИЧЕСКАЯ ОШИБКА] Группа ${groupName} ошибка: ${error.message}`);
        }
    }

    return { results: conversionResults, log: sessionLog, outputDirectory: sessionOutputDir };
});

// Обработчик для открытия папки
ipcMain.handle('open-output-folder', (event, folderPath) => {
    shell.openPath(folderPath);
});

// ================================================================================
// УЛУЧШЕННЫЙ ОБРАБОТЧИК СОХРАНЕНИЯ ОТЧЕТА
// ================================================================================

ipcMain.handle('save-report', (event, logContent, sessionStart, selectedDirectory) => {
    if (!logContent) {
        console.error('[REPORT] Недостаточно данных для сохранения отчета');
        return { success: false, error: 'Недостаточно данных' };
    }
    
    try {
        // Создаем директорию для отчета внутри выбранной папки
        const timestamp = new Date(sessionStart).toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const reportDir = path.join(selectedDirectory, `Отчеты конвертации`);
        fs.mkdirSync(reportDir, { recursive: true });

        const logPath = path.join(reportDir, `ОТЧЕТ_КОНВЕРТАЦИИ_${timestamp}.txt`);
        
        const BOM = '\uFEFF';
        fs.writeFileSync(logPath, BOM + logContent, 'utf-8');
        
        console.log(`[REPORT] Детальный отчет сохранен: ${logPath}`);
        
        const summaryPath = path.join(reportDir, `КРАТКИЙ_ОТЧЕТ_${timestamp}.txt`);
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
        frameDelay: 3,
        maxSizeKb: 510,
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
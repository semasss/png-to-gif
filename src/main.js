const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = require('electron-is-dev');
const { spawn, execSync } = require('child_process');
const { shell } = require('electron');

let mainWindow;
let gifskiPath; // Глобальная переменная для хранения пути

// Функция для поиска gifski
function findGifskiPath() {
    // 1. В режиме разработки, приоритет у глобальной версии для скорости
    if (isDev) {
        try {
            const systemPath = execSync('which gifski', { encoding: 'utf-8' }).trim();
            if (systemPath && fs.existsSync(systemPath)) {
                console.log(`[GIFSKI_PATH] Режим разработки: используется глобальный gifski из PATH: ${systemPath}`);
                return systemPath;
            }
        } catch (error) {
            console.log('[GIFSKI_PATH] Глобальный gifski не найден, ищем локальную версию как fallback...');
        }
    }

    // 2. Локальная версия (vendor для dev, resources для prod)
    let localPath;
    if (isDev) {
        // Fallback для разработки
        localPath = path.join(__dirname, '..', 'vendor', 'gifski', 'gifski');
    } else {
        // Основной путь для готового приложения
        localPath = path.join(process.resourcesPath, 'gifski');
    }

    if (fs.existsSync(localPath)) {
        console.log(`[GIFSKI_PATH] Используется локальный gifski: ${localPath}`);
        try {
            fs.accessSync(localPath, fs.constants.X_OK);
        } catch (err) {
            console.log(`[GIFSKI_PATH] Устанавливаю права на выполнение для ${localPath}`);
            fs.chmodSync(localPath, 0o755);
        }
        return localPath;
    }
    
    if (isDev) {
        console.error('[GIFSKI_PATH] gifski не найден ни глобально в PATH, ни локально в vendor/gifski.');
    } else {
        console.error(`[GIFSKI_PATH] gifski не найден в packaged-приложении по пути: ${localPath}`);
    }
    
    return null;
}

// Функция для проверки, доступен ли gifski
function checkGifski() {
    gifskiPath = findGifskiPath();
    if (!gifskiPath) {
        console.error('[GIFSKI_CHECK] gifski не найден. Пожалуйста, установите его или поместите в папку vendor/gifski.');
        return false;
    }
    return true;
}

// Функция-обертка для вызова gifski с логированием
function runGifski(args) {
    if (!gifskiPath) {
        return Promise.reject(new Error('Путь к gifski не был определен.'));
    }

    return new Promise((resolve, reject) => {
        const commandStr = `gifski ${args.join(' ')}`;
        console.log(`[RUN_GIFSKI] Запуск команды: ${gifskiPath} ${args.join(' ')}`);
        
        const command = spawn(gifskiPath, args);
        let stdout = '';
        let stderr = '';

        command.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        command.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        command.on('close', (code) => {
            if (code === 0) {
                console.log(`[RUN_GIFSKI] Команда выполнена успешно.`);
                resolve({ stdout, stderr });
            } else {
                const errorMessage = `gifski завершился с кодом ${code}: ${stderr}`;
                console.error(`[RUN_GIFSKI] Ошибка выполнения команды. ${errorMessage}`);
                reject(new Error(errorMessage));
            }
        });

        command.on('error', (err) => {
            console.error('[RUN_GIFSKI] Не удалось запустить дочерний процесс.', err);
            reject(err);
        });
    });
}

function createWindow() {
    const configPath = path.join(__dirname, 'config.json');
    // Упрощаем конфиг для gifski
    const defaultConfig = { maxKb: 10240, frameDelay: 3, quality: 90 };
    let config = defaultConfig;
    try {
        if (fs.existsSync(configPath)) {
            config = { ...defaultConfig, ...JSON.parse(fs.readFileSync(configPath, 'utf-8')) };
        } else {
            fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 4));
        }
    } catch (error) {
        console.error('Error with config file:', error);
    }

    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        }
    });

    // Load the index.html
    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    // Open DevTools if in development mode
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

// Получение информации о GIF файле (теперь используем fs, т.к. gifski не имеет аналога identify)
async function getGifInfo(filePath) {
    try {
        const stats = fs.statSync(filePath);
        // Для размеров придется использовать стороннюю логику, если это будет нужно.
        // Пока возвращаем только размер файла.
        return {
            success: true,
            size: stats.size,
            dimensions: { width: '?', height: '?' } // gifski не возвращает размеры
        };
    } catch (err) {
        console.error(`Ошибка получения информации о GIF (${filePath}):`, err);
        return { success: false, error: err.message };
    }
}

// Обработчики IPC
ipcMain.handle('choose-directory', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openDirectory']
    });
    
    if (!result.canceled) {
        return { success: true, path: result.filePaths[0] };
    }
    return { success: false, error: 'Директория не выбрана' };
});

// Заменяем проверку ImageMagick на gifski
ipcMain.handle('check-imagemagick', async () => {
    return checkGifski();
});

// Получение списка PNG файлов
async function getPngFiles(directory) {
    try {
        const files = fs.readdirSync(directory);
        const pngFiles = files
            .filter(file => file.toLowerCase().endsWith('.png'))
            .map(file => path.join(directory, file)); // Сразу получаем полные пути
        
        if (pngFiles.length === 0) {
            return { success: false, error: 'PNG файлы не найдены в выбранной директории' };
        }

        // Группировка файлов по имени (без номера)
        const groups = {};
        pngFiles.forEach(filePath => {
            const fileName = path.basename(filePath);
            const baseName = fileName.replace(/_\d+\.png$|\.png$/, '');
            if (!groups[baseName]) {
                groups[baseName] = [];
            }
            groups[baseName].push({
                name: fileName,
                path: filePath
            });
        });

        // Сортировка файлов в каждой группе по числовому индексу
        for (const groupName in groups) {
            groups[groupName].sort((a, b) => {
                const numA = parseInt(a.name.match(/_(\d+)\.png$/)?.[1] || '0');
                const numB = parseInt(b.name.match(/_(\d+)\.png$/)?.[1] || '0');
                return numA - numB;
            });
        }

        return { success: true, groups };
    } catch (error) {
        console.error('Error getting PNG files:', error);
        return { success: false, error: error.message };
    }
}

// Обработчики IPC
ipcMain.handle('get-png-files', async (event, directory) => {
    return await getPngFiles(directory);
});

ipcMain.handle('open-folder', (event, folderPath) => {
    shell.openPath(folderPath);
});

ipcMain.handle('get-config', () => {
    const configPath = path.join(__dirname, 'config.json');
    const defaultConfig = { maxKb: 10240, frameDelay: 3, quality: 90 };
    try {
        if (fs.existsSync(configPath)) {
            return { ...defaultConfig, ...JSON.parse(fs.readFileSync(configPath, 'utf-8')) };
        }
    } catch (error) {
        console.error('Error reading config file for renderer:', error);
    }
    return defaultConfig;
});

// Новая функция конвертации с использованием gifski
async function convertToGif(groupName, pngFilePaths, outputDir, frameDelay, quality) {
    const gifFolder = path.join(outputDir, 'GIF');
    if (!fs.existsSync(gifFolder)) {
        fs.mkdirSync(gifFolder);
    }
    
    const outputPath = path.join(gifFolder, `${groupName}.gif`);
    
    // gifski использует fps, а не задержку. Конвертируем.
    const fps = Math.round(1 / frameDelay);

    const logFilePath = path.join(gifFolder, 'conversion_log.txt');
    const log = (message) => {
        const timestamp = `[${new Date().toISOString()}]`;
        const logMessage = `${timestamp} ${message}\n`;
        // Очищаем лог для новой группы, чтобы избежать путаницы
        if (!fs.existsSync(logFilePath) || fs.readFileSync(logFilePath, 'utf-8').includes(groupName)) {
            fs.appendFileSync(logFilePath, logMessage);
        } else {
            fs.writeFileSync(logFilePath, logMessage);
        }
    };

    log(`Начало конвертации для группы: ${groupName}`);
    log(`Параметры: fps=${fps} (из ${frameDelay}s задержки), quality=${quality}`);

    const args = [
        '--fps', fps.toString(),
        '--quality', quality.toString(),
        '-o', outputPath,
        ...pngFilePaths // передаем отсортированный список путей
    ];

    try {
        const commandString = `gifski ${args.join(' ')}`;
        log(`Выполнение команды: ${commandString}`);

        const { stdout, stderr } = await runGifski(args);
        
        if (stdout) log(`STDOUT:\n${stdout}`);
        if (stderr) log(`STDERR:\n${stderr}`);
        
        const info = await getGifInfo(outputPath);

        log(`Успех: Конвертация завершена. Размер файла = ${(info.size / 1024).toFixed(1)} KB`);
        log('=================================================\n');

        return { ...info, path: outputPath, finalColorCount: 256 }; // gifski всегда использует до 256 цветов
    } catch (err) {
        console.error(`Ошибка при конвертации группы ${groupName}:`, err);
        log(`ОШИБКА: ${err.message}`);
        return { success: false, error: err.message };
    }
}

ipcMain.handle('convert-to-gif', async (event, { groupName, pngFilePaths, outputDir, frameDelay, quality }) => {
    return await convertToGif(groupName, pngFilePaths, outputDir, frameDelay, quality);
});
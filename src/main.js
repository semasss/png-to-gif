const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = require('electron-is-dev');
const { spawn, execSync } = require('child_process');
const { shell } = require('electron');
const { Image } = require('image-js');

// Глобальная обработка ошибок
process.on('uncaughtException', (error) => {
    console.error('[MAIN] Необработанное исключение:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[MAIN] Необработанный rejection:', reason);
});

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
    console.log('[MAIN] Создание главного окна...');
    
    const configPath = path.join(__dirname, 'config.json');
    const defaultConfig = { maxKb: 10240, frameDelay: 3, quality: 90 };
    let config = defaultConfig;
    
    try {
        if (fs.existsSync(configPath)) {
            config = { ...defaultConfig, ...JSON.parse(fs.readFileSync(configPath, 'utf-8')) };
            console.log('[MAIN] Конфигурация загружена:', config);
        } else {
            fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 4));
            console.log('[MAIN] Создан файл конфигурации по умолчанию');
        }
    } catch (error) {
        console.error('[MAIN] Ошибка с файлом конфигурации:', error);
    }

    // Проверяем доступность preload.js
    const preloadPath = path.join(__dirname, 'preload.js');
    if (!fs.existsSync(preloadPath)) {
        console.error('[MAIN] КРИТИЧЕСКАЯ ОШИБКА: preload.js не найден по пути:', preloadPath);
        throw new Error(`preload.js не найден: ${preloadPath}`);
    }
    console.log('[MAIN] preload.js найден:', preloadPath);

    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: preloadPath,
            enableRemoteModule: false,
            webSecurity: true,
            experimentalFeatures: false
        }
    });

    // Обработчики событий окна для диагностики
    mainWindow.webContents.on('did-finish-load', () => {
        console.log('[MAIN] Страница загружена');
        // Отправляем сигнал в renderer что main готов
        mainWindow.webContents.send('main-ready');
    });

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error('[MAIN] Ошибка загрузки страницы:', errorCode, errorDescription);
    });

    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
        console.log(`[RENDERER ${level}] ${message} (${sourceId}:${line})`);
    });

    // Проверяем доступность index.html
    const indexPath = path.join(__dirname, 'index.html');
    if (!fs.existsSync(indexPath)) {
        console.error('[MAIN] КРИТИЧЕСКАЯ ОШИБКА: index.html не найден по пути:', indexPath);
        throw new Error(`index.html не найден: ${indexPath}`);
    }
    console.log('[MAIN] index.html найден:', indexPath);

    // Загружаем страницу
    mainWindow.loadFile(indexPath);

    // Открываем DevTools в режиме разработки
    if (isDev) {
        mainWindow.webContents.openDevTools();
        console.log('[MAIN] DevTools открыты');
    }
    
    console.log('[MAIN] Главное окно создано успешно');
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

// Диагностический ping
ipcMain.handle('ping', async () => {
    console.log('[MAIN] Получен ping от renderer');
    return 'pong';
});

// Улучшенный обработчик choose-directory с дополнительными проверками
ipcMain.handle('choose-directory', async (event) => {
    console.log('[MAIN] Обработка запроса выбора директории');
    
    try {
        // Проверяем доступность dialog
        if (!dialog || typeof dialog.showOpenDialog !== 'function') {
            throw new Error('dialog.showOpenDialog недоступен');
        }
        
        console.log('[MAIN] Открытие диалога выбора папки...');
        
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory'],
            title: 'Выберите папку с PNG файлами',
            buttonLabel: 'Выбрать папку'
        });
        
        console.log('[MAIN] Результат диалога:', result);
        
        if (result.canceled) {
            console.log('[MAIN] Выбор папки отменен пользователем');
            return { success: false, error: 'Выбор отменен' };
        }
        
        if (!result.filePaths || result.filePaths.length === 0) {
            console.warn('[MAIN] Пустой результат выбора папки');
            return { success: false, error: 'Папка не выбрана' };
        }
        
        const selectedPath = result.filePaths[0];
        console.log('[MAIN] Выбрана папка:', selectedPath);
        
        // Проверяем существование и доступность папки
        try {
            const stats = fs.statSync(selectedPath);
            if (!stats.isDirectory()) {
                throw new Error('Выбранный путь не является папкой');
            }
            
            // Проверяем права на чтение
            fs.accessSync(selectedPath, fs.constants.R_OK);
            
            console.log('[MAIN] Папка доступна для чтения');
            return { success: true, path: selectedPath };
            
        } catch (fsError) {
            console.error('[MAIN] Ошибка доступа к папке:', fsError);
            return { 
                success: false, 
                error: `Ошибка доступа к папке: ${fsError.message}` 
            };
        }
        
    } catch (error) {
        console.error('[MAIN] Ошибка в choose-directory:', error);
        return { 
            success: false, 
            error: `Ошибка выбора папки: ${error.message}` 
        };
    }
});

// Заменяем проверку ImageMagick на gifski
ipcMain.handle('check-imagemagick', async () => {
    return checkGifski();
});

// Улучшенная функция получения PNG файлов
async function getPngFiles(directory) {
    console.log('[MAIN] Получение PNG файлов из директории:', directory);
    
    if (!directory || typeof directory !== 'string') {
        const error = 'Неверный путь к директории';
        console.error('[MAIN]', error);
        return { success: false, error };
    }
    
    try {
        // Проверяем существование директории
        if (!fs.existsSync(directory)) {
            throw new Error('Директория не существует');
        }
        
        const stats = fs.statSync(directory);
        if (!stats.isDirectory()) {
            throw new Error('Путь не является директорией');
        }
        
        console.log('[MAIN] Чтение содержимого директории...');
        const files = fs.readdirSync(directory);
        console.log('[MAIN] Найдено файлов:', files.length);
        
        const pngFiles = files
            .filter(file => {
                const ext = file.toLowerCase();
                return ext.endsWith('.png');
            })
            .map(file => path.join(directory, file));
        
        console.log('[MAIN] PNG файлов найдено:', pngFiles.length);
        
        if (pngFiles.length === 0) {
            return { 
                success: false, 
                error: 'PNG файлы не найдены в выбранной директории' 
            };
        }

        // Группировка файлов по имени (без номера)
        const groups = {};
        pngFiles.forEach(filePath => {
            const fileName = path.basename(filePath);
            // Улучшенная регулярка для группировки
            const baseName = fileName.replace(/_\d+\.png$/i, '').replace(/\.png$/i, '');
            
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
                const numA = parseInt(a.name.match(/_([0-9]+)\.png$/i)?.[1] || '0');
                const numB = parseInt(b.name.match(/_([0-9]+)\.png$/i)?.[1] || '0');
                return numA - numB;
            });
        }

        const groupCount = Object.keys(groups).length;
        console.log('[MAIN] Создано групп:', groupCount);

        return { success: true, groups };
        
    } catch (error) {
        console.error('[MAIN] Ошибка получения PNG файлов:', error);
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
async function convertToGif(groupName, pngFilePaths, outputDir, frameDelay, quality, maxKb = 512, colorCount = 256, ditherType = 'floyd') {
    const gifFolder = path.join(outputDir, 'GIF');
    if (!fs.existsSync(gifFolder)) {
        fs.mkdirSync(gifFolder);
    }
    
    const outputPath = path.join(gifFolder, `${groupName}.gif`);
    
    // gifski использует fps, а не задержку. Конвертируем и ограничиваем.
    let fps = Math.round(1 / frameDelay);
    if (fps > 100) {
        console.warn(`[CONVERT] FPS ${fps} is too high, capping at 100.`);
        fps = 100; // gifski has a hard limit of 100 fps
    }

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

    try {
        // Получаем размеры из первого изображения, чтобы передать их gifski
        const firstImage = await Image.load(pngFilePaths[0]);
        const { width, height } = firstImage;
        log(`Исходное разрешение: ${width}x${height}`);

        let currentQuality = quality;
        let attempt = 1;
        let finalInfo = null;
        while (true) {
            log(`Attempt #${attempt} with quality=${currentQuality}`);
            const args = [
                '--fps', fps.toString(),
                '--quality', currentQuality.toString(),
                '--width', width.toString(),
                '--height', height.toString(),
            ];

            // dither handling
            if (ditherType === 'none') {
                args.push('--lossy-quality', '100', '--motion-quality', '100');
            }

            args.push('-o', outputPath);
            args.push(...pngFilePaths);

            const commandString = `gifski ${args.join(' ')}`;
            log(`Выполнение команды: ${commandString}`);

            await runGifski(args);

            const info = await getGifInfo(outputPath);
            finalInfo = info;
            log(`Размер после попытки #${attempt}: ${(info.size / 1024).toFixed(1)} KB`);

            if (info.size / 1024 <= maxKb || currentQuality <= 30) {
                if (info.size / 1024 > maxKb) {
                    log(`Не удалось достичь целевого размера ${maxKb}KB. Останавливаемся на качестве ${currentQuality}.`);
                }
                break;
            }

            currentQuality -= 10;
            attempt++;
        }

        log(`Финальная информация: файл ${(finalInfo.size / 1024).toFixed(1)}KB`);
        log('=================================================\n');

        return { success: true, ...finalInfo, path: outputPath, finalColorCount: 256 };
    } catch (err) {
        console.error(`Ошибка при конвертации группы ${groupName}:`, err);
        log(`ОШИБКА: ${err.message}`);
        return { success: false, error: err.message };
    }
}

ipcMain.handle('convert-to-gif', async (event, { groupName, pngFilePaths, outputDir, frameDelay, quality, maxKb, colorCount, ditherType }) => {
    return await convertToGif(groupName, pngFilePaths, outputDir, frameDelay, quality, maxKb, colorCount, ditherType);
});

// Логирование всех IPC событий
const originalHandle = ipcMain.handle;
ipcMain.handle = function(channel, listener) {
    console.log('[MAIN] Регистрация IPC обработчика:', channel);
    return originalHandle.call(this, channel, async (...args) => {
        console.log(`[MAIN] IPC вызов: ${channel}`, args.slice(1)); // Исключаем event объект
        try {
            const result = await listener(...args);
            console.log(`[MAIN] IPC результат ${channel}:`, result);
            return result;
        } catch (error) {
            console.error(`[MAIN] IPC ошибка ${channel}:`, error);
            throw error;
        }
    });
};

console.log('[MAIN] Диагностические дополнения загружены');
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
    if (isDev) {
        try {
            const systemPath = execSync('which gifski', { encoding: 'utf-8' }).trim();
            if (systemPath && fs.existsSync(systemPath)) {
                console.log(`[GIFSKI_PATH] Режим разработки: используется глобальный gifski из PATH: ${systemPath}`);
                return systemPath;
            }
        } catch (error) {
            console.log('[GIFSKI_PATH] Глобальный gifski не найден, ищем локальную версию...');
        }
    }
    const localPath = isDev ? path.join(__dirname, '..', 'vendor', 'gifski', 'gifski') : path.join(process.resourcesPath, 'gifski');
    if (fs.existsSync(localPath)) {
        console.log(`[GIFSKI_PATH] Используется локальный gifski: ${localPath}`);
        try { fs.accessSync(localPath, fs.constants.X_OK); } catch (err) { fs.chmodSync(localPath, 0o755); }
        return localPath;
    }
    console.error('[GIFSKI_PATH] gifski не найден.');
    return null;
}

// ============== НОВАЯ ФУНКЦИЯ ДЛЯ ПОИСКА GIFSICLE ==============
function findGifsiclePath() {
    // Сначала пробуем найти gifsicle в системном PATH. Это самый частый случай для разработчиков.
     try {
        const systemPath = execSync('which gifsicle', { encoding: 'utf-8' }).trim();
        if (systemPath && fs.existsSync(systemPath)) {
            console.log(`[GIFSICLE_PATH] Используется системный gifsicle из PATH: ${systemPath}`);
            return systemPath;
        }
    } catch (error) {
       // Игнорируем ошибку, если в PATH нет, и ищем локально.
    }
    
    // Если не нашли в PATH, ищем локально в vendor/resources
    const localPath = isDev ? path.join(__dirname, '..', 'vendor', 'gifsicle', 'gifsicle') : path.join(process.resourcesPath, 'gifsicle');
    if (fs.existsSync(localPath)) {
        console.log(`[GIFSICLE_PATH] Используется локальный gifsicle: ${localPath}`);
        try { fs.accessSync(localPath, fs.constants.X_OK); } catch (err) { fs.chmodSync(localPath, 0o755); }
        return localPath;
    }

    console.warn('[GIFSICLE_PATH] Утилита gifsicle не найдена. Оптимизация не будет выполнена. Для установки: brew install gifsicle');
    return null;
}

// ============== НОВАЯ ФУНКЦИЯ ДЛЯ ПОИСКА IMAGEMAGICK ==============
function findMagickPath() {
    if (isDev) {
        const localPath = path.join(__dirname, '..', 'vendor', 'imagemagick', 'magick');
        if (fs.existsSync(localPath)) {
            console.log(`[MAGICK_PATH] Режим разработки: используется локальный magick: ${localPath}`);
            return localPath;
        }
    }
    const resourcePath = path.join(process.resourcesPath, 'magick');
     if (fs.existsSync(resourcePath)) {
        console.log(`[MAGICK_PATH] Используется magick из ресурсов: ${resourcePath}`);
        try { fs.accessSync(resourcePath, fs.constants.X_OK); } catch (err) { fs.chmodSync(resourcePath, 0o755); }
        return resourcePath;
    }
    console.warn('[MAGICK_PATH] ImageMagick не найден. Понижение цветности недоступно.');
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

// Универсальная функция для запуска дочерних процессов
function runCommand(toolName, binaryPath, args) {
    if (!binaryPath) {
        return Promise.reject(new Error(`Путь к ${toolName} не определен.`));
    }

    return new Promise((resolve, reject) => {
        const commandStr = `${path.basename(binaryPath)} ${args.join(' ')}`;
        console.log(`[RUN_COMMAND] Запуск: ${commandStr}`);
        
        const command = spawn(binaryPath, args);
        let stdout = '';
        let stderr = '';

        command.stdout.on('data', (data) => { stdout += data.toString(); });
        command.stderr.on('data', (data) => { stderr += data.toString(); });

        command.on('close', (code) => {
            if (code === 0) {
                resolve({ stdout, stderr });
            } else {
                const errorMessage = `${toolName} завершился с кодом ${code}: ${stderr}`;
                console.error(`[RUN_COMMAND] Ошибка выполнения. ${errorMessage}`);
                reject(new Error(errorMessage));
            }
        });

        command.on('error', (err) => {
            console.error(`[RUN_COMMAND] Не удалось запустить ${toolName}.`, err);
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

// Новая функция для отправки прогресса в рендерер
function sendProgress(groupName, status) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('conversion-progress', { groupName, status });
    }
}

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

// Основная функция конвертации
async function convertToGif(groupName, pngFilePaths, outputDir, frameDelay, quality, maxKb = 500, colorCount = 256, ditherType = 'floyd') {
    const gifFolder = path.join(outputDir, 'GIF');
    if (!fs.existsSync(gifFolder)) {
        fs.mkdirSync(gifFolder);
    }

    const finalOutputPath = path.join(gifFolder, `${groupName}.gif`);
    
    // Функция логирования
    const logFilePath = path.join(gifFolder, 'conversion_log.txt');
    const log = (message) => {
        const timestamp = new Date().toISOString();
        fs.appendFileSync(logFilePath, `[${timestamp}] ${message}\n`);
    };

    log(`--- START CONVERSION: ${groupName} ---`);
    log(`Target size: < ${maxKb} KB, Initial Quality: ${quality}, Initial Colors: ${colorCount}`);

    // Логика дублирования кадров для gifski
    const baseFps = 10;
    let finalFps = baseFps;
    let duplicatedPngPaths = [...pngFilePaths];
    if (frameDelay > (1 / baseFps)) {
        const duplicationFactor = Math.round(frameDelay * baseFps);
        if (duplicationFactor > 1) {
            duplicatedPngPaths = pngFilePaths.flatMap(p => Array(duplicationFactor).fill(p));
            log(`Duplicating frames by factor of ${duplicationFactor} for ${frameDelay}s delay.`);
        }
    } else if (frameDelay > 0) {
        finalFps = Math.round(1 / frameDelay);
        if (finalFps > 100) finalFps = 100;
    }

    const qualityLevels = [90, 80, 70, 60, 50, 40, 30];
    const initialColorLevels = (colorCount === 256) ? [256, 128] : [128];

    for (const currentQuality of qualityLevels) {
        for (const currentColorCount of initialColorLevels) {
            
            sendProgress(groupName, `Качество: ${currentQuality}, Цвета: ${currentColorCount}`);
            log(`[ATTEMPT] Quality: ${currentQuality}, Colors: ${currentColorCount}`);

            const tempDirForPngs = path.join(gifFolder, `temp_pngs_${groupName}`);
            const tempOutputPath = path.join(gifFolder, `${groupName}_temp.gif`);
            let processedPngPaths = duplicatedPngPaths;

            try {
                // --- ШАГ 1: Пре-процессинг цветов с ImageMagick ---
                const magickPath = findMagickPath();
                if (magickPath && currentColorCount < 256) {
                    log(`[PRE-PROCESS] Reducing colors to ${currentColorCount} using ImageMagick...`);
                    if (!fs.existsSync(tempDirForPngs)) fs.mkdirSync(tempDirForPngs);
                    
                    const processedPaths = [];
                    for (let i = 0; i < duplicatedPngPaths.length; i++) {
                        const inputPath = duplicatedPngPaths[i];
                        const outputPath = path.join(tempDirForPngs, `frame_${i}.png`);
                        await runCommand('magick', magickPath, ['convert', inputPath, '+dither', '-colors', currentColorCount.toString(), outputPath]);
                        processedPaths.push(outputPath);
                    }
                    processedPngPaths = processedPaths;
                    log(`[PRE-PROCESS] Color reduction complete.`);
                }

                // --- ШАГ 2: Создание GIF с помощью gifski ---
                const gifskiPath = findGifskiPath();
                const firstImage = await Image.load(pngFilePaths[0]);
                const { width, height } = firstImage;
                
                log(`[CONVERT] Running gifski with quality ${currentQuality}...`);
                await runCommand('gifski', gifskiPath, [
                    '--fps', finalFps.toString(), '--quality', currentQuality.toString(),
                    '--width', width.toString(), '--height', height.toString(),
                    '-o', tempOutputPath, ...processedPngPaths
                ]);

                // --- ШАГ 3: Оптимизация с помощью gifsicle ---
                const gifsiclePath = findGifsiclePath();
                if (gifsiclePath) {
                    log(`[OPTIMIZE] Running gifsicle...`);
                    await runCommand('gifsicle', gifsiclePath, ['-O3', tempOutputPath, '-o', finalOutputPath]);
                } else {
                    fs.renameSync(tempOutputPath, finalOutputPath);
                }

                // --- ШАГ 4: Проверка размера ---
                const finalInfo = await getGifInfo(finalOutputPath);
                log(`[RESULT] Output size: ${(finalInfo.size / 1024).toFixed(1)} KB`);

                if (finalInfo.size / 1024 <= maxKb) {
                    log(`[SUCCESS] Target size met.`);
                    log(`--- END CONVERSION: ${groupName} ---\n`);
                    sendProgress(groupName, `Готово!`);
                    return { success: true, ...finalInfo, path: finalOutputPath, finalColorCount: currentColorCount };
                }

                log(`[RETRY] File too large. Continuing to next optimization step.`);
                if (fs.existsSync(finalOutputPath)) {
                    fs.unlinkSync(finalOutputPath); // Удаляем слишком большой файл перед следующей попыткой
                }

            } catch (err) {
                log(`[ERROR] Failed at Quality: ${currentQuality}, Colors: ${currentColorCount}. Error: ${err.message}`);
                console.error(`Ошибка при конвертации группы ${groupName} с качеством ${currentQuality}:`, err);
                sendProgress(groupName, `Ошибка`);
                log(`--- FAILED CONVERSION: ${groupName} ---\n`);
                return { success: false, error: err.message };
            } finally {
                // --- ШАГ 5: Очистка ---
                if (fs.existsSync(tempDirForPngs)) fs.rmSync(tempDirForPngs, { recursive: true, force: true });
                if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath);
            }
        }
    }

    log(`[FAILURE] Could not meet target size of ${maxKb} KB.`);
    log(`--- FAILED CONVERSION: ${groupName} ---\n`);
    sendProgress(groupName, `Не удалось сжать`);
    return { 
        success: false, 
        error: `Не удалось достичь размера < ${maxKb} КБ. Попробуйте уменьшить разрешение изображений.` 
    };
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
const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = require('electron-is-dev');
const { spawn } = require('child_process');

let mainWindow;

// Функция для получения пути к magick
function getMagickPath() {
    let magickPath;
    
    if (isDev) {
        // В режиме разработки - ищем в vendor
        magickPath = path.join(__dirname, '..', 'vendor', 'imagemagick', 'magick');
    } else {
        // В production - ищем в extraResources
        magickPath = path.join(process.resourcesPath, 'imagemagick', 'magick');
    }

    console.log(`[MAGICK_PATH] Проверяю путь: ${magickPath}. Режим разработки: ${isDev}`);
    
    if (fs.existsSync(magickPath)) {
        console.log(`[MAGICK_PATH] Бинарный файл ImageMagick найден.`);
        
        // Проверяем и устанавливаем права на выполнение
        try {
            fs.accessSync(magickPath, fs.constants.X_OK);
        } catch (err) {
            console.log(`[MAGICK_PATH] Устанавливаю права на выполнение...`);
            fs.chmodSync(magickPath, 0o755);
        }
        
        return magickPath;
    } else {
        console.error(`[MAGICK_PATH] Бинарный файл ImageMagick не найден!`);
        
        // Дополнительная диагностика
        const resourcesPath = isDev ? path.join(__dirname, '..') : process.resourcesPath;
        console.error(`[MAGICK_PATH] Resources path: ${resourcesPath}`);
        
        try {
            const contents = fs.readdirSync(resourcesPath);
            console.error(`[MAGICK_PATH] Contents of resources: ${contents.join(', ')}`);
            
            const imagemagickPath = path.join(resourcesPath, isDev ? 'vendor/imagemagick' : 'imagemagick');
            if (fs.existsSync(imagemagickPath)) {
                const magickContents = fs.readdirSync(imagemagickPath);
                console.error(`[MAGICK_PATH] Contents of imagemagick folder: ${magickContents.join(', ')}`);
            }
        } catch (e) {
            console.error(`[MAGICK_PATH] Error listing directory: ${e.message}`);
        }
        
        return magickPath; 
    }
}

// Функция-обертка для вызова Magick с логированием
function runMagick(args) {
    const magickPath = getMagickPath();

    return new Promise((resolve, reject) => {
        console.log(`[RUN_MAGICK] Запуск команды: ${magickPath} ${args.join(' ')}`);
        
        // Устанавливаем переменные окружения для macOS
        const env = { ...process.env };
        if (process.platform === 'darwin') {
            const libPath = path.dirname(magickPath);
            env.DYLD_LIBRARY_PATH = path.join(libPath, 'libs') + ':' + (env.DYLD_LIBRARY_PATH || '');
            console.log(`[RUN_MAGICK] DYLD_LIBRARY_PATH: ${env.DYLD_LIBRARY_PATH}`);
        }
        
        const command = spawn(magickPath, args, { env });
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
                console.log(`[RUN_MAGICK] Команда выполнена успешно.`);
                resolve(stdout);
            } else {
                const errorMessage = `ImageMagick завершился с кодом ${code}: ${stderr}`;
                console.error(`[RUN_MAGICK] Ошибка выполнения команды. ${errorMessage}`);
                reject(new Error(errorMessage));
            }
        });

        command.on('error', (err) => {
            console.error('[RUN_MAGICK] Не удалось запустить дочерний процесс.', err);
            reject(err);
        });
    });
}

// Функция для проверки, доступен ли ImageMagick
function checkImageMagick() {
    console.log('[IMAGEMAGICK_CHECK] Запускаю проверку ImageMagick...');
    return runMagick(['--version'])
        .then(stdout => {
            console.log(`[IMAGEMAGICK_CHECK] Проверка успешна! Версия: ${stdout.trim()}`);
            return true;
        })
        .catch(err => {
            console.error('[IMAGEMAGICK_CHECK] Проверка провалена!', err);
            return false;
        });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
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

// Получение информации о GIF файле
async function getGifInfo(filePath) {
    try {
        // Формат: ширина высота размер_в_байтах
        const format = "%w %h %b";
        const stdout = await runMagick(['identify', '-format', format, filePath]);
        const parts = stdout.trim().replace('B', '').split(' ');
        
        if (parts.length < 3) throw new Error('Неверный вывод от ImageMagick');

        return {
            success: true,
            size: parseInt(parts[2], 10),
            dimensions: {
                width: parseInt(parts[0], 10),
                height: parseInt(parts[1], 10)
            }
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

ipcMain.handle('check-imagemagick', async () => {
    return await checkImageMagick();
});

ipcMain.handle('get-gif-info', async (event, { filePath, ditherType }) => {
    const info = await getGifInfo(filePath);
    info.ditherType = ditherType;
    return info;
});

// Получение списка PNG файлов
async function getPngFiles(directory) {
    try {
        const files = fs.readdirSync(directory);
        const pngFiles = files.filter(file => file.toLowerCase().endsWith('.png'));
        
        if (pngFiles.length === 0) {
            return { success: false, error: 'PNG файлы не найдены в выбранной директории' };
        }

        // Группировка файлов по имени (без номера)
        const groups = {};
        pngFiles.forEach(file => {
            const baseName = file.replace(/\d+\.png$/, '');
            if (!groups[baseName]) {
                groups[baseName] = [];
            }
            groups[baseName].push({
                name: file,
                path: path.join(directory, file)
            });
        });

        // Сортировка файлов в каждой группе
        for (const group in groups) {
            groups[group].sort((a, b) => {
                const numA = parseInt(a.name.match(/\d+/)?.[0] || '0');
                const numB = parseInt(b.name.match(/\d+/)?.[0] || '0');
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

// Convert multiple PNGs to GIF using ImageMagick
async function convertToGif(groupName, pngFilePaths, outputDir, maxKB, frameDelay, colorCount, ditherType) {
    const outputPath = path.join(outputDir, `${groupName}.gif`);
    const frameDelayTicks = Math.round(frameDelay / 10); // convert ms to ticks (1/100s)

    const args = [
        'convert',
        '-delay', frameDelayTicks.toString(),
        '-loop', '0',
        ...pngFilePaths,
    ];

    // Настройки палитры и дизеринга
    args.push('-layers', 'Optimize');
    args.push('+map');
    if (ditherType !== 'none') {
        args.push('-dither', ditherType);
    }
    args.push('-colors', colorCount.toString());
    
    args.push(outputPath);

    await runMagick(args);

    // Проверяем размер файла и изменяем, если нужно
    const stats = fs.statSync(outputPath);
    const sizeInKB = stats.size / 1024;

    if (sizeInKB > maxKB) {
        console.log(`[RESIZE] GIF слишком большой (${sizeInKB.toFixed(2)}KB > ${maxKB}KB). Изменяю размер...`);
        const scale = Math.floor(Math.sqrt(maxKB / sizeInKB) * 100);
        const resizeArgs = [
            'convert',
            outputPath,
            '-resize', `${scale}%`,
            outputPath
        ];
        await runMagick(resizeArgs);
    }
    
    const finalInfo = await getGifInfo(outputPath);
    return {
        success: true,
        path: outputPath,
        ditherType: ditherType,
        ...finalInfo
    };
}

ipcMain.handle('convert-to-gif', async (event, { groupName, pngFilePaths, outputDir, maxKB, frameDelay, colorCount, ditherType }) => {
    try {
        const result = await convertToGif(groupName, pngFilePaths, outputDir, maxKB, frameDelay, colorCount, ditherType);
        return result;
    } catch (error) {
        return { success: false, error: error.message };
    }
});

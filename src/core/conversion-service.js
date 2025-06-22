const path = require('path');
const fs = require('fs');
const { spawn, execSync } = require('child_process');
const { app } = require('electron');
const isDev = require('electron-is-dev');
const { Image } = require('image-js');

// ================================================================================
// ОСНОВНЫЕ ФУНКЦИИ СЕРВИСА
// ================================================================================

/**
 * Находит путь к исполняемому файлу инструмента (gifski, gifsicle).
 * Проверяет несколько возможных имен.
 * @param {string|string[]} toolNames - Имя или массив имен инструмента.
 * @returns {string|null} Путь к файлу или null, если не найден.
 */
function getToolPath(toolNames) {
    if (!Array.isArray(toolNames)) {
        toolNames = [toolNames];
    }

    for (const toolName of toolNames) {
        if (isDev) {
            try {
                const systemPath = execSync(`which ${toolName}`, { encoding: 'utf-8' }).trim();
                if (systemPath && fs.existsSync(systemPath)) {
                    console.log(`[${toolName.toUpperCase()}_PATH] Используется системный ${toolName} из PATH: ${systemPath}`);
                    return systemPath;
                }
            } catch (error) {
                // Игнорируем ошибку, если в PATH нет, ищем локально
            }
        }

        const localPath = isDev 
            ? path.join(app.getAppPath(), 'vendor', toolName, toolName)
            : path.join(process.resourcesPath, toolName);

        if (fs.existsSync(localPath)) {
            console.log(`[${toolName.toUpperCase()}_PATH] Используется локальный ${toolName}: ${localPath}`);
            try {
                fs.accessSync(localPath, fs.constants.X_OK);
            } catch (err) {
                console.log(`[${toolName.toUpperCase()}_PATH] Устанавливаю права на выполнение...`);
                fs.chmodSync(localPath, 0o755);
            }
            return localPath;
        }
    }
    
    console.warn(`[TOOL_PATH] Инструменты не найдены: ${toolNames.join(', ')}`);
    return null;
}

/**
 * Запускает дочерний процесс.
 * @param {string} toolName - Имя инструмента для логов.
 * @param {string} binaryPath - Путь к исполняемому файлу.
 * @param {string[]} args - Аргументы для команды.
 * @returns {Promise<{stdout: string, stderr: string}>}
 */
function runCommand(toolName, binaryPath, args) {
    return new Promise((resolve, reject) => {
        console.log(`[RUN_COMMAND] Запуск: ${toolName} ${args.join(' ')}`);
        
        const command = spawn(binaryPath, args);
        let stdout = '';
        let stderr = '';

        command.stdout.on('data', (data) => stdout += data.toString());
        command.stderr.on('data', (data) => stderr += data.toString());

        command.on('close', (code) => {
            if (code === 0) {
                resolve({ stdout, stderr });
            } else {
                const errorMessage = `${toolName} завершился с кодом ${code}: ${stderr}`;
                reject(new Error(errorMessage));
            }
        });
        command.on('error', (err) => reject(err));
    });
}

/**
 * Проверяет доступность gifski и gifsicle/giflossy.
 * @returns {Promise<boolean>}
 */
async function checkTools() {
    const gifskiPath = getToolPath('gifski');
    const optimizerPath = getToolPath(['giflossy', 'gifsicle']);
    
    return !!gifskiPath && !!optimizerPath;
}

/**
 * Получает информацию о GIF-файле.
 * @param {string} filePath - Путь к GIF-файлу.
 * @returns {Promise<object>} Объект с информацией о файле.
 */
async function getGifInfo(filePath) {
    try {
        const stats = fs.statSync(filePath);
        // Получение размеров GIF без тяжелых библиотек - сложная задача.
        // ImageMagick это делал, но мы от него отказались.
        return {
            success: true,
            size: stats.size,
            dimensions: { width: 'N/A', height: 'N/A' }
        };
    } catch (err) {
        console.error(`Ошибка получения информации о GIF (${filePath}):`, err);
        return { success: false, error: err.message };
    }
}

/**
 * Находит и группирует PNG-файлы в директории.
 * @param {string} directory - Путь к директории.
 * @returns {object} Результат с группами файлов или ошибкой.
 */
function getPngFiles(directory) {
    try {
        const files = fs.readdirSync(directory);
        const imageExtensions = ['.png'];
        const imageFiles = files.filter(file => {
            const lowerCaseFile = file.toLowerCase();
            return imageExtensions.some(ext => lowerCaseFile.endsWith(ext));
        });
        
        if (imageFiles.length === 0) {
            return { success: false, error: 'PNG-изображения не найдены в выбранной директории' };
        }

        const groups = {};
        imageFiles.forEach(file => {
            const baseName = file.replace(/[\d_]+\.png$/i, '').replace(/\.png$/i, '');
            if (!groups[baseName]) groups[baseName] = [];
            groups[baseName].push({ name: file, path: path.join(directory, file) });
        });

        for (const group in groups) {
            groups[group].sort((a, b) => {
                const numA = parseInt(a.name.match(/\d+/)?.[0] || '0');
                const numB = parseInt(b.name.match(/\d+/)?.[0] || '0');
                return numA - numB;
            });
        }

        return { success: true, groups };
    } catch (error) {
        console.error('Error getting image files:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Выполняет бинарный поиск по массиву дискретных значений.
 * @param {number[]} values - Отсортированный массив значений для поиска.
 * @param {(value: number) => Promise<boolean>} testFn - Асинхронная функция, возвращающая true, если значение подходит.
 * @param {boolean} findHighest - true для поиска максимального подходящего значения, false для минимального.
 * @returns {Promise<number|null>} Найденное значение или null.
 */
async function binarySearchDiscrete(values, testFn, findHighest = true) {
    let low = 0;
    let high = values.length - 1;
    let bestVal = null;
    const sortedValues = [...values].sort((a, b) => a - b);

    while (low <= high) {
        const midIndex = Math.floor((low + high) / 2);
        const midValue = sortedValues[midIndex];
        
        const isSuccess = await testFn(midValue);

        if (isSuccess) {
            bestVal = midValue;
            if (findHighest) {
                low = midIndex + 1; // Ищем большее значение
            } else {
                high = midIndex - 1; // Ищем меньшее значение
            }
        } else {
            if (findHighest) {
                high = midIndex - 1;
            } else {
                low = midIndex + 1;
            }
        }
    }
    return bestVal;
}

/**
 * Конвертирует последовательность PNG в GIF с использованием умной стратегии.
 * @param {string} groupName - Имя группы (для выходного файла).
 * @param {{name: string, path: string}[]} pngFilePaths - Массив объектов файлов изображений.
 * @param {string} outputDir - Директория для сохранения GIF.
 * @param {object} settings - Настройки конвертации { frameDelay, maxKb }.
 * @returns {Promise<object>} Результат конвертации.
 */
async function convertToGif(groupName, pngFilePaths, outputDir, settings) {
    const { frameDelay = 3, maxKb = 500 } = settings;
    const maxBytes = maxKb * 1024;
    const finalOutputPath = path.join(outputDir, `${groupName}.gif`);
    const log = (message) => console.log(`[${groupName}] ${message}`);

    const cleanupFiles = (...files) => {
        files.forEach(file => {
            if (file && fs.existsSync(file)) fs.unlinkSync(file);
        });
    };

    try {
        log('Шаг 1/5: Нормализация размеров кадров...');
        const imagePaths = pngFilePaths.map(f => f.path);
        const baseImage = await Image.load(imagePaths[0]);
        const { width, height } = baseImage;

        for (let i = 1; i < imagePaths.length; i++) {
            const img = await Image.load(imagePaths[i]);
            if (img.width !== width || img.height !== height) {
                log(`  - Коррекция размера кадра ${path.basename(imagePaths[i])}: ${img.width}x${img.height} -> ${width}x${height}`);
                const resizedImg = img.resize({ width, height });
                await resizedImg.save(imagePaths[i]);
            }
        }

        const targetBpp = maxBytes / (width * height * imagePaths.length);
        log(`Целевой "бюджет": ${targetBpp.toFixed(3)} байт/пиксель.`);
        if (targetBpp < 0.05) {
            log('[ПРЕДУПРЕЖДЕНИЕ] Бюджет крайне мал. Может потребоваться значительное сжатие или уменьшение разрешения.');
        }

        const gifskiPath = getToolPath('gifski');
        const optimizerPath = getToolPath(['giflossy', 'gifsicle']);

        if (!gifskiPath || !optimizerPath) {
            throw new Error('Ключевые утилиты (gifski, gifsicle/giflossy) не найдены.');
        }

        log('Шаг 2/5: Создание "золотого" GIF (качество 100%)...');
        const rawGifPath = path.join(outputDir, `${groupName}_raw.gif`);
        await runCommand('gifski', gifskiPath, [
            '--fps', '60',
            '--quality', '100',
            '--width', width,
            '--height', height,
            '-o', rawGifPath,
            ...imagePaths
        ]);

        const gifsicleDelay = Math.max(2, Math.round(frameDelay * 100));
        let optimizedPath = path.join(outputDir, `${groupName}_optimized.gif`);
        
        const testSize = async (filePath) => {
            const stats = fs.statSync(filePath);
            const isOk = stats.size <= maxBytes;
            log(`  -> ${isOk ? '✔' : '✖'} ${(stats.size / 1024).toFixed(0)} KB / ${maxKb} KB`);
            return isOk;
        };
        
        // --- Фаза A: Бинарный поиск по палитре ---
        log('Шаг 3/5: Поиск оптимальной палитры (gifsicle --colors)...');
        const colorLevels = [32, 48, 64, 96, 128, 256];
        let bestColors = await binarySearchDiscrete(colorLevels, async (numColors) => {
            log(`  - Пробуем colors=${numColors}...`);
            await runCommand('gifsicle', optimizerPath, ['-O3', '--dither', '--colors', numColors, rawGifPath, '--output', optimizedPath]);
            return await testSize(optimizedPath);
        }, true);

        if (bestColors) {
            await runCommand('gifsicle', optimizerPath, ['-O3', '--dither', '--colors', bestColors, '--delay', gifsicleDelay, rawGifPath, '--output', finalOutputPath]);
            if (await testSize(finalOutputPath)) {
                log('Успех! Уложились в лимит размером палитры.');
                cleanupFiles(rawGifPath, optimizedPath);
                const finalStats = fs.statSync(finalOutputPath);
                return { success: true, path: finalOutputPath, groupName, size: finalStats.size, dimensions: { width, height }, quality: `colors=${bestColors}` };
            }
        }
        
        // --- Фаза B: Бинарный поиск по потерям ---
        log('Шаг 4/5: Поиск оптимального сжатия с потерями (gifsicle --lossy)...');
        const lossyLevels = Array.from({length: 18}, (_, i) => 20 + i * 10); // [20, 30... 190, 200]
        const colorsArg = bestColors ? ['--colors', bestColors] : [];

        let bestLossy = await binarySearchDiscrete(lossyLevels, async (lossy) => {
            log(`  - Пробуем lossy=${lossy}...`);
            await runCommand('gifsicle', optimizerPath, ['-O3', '--dither', ...colorsArg, `--lossy=${lossy}`, rawGifPath, '--output', optimizedPath]);
            return await testSize(optimizedPath);
        }, false); // Ищем минимальное подходящее значение

        if (bestLossy) {
            await runCommand('gifsicle', optimizerPath, ['-O3', '--dither', ...colorsArg, `--lossy=${bestLossy}`, '--delay', gifsicleDelay, rawGifPath, '--output', finalOutputPath]);
             if (await testSize(finalOutputPath)) {
                log('Успех! Уложились в лимит с lossy-сжатием.');
                cleanupFiles(rawGifPath, optimizedPath);
                const finalStats = fs.statSync(finalOutputPath);
                return { success: true, path: finalOutputPath, groupName, size: finalStats.size, dimensions: { width, height }, quality: `colors=${bestColors||256}, lossy=${bestLossy}` };
            }
        }
        
        // --- Фаза C: Масштабирование как крайняя мера ---
        log('Шаг 5/5: Не удалось уложиться. Пробуем уменьшить разрешение...');
        const currentStats = fs.statSync(bestLossy ? finalOutputPath : rawGifPath);
        const scaleFactor = Math.sqrt(maxBytes / currentStats.size);

        if (scaleFactor < 0.95) {
            const newWidth = Math.floor(width * scaleFactor);
            log(`  - Уменьшаем до ${newWidth}px по ширине (k=${scaleFactor.toFixed(2)})...`);
            const finalArgs = [
                '-O3',
                '--dither',
                ...colorsArg,
                bestLossy ? `--lossy=${bestLossy}` : '',
                '--delay', gifsicleDelay,
                '--scale', `${scaleFactor.toFixed(3)}`,
                rawGifPath,
                '--output', finalOutputPath
            ].filter(Boolean);

            await runCommand('gifsicle', optimizerPath, finalArgs);

            if (await testSize(finalOutputPath)) {
                 log('Успех! Уложились в лимит после уменьшения разрешения.');
                cleanupFiles(rawGifPath, optimizedPath);
                const finalStats = fs.statSync(finalOutputPath);
                return { success: true, path: finalOutputPath, groupName, size: finalStats.size, dimensions: { width: newWidth, height: Math.floor(height*scaleFactor) }, quality: `scaled` };
            }
        }

        cleanupFiles(rawGifPath, optimizedPath, finalOutputPath);
        throw new Error(`Не удалось сжать файл до ${maxKb} KB даже с максимальными настройками.`);

    } catch (error) {
        log(`[КРИТИЧЕСКАЯ ОШИБКА] ${error.message}`);
        cleanupFiles(
            path.join(outputDir, `${groupName}_raw.gif`),
            path.join(outputDir, `${groupName}_optimized.gif`),
            finalOutputPath
        );
        return { success: false, error: error.message, groupName };
    }
}

module.exports = {
    checkTools,
    getGifInfo,
    getPngFiles,
    convertToGif
};
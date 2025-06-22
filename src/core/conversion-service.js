const path = require('path');
const fs = require('fs');
const { spawn, execSync } = require('child_process');
const { app } = require('electron');
const isDev = require('electron-is-dev');
const { Image } = require('image-js');

// ВАЖНО: Укажите ваш API-ключ здесь. Его можно получить на https://tinypng.com/developers
const TINYPNG_API_KEY = 'YOUR_API_KEY_HERE';

/**
 * Принудительно сжимает массив изображений с помощью tiny-compressor.
 * @param {string[]} filePaths - Массив путей к файлам.
 * @param {(message: string) => void} log - Функция для логирования.
 */
async function compressImages(filePaths, log) {
    if (TINYPNG_API_KEY === 'YOUR_API_KEY_HERE' || !TINYPNG_API_KEY) {
        log('[ПРЕДУПРЕЖДЕНИЕ] API-ключ для tiny-compressor не установлен. Сжатие пропущено.');
        return;
    }

    log(`[СЖАТИЕ] Начало принудительного сжатия ${filePaths.length} исходных файлов...`);
    try {
        const { default: tiny } = await import('tiny-compressor');
        tiny.key = TINYPNG_API_KEY;

        const compressionPromises = filePaths.map(async (filePath) => {
            try {
                const source = tiny.fromFile(filePath);
                await source.toFile(filePath); // Перезаписываем исходный файл
                log(`  - Успешно сжат: ${path.basename(filePath)}`);
            } catch (compressError) {
                log(`  - Ошибка сжатия файла ${path.basename(filePath)}: ${compressError.message}`);
            }
        });

        await Promise.all(compressionPromises);
        log(`[СЖАТИЕ] Сжатие исходных файлов завершено.`);
    } catch (e) {
        log(`[ОШИБКА] Критическая ошибка во время инициализации tiny-compressor: ${e.message}`);
    }
}

/**
 * Находит путь к исполняемому файлу инструмента (gifski, gifsicle).
 * @param {string} toolName - Имя инструмента.
 * @returns {string|null} Путь к файлу или null, если не найден.
 */
function getToolPath(toolName) {
    if (isDev) {
        try {
            const systemPath = execSync(`which ${toolName}`, { encoding: 'utf-8' }).trim();
            if (systemPath && fs.existsSync(systemPath)) {
                console.log(`[${toolName.toUpperCase()}_PATH] Используется системный ${toolName} из PATH: ${systemPath}`);
                return systemPath;
            }
        } catch (error) {
            console.log(`[${toolName.toUpperCase()}_PATH] Системный ${toolName} не найден, ищем локальный...`);
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

    console.warn(`[${toolName.toUpperCase()}_PATH] ${toolName} не найден.`);
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
 * Проверяет доступность gifski.
 * @returns {Promise<boolean>}
 */
async function checkTools() {
    const gifskiPath = getToolPath('gifski');
    if (!gifskiPath) return false;

    // Опционально проверяем gifsicle
    getToolPath('gifsicle');

    return true;
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
        const imageExtensions = ['.png', '.jpg', '.jpeg'];
        const imageFiles = files.filter(file => {
            const lowerCaseFile = file.toLowerCase();
            return imageExtensions.some(ext => lowerCaseFile.endsWith(ext));
        });
        
        if (imageFiles.length === 0) {
            return { success: false, error: 'Изображения (png, jpg, jpeg) не найдены в выбранной директории' };
        }

        const groups = {};
        imageFiles.forEach(file => {
            const baseName = file.replace(/[\d_]+\.(png|jpg|jpeg)$/i, '').replace(/\.(png|jpg|jpeg)$/i, '');
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
 * Конвертирует последовательность PNG в GIF.
 * @param {string} groupName - Имя группы (для выходного файла).
 * @param {string[]} files - Массив путей к PNG-файлам.
 * @param {string} sourceDir - Исходная директория для сохранения GIF.
 * @param {object} settings - Настройки конвертации { frameDelay, maxKb }.
 * @returns {Promise<object>} Результат конвертации.
 */
async function convertToGif(groupName, files, sourceDir, settings) {
    const { frameDelay = 3, maxKb = 500, sessionOutputDir } = settings;

    const outputDir = sessionOutputDir;

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const finalOutputPath = path.join(outputDir, `${groupName}.gif`);
    const logMessages = [];
    
    const log = (message) => {
        console.log(message);
        logMessages.push(message);
    };

    log(`============================================================`);
    log(`* Начало конвертации для группы: ${groupName}`);
    log(`============================================================`);
    log(`- Исходные файлы: ${files.length} шт.`);
    log(`- Настройки:`);
    log(`  - Задержка между кадрами: ${frameDelay}s`);
    log(`  - Максимальный размер файла: ${maxKb} KB`);
    log(`- Папка для сохранения: ${outputDir}`);
    log(`------------------------------------------------------------`);

    // --- Принудительное сжатие всех исходных файлов ---
    await compressImages(files.map(file => file.path), log);
    // ---------------------------------------------------

    // --- Новый блок: Пре-процессинг JPEG в PNG ---
    const tempPngDir = path.join(outputDir, `temp_pngs_${groupName}`);
    let processedFilePaths = [];
    let cleanupTempDir = false;

    try {
        const hasJpeg = files.some(file => file.path.toLowerCase().endsWith('.jpg') || file.path.toLowerCase().endsWith('.jpeg'));

        if (hasJpeg) {
            log('[ПРЕ-ПРОЦЕССИНГ] Обнаружены JPEG файлы. Начинаю конвертацию в временные PNG...');
            cleanupTempDir = true;
            if (!fs.existsSync(tempPngDir)) {
                fs.mkdirSync(tempPngDir, { recursive: true });
            }

            processedFilePaths = await Promise.all(files.map(async (file, index) => {
                const isJpeg = file.path.toLowerCase().endsWith('.jpg') || file.path.toLowerCase().endsWith('.jpeg');
                if (isJpeg) {
                    const image = await Image.load(file.path);
                    const newPath = path.join(tempPngDir, `${index}.png`);
                    await image.save(newPath);
                    log(`  - Конвертирован ${path.basename(file.path)} -> ${path.basename(newPath)}`);
                    return newPath;
                }
                return file.path;
            }));
            log('[ПРЕ-ПРОЦЕССИНГ] Конвертация в PNG завершена.');
        } else {
            processedFilePaths = files.map(file => file.path);
        }

        const gifskiPath = getToolPath('gifski');
        const gifsiclePath = getToolPath('gifsicle');

        if (!gifskiPath || !gifsiclePath) {
            const missing = [!gifskiPath && 'gifski', !gifsiclePath && 'gifsicle'].filter(Boolean).join(', ');
            const errorMsg = `Критически важные утилиты не найдены: ${missing}.`;
            log(`[ОШИБКА] ${errorMsg}`);
            return { success: false, error: errorMsg, groupName, logMessages, outputDir: outputDir };
        }

        const firstImage = await Image.load(processedFilePaths[0]);
        const { width, height } = firstImage;
        log(`- Разрешение изображений: ${width}x${height}`);
        
        const gifsicleDelay = Math.max(2, Math.round(frameDelay * 100));
        log(`- Задержка для gifsicle: ${gifsicleDelay} (в сотых долях секунды)`);

        const qualityLevels = [100, 95, 90, 85, 80];
        const lossyQualityLevels = [100, 95, 90, 85, 80, 75, 70];
        const colorLevels = [256, 192, 128, 64];
        
        log(`\n--- Начало перебора параметров ---`);
        log(`- Уровни качества (gifski --quality): ${qualityLevels.join(', ')}`);
        log(`- Уровни сжатия с потерями (gifski --lossy-quality): ${lossyQualityLevels.join(', ')}`);
        log(`- Количество цветов (gifsicle --colors): ${colorLevels.join(', ')}`);
        log(`------------------------------------\n`);

        let finalResult = null;

        main_loop:
        for (const quality of qualityLevels) {
            for (const lossy of lossyQualityLevels) {
                const gifskiTempOutput = path.join(outputDir, `${groupName}_temp_gifski.gif`);
            
                const gifskiArgs = [
                    '--fps', '60',
                    '--quality', quality,
                    '--lossy-quality', lossy,
                    '--width', width,
                    '--height', height,
                    '-o', gifskiTempOutput,
                    ...processedFilePaths
                ];

                try {
                    log(`[ПОПЫТКА] gifski | качество: ${quality}, сжатие: ${lossy}`);
                    await runCommand('gifski', gifskiPath, gifskiArgs);

                    log(`  [ИНФО] gifski завершен. Начинаю оптимизацию с gifsicle...`);
                    for (const colors of colorLevels) {
                        log(`    [ПОПЫТКА] gifsicle | цвета: ${colors}`);
                        const gifsicleTempOutput = path.join(outputDir, `${groupName}_temp_gifsicle.gif`);

                        try {
                            const gifsicleArgs = [
                                '--optimize=3',
                                `--colors=${colors}`,
                                '--delay', gifsicleDelay,
                                '--loop',
                                gifskiTempOutput,
                                '-o', gifsicleTempOutput
                            ];
                            
                            await runCommand('gifsicle', gifsiclePath, gifsicleArgs);
                            
                            const stats = fs.statSync(gifsicleTempOutput);
                            const sizeKb = stats.size / 1024;
                            log(`      [РЕЗУЛЬТАТ] Успешно. Размер: ${sizeKb.toFixed(2)} KB (лимит: ${maxKb} KB)`);
                            
                            if (sizeKb <= maxKb) {
                                log(`\n[УСПЕХ] Найден подходящий размер!`);
                                log(`- Итоговые параметры: качество=${quality}, сжатие=${lossy}, цвета=${colors}`);
                                log(`- Итоговый файл: ${finalOutputPath}`);
                                fs.renameSync(gifsicleTempOutput, finalOutputPath);
                                
                                finalResult = {
                                    success: true,
                                    path: finalOutputPath,
                                    size: stats.size,
                                    groupName,
                                    logMessages,
                                    outputDir: outputDir
                                };
                                break main_loop;
                            }
                        } catch (err) {
                            log(`    [ОШИБКА] gifsicle не удался: ${err.message.split('\n')[0]}`);
                        } finally {
                            if (fs.existsSync(gifsicleTempOutput)) {
                                // fs.unlinkSync(gifsicleTempOutput);
                            }
                        }
                    }
                } catch (err) {
                    log(`[ОШИБКА] gifski не удался: ${err.message.split('\n')[0]}`);
                } finally {
                    if (fs.existsSync(gifskiTempOutput)) {
                        fs.unlinkSync(gifskiTempOutput);
                    }
                }
            }
        }

        if (finalResult) {
            log(`\n--- Конвертация для группы ${groupName} успешно завершена ---\n`);
            return finalResult;
        }
        
        log(`\n[НЕУДАЧА] Не удалось создать GIF размером меньше ${maxKb} KB для группы ${groupName}\n`);
        return { success: false, error: `Не удалось сжать GIF до ${maxKb} KB`, groupName, logMessages, outputDir: outputDir };

    } catch (error) {
        console.error(`Критическая ошибка в convertToGif для группы ${groupName}:`, error);
        logMessages.push(`\n[КРИТИЧЕСКАЯ ОШИБКА] ${error.message}`);
        return { success: false, error: error.message, groupName, logMessages, outputDir: outputDir };
    } finally {
        if (cleanupTempDir && fs.existsSync(tempPngDir)) {
            log(`[ОЧИСТКА] Удаление временной директории: ${tempPngDir}`);
            fs.rmSync(tempPngDir, { recursive: true, force: true });
        }
    }
}

module.exports = {
    checkTools,
    getGifInfo,
    getPngFiles,
    convertToGif
}; 
const path = require('path');
const fs = require('fs');
const { spawn, execSync } = require('child_process');
const { app } = require('electron');
const isDev = require('electron-is-dev');
const { Image } = require('image-js');

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
 * @param {string[]} pngFilePaths - Массив путей к PNG-файлам.
 * @param {string} sourceDir - Исходная директория для сохранения GIF.
 * @param {object} settings - Настройки конвертации { frameDelay, maxKb }.
 * @returns {Promise<object>} Результат конвертации.
 */
async function convertToGif(groupName, pngFilePaths, sourceDir, settings) {
    const { frameDelay = 3, maxKb = 500 } = settings;

    const outputDir = path.join(sourceDir, 'gif_conversions');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const finalOutputPath = path.join(outputDir, `${groupName}.gif`);
    const logMessages = [];
    
    const log = (message) => {
        console.log(message);
        logMessages.push(`[${new Date().toISOString()}] ${message}`);
    };

    log(`--- Начало конвертации для группы: ${groupName} ---`);
    log(`Исходные файлы: ${pngFilePaths.length} шт.`);
    log(`Настройки: задержка ${frameDelay}s, макс. размер ${maxKb} KB`);
    log(`Общая папка вывода: ${outputDir}`);

    // --- Новый блок: Пре-процессинг JPEG в PNG ---
    const tempPngDir = path.join(outputDir, `temp_pngs_${groupName}`);
    let processedFilePaths = pngFilePaths;
    let cleanupTempDir = false;

    try {
        const hasJpeg = pngFilePaths.some(p => p.toLowerCase().endsWith('.jpg') || p.toLowerCase().endsWith('.jpeg'));

        if (hasJpeg) {
            log('[ПРЕ-ПРОЦЕССИНГ] Обнаружены JPEG файлы. Начинаю конвертацию в временные PNG...');
            cleanupTempDir = true;
            if (!fs.existsSync(tempPngDir)) {
                fs.mkdirSync(tempPngDir, { recursive: true });
            }

            processedFilePaths = await Promise.all(pngFilePaths.map(async (filePath, index) => {
                const isJpeg = filePath.toLowerCase().endsWith('.jpg') || filePath.toLowerCase().endsWith('.jpeg');
                if (isJpeg) {
                    const image = await Image.load(filePath);
                    const newPath = path.join(tempPngDir, `${index}.png`);
                    await image.save(newPath);
                    log(`  - Конвертирован ${path.basename(filePath)} -> ${path.basename(newPath)}`);
                    return newPath;
                }
                return filePath;
            }));
            log('[ПРЕ-ПРОЦЕССИНГ] Конвертация в PNG завершена.');
        }

        const gifskiPath = getToolPath('gifski');
        const gifsiclePath = getToolPath('gifsicle');

        if (!gifskiPath || !gifsiclePath) {
            const missing = [!gifskiPath && 'gifski', !gifsiclePath && 'gifsicle'].filter(Boolean).join(', ');
            const errorMsg = `Критически важные утилиты не найдены: ${missing}.`;
            log(`[ОШИБКА] ${errorMsg}`);
            return { success: false, error: errorMsg, groupName, logMessages };
        }

        const firstImage = await Image.load(processedFilePaths[0]);
        const { width, height } = firstImage;
        log(`Разрешение изображений: ${width}x${height}`);
        
        const gifsicleDelay = Math.max(2, Math.round(frameDelay * 100));
        log(`Задержка для gifsicle: ${gifsicleDelay} (в сотых долях секунды)`);

        const qualityLevels = [100, 95, 90, 85, 80, 75, 70, 65, 60, 50, 40, 30];
        log(`Уровни качества для перебора: ${qualityLevels.join(', ')}`);

        for (const quality of qualityLevels) {
            const gifskiTempOutput = path.join(outputDir, `${groupName}_temp_gifski.gif`);
            
            const gifskiArgs = [
                '--fps', '60',
                '--quality', quality,
                '--width', width,
                '--height', height,
                '-o', gifskiTempOutput,
                ...processedFilePaths
            ];

            try {
                log(`[ПОПЫТКА] Качество: ${quality}. Запуск gifski...`);
                await runCommand('gifski', gifskiPath, gifskiArgs);

                log(`[ПОПЫТКА] Запуск gifsicle для оптимизации и установки задержки...`);
                const gifsicleArgs = [
                    '--delay', gifsicleDelay,
                    '-O3',
                    '--output', finalOutputPath,
                    gifskiTempOutput,
                ];
                await runCommand('gifsicle', gifsiclePath, gifsicleArgs);

                fs.unlinkSync(gifskiTempOutput);
                
                const stats = fs.statSync(finalOutputPath);
                const finalSizeKb = (stats.size / 1024).toFixed(1);
                log(`[РЕЗУЛЬТАТ] Качество: ${quality}, Задержка: ${frameDelay}s, Размер: ${finalSizeKb} KB`);

                if (stats.size <= maxKb * 1024) {
                    log(`[УСПЕХ] Файл в пределах лимита (${maxKb} KB). Конвертация завершена.`);
                    return { 
                        success: true, 
                        path: finalOutputPath, 
                        groupName,
                        size: stats.size,
                        dimensions: { width, height },
                        quality: quality,
                        outputDir: outputDir,
                        logMessages: logMessages
                    };
                } else {
                     log(`[ИНФО] Файл слишком большой (${finalSizeKb} KB), пробую качество ниже.`);
                     fs.unlinkSync(finalOutputPath);
                }

            } catch (error) {
                log(`[ОШИБКА] Ошибка на шаге с качеством ${quality}: ${error.message}`);
                if (fs.existsSync(gifskiTempOutput)) fs.unlinkSync(gifskiTempOutput);
                if (fs.existsSync(finalOutputPath)) fs.unlinkSync(finalOutputPath);
            }
        }

        const finalErrorMsg = `Не удалось сжать файл ${groupName} до ${maxKb} KB после всех попыток.`;
        log(`[ПРОВАЛ] ${finalErrorMsg}`);
        return { success: false, error: finalErrorMsg, groupName, logMessages };

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
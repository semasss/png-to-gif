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
        const pngFiles = files.filter(file => file.toLowerCase().endsWith('.png'));
        
        if (pngFiles.length === 0) {
            return { success: false, error: 'PNG файлы не найдены в выбранной директории' };
        }

        const groups = {};
        pngFiles.forEach(file => {
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
        console.error('Error getting PNG files:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Конвертирует последовательность PNG в GIF.
 * @param {string} groupName - Имя группы (для выходного файла).
 * @param {string[]} pngFilePaths - Массив путей к PNG-файлам.
 * @param {string} outputDir - Директория для сохранения GIF.
 * @param {object} settings - Настройки конвертации { frameDelay, maxKb }.
 * @returns {Promise<object>} Результат конвертации.
 */
async function convertToGif(groupName, pngFilePaths, outputDir, settings) {
    // Деструктуризация настроек с значениями по умолчанию.
    // frameDelay: задержка между кадрами в секундах.
    // maxKb: максимальный желаемый размер файла в килобайтах.
    const { frameDelay = 3, maxKb = 500 } = settings;
    // Формируем полный путь для итогового GIF-файла.
    const finalOutputPath = path.join(outputDir, `${groupName}.gif`);

    // Получаем пути к необходимым утилитам.
    // Это позволяет абстрагироваться от их точного местоположения в системе.
    const gifskiPath = getToolPath('gifski');
    const gifsiclePath = getToolPath('gifsicle');

    // Проверяем, что обе утилиты доступны. Без них конвертация невозможна.
    if (!gifskiPath || !gifsiclePath) {
        const missing = [!gifskiPath && 'gifski', !gifsiclePath && 'gifsicle'].filter(Boolean).join(', ');
        return { success: false, error: `Критически важные утилиты не найдены: ${missing}.`, groupName };
    }

    // Загружаем первое изображение, чтобы определить размеры (ширину и высоту) для всего GIF.
    // Это гарантирует, что все кадры будут иметь одинаковый размер.
    const firstImage = await Image.load(pngFilePaths[0]);
    const { width, height } = firstImage;
    
    // Конвертируем задержку из секунд в сотые доли секунды, как того требует gifsicle.
    // Например, 3 секунды становятся 300. Минимальное значение - 2.
    const gifsicleDelay = Math.max(2, Math.round(frameDelay * 100));
    
    // Определяем массив уровней качества для итеративной попытки сжатия.
    // Начинаем с наилучшего качества (100) и постепенно его снижаем,
    // чтобы найти оптимальное соотношение качества и размера файла.
    const qualityLevels = [100, 95, 90, 85, 80, 75, 70, 65, 60, 50, 40, 30];

    // Цикл по уровням качества. Основная логика для достижения нужного размера файла.
    for (const quality of qualityLevels) {
        // Создаем временный файл для промежуточного результата от gifski.
        // Это нужно, чтобы передать его на обработку в gifsicle.
        const gifskiTempOutput = path.join(outputDir, `${groupName}_temp_gifski.gif`);
        
        // Аргументы для вызова gifski.
        // gifski используется для создания высококачественного GIF из набора PNG-кадров.
        const gifskiArgs = [
            '--fps', '60', // Используем высокий FPS для плавной сборки кадров. Реальная скорость анимации будет задана в gifsicle.
            '--quality', quality, // Текущий уровень качества из цикла.
            '--width', width, // Ширина из первого изображения.
            '--height', height, // Высота из первого изображения.
            '-o', gifskiTempOutput, // Путь к временному выходному файлу.
            ...pngFilePaths // Все пути к PNG-файлам.
        ];

        try {
            // Этап 1: Создание GIF с помощью gifski.
            // На этом этапе мы получаем GIF с заданным качеством, но без правильной задержки анимации.
            console.log(`[GIFSKI] Этап 1: Сборка кадров с качеством ${quality}...`);
            await runCommand('gifski', gifskiPath, gifskiArgs);

            // Этап 2: Оптимизация и установка задержки с помощью gifsicle.
            // gifsicle берет созданный gifski файл и применяет к нему нужную задержку и дополнительное сжатие.
            console.log(`[GIFSICLE] Этап 2: Установка задержки (${frameDelay}s) и оптимизация...`);
            const gifsicleArgs = [
                '--delay', gifsicleDelay, // Устанавливаем правильную задержку между кадрами.
                '-O3', // Максимальный уровень оптимизации.
                '--output', finalOutputPath, // Итоговый файл.
                gifskiTempOutput, // Входной файл (результат работы gifski).
            ];
            await runCommand('gifsicle', gifsiclePath, gifsicleArgs);

            // После успешной обработки в gifsicle временный файл от gifski больше не нужен.
            fs.unlinkSync(gifskiTempOutput);
            
            // Получаем статистику по созданному файлу, в первую очередь нас интересует его размер.
            const stats = fs.statSync(finalOutputPath);
            console.log(`[RESULT] Качество: ${quality}, Задержка: ${frameDelay}s, Размер: ${(stats.size / 1024).toFixed(1)} KB`);

            // Проверяем, укладывается ли размер файла в заданный лимит.
            if (stats.size <= maxKb * 1024) {
                // Если да, то мы достигли цели. Возвращаем успешный результат.
                console.log(`[SUCCESS] Успех! Файл в пределах лимита.`);
                return { 
                    success: true, 
                    path: finalOutputPath, 
                    groupName,
                    size: stats.size,
                    dimensions: { width, height },
                    quality: quality
                };
            } else {
                 // Если файл все еще слишком большой, сообщаем об этом, удаляем его
                 // и переходим к следующей итерации цикла с более низким качеством.
                 console.log(`[INFO] Файл слишком большой (${(stats.size / 1024).toFixed(1)} KB), пробую качество ниже.`);
                 fs.unlinkSync(finalOutputPath);
            }

        } catch (error) {
            // Обработка ошибок, которые могли произойти во время вызова gifski или gifsicle.
            console.error(`Ошибка конвертации для группы ${groupName} с качеством ${quality}:`, error);
            // Подчищаем временные файлы, если они остались после сбоя.
            if (fs.existsSync(gifskiTempOutput)) fs.unlinkSync(gifskiTempOutput);
            if (fs.existsSync(finalOutputPath)) fs.unlinkSync(finalOutputPath);
        }
    }

    // Если цикл завершился, а подходящий файл так и не был создан,
    // значит, нам не удалось сжать GIF до нужного размера даже с самым низким качеством.
    console.error(`[FAILURE] Не удалось сжать файл ${groupName} до ${maxKb} KB`);
    return { success: false, error: `Не удалось сжать файл до ${maxKb} KB`, groupName };
}

module.exports = {
    checkTools,
    getGifInfo,
    getPngFiles,
    convertToGif
}; 
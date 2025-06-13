// Альтернативная реализация convertToGif используя sharp вместо ImageMagick
// Этот код можно использовать вместо ImageMagick для более простой интеграции

const sharp = require('sharp');
const GIFEncoder = require('gif-encoder-2');
const fs = require('fs');
const path = require('path');

async function convertToGifWithSharp(groupName, pngFilePaths, outputDir, maxKB, frameDelay, colorCount, ditherType) {
    const outputPath = path.join(outputDir, `${groupName}.gif`);
    
    try {
        // Получаем размеры первого изображения
        const firstImage = await sharp(pngFilePaths[0]).metadata();
        const { width, height } = firstImage;
        
        // Создаём GIF encoder
        const encoder = new GIFEncoder(width, height);
        encoder.createReadStream().pipe(fs.createWriteStream(outputPath));
        
        encoder.start();
        encoder.setRepeat(0); // 0 = бесконечный цикл
        encoder.setDelay(frameDelay);
        encoder.setQuality(10); // Качество (чем меньше, тем лучше)
        
        // Обрабатываем каждый PNG
        for (const pngPath of pngFilePaths) {
            console.log(`Processing: ${path.basename(pngPath)}`);
            
            // Читаем изображение
            let image = sharp(pngPath);
            
            // Изменяем размер если нужно
            const metadata = await image.metadata();
            if (metadata.width !== width || metadata.height !== height) {
                image = image.resize(width, height, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } });
            }
            
            // Уменьшаем количество цветов если указано
            if (colorCount < 256) {
                // Sharp не поддерживает прямое уменьшение цветов, но можно использовать квантизацию через буфер
                const buffer = await image.raw().toBuffer();
                // Здесь можно добавить алгоритм квантизации если нужно
                encoder.addFrame(buffer);
            } else {
                const buffer = await image.raw().toBuffer();
                encoder.addFrame(buffer);
            }
        }
        
        encoder.finish();
        
        // Проверяем размер файла
        await new Promise(resolve => setTimeout(resolve, 100)); // Ждём пока файл запишется
        
        const stats = fs.statSync(outputPath);
        const sizeInKB = stats.size / 1024;
        
        if (sizeInKB > maxKB) {
            console.log(`GIF слишком большой (${sizeInKB.toFixed(2)}KB > ${maxKB}KB). Нужно уменьшить...`);
            
            // Вычисляем новый размер
            const scale = Math.sqrt(maxKB / sizeInKB);
            const newWidth = Math.floor(width * scale);
            const newHeight = Math.floor(height * scale);
            
            // Пересоздаём GIF с меньшим размером
            const tempPath = outputPath + '.tmp';
            const smallerEncoder = new GIFEncoder(newWidth, newHeight);
            smallerEncoder.createReadStream().pipe(fs.createWriteStream(tempPath));
            
            smallerEncoder.start();
            smallerEncoder.setRepeat(0);
            smallerEncoder.setDelay(frameDelay);
            smallerEncoder.setQuality(10);
            
            for (const pngPath of pngFilePaths) {
                const buffer = await sharp(pngPath)
                    .resize(newWidth, newHeight, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                    .raw()
                    .toBuffer();
                smallerEncoder.addFrame(buffer);
            }
            
            smallerEncoder.finish();
            
            // Заменяем исходный файл
            await new Promise(resolve => setTimeout(resolve, 100));
            fs.renameSync(tempPath, outputPath);
        }
        
        // Получаем финальную информацию
        const finalStats = fs.statSync(outputPath);
        const finalImage = await sharp(outputPath).metadata();
        
        return {
            success: true,
            path: outputPath,
            size: finalStats.size,
            dimensions: {
                width: finalImage.width || newWidth || width,
                height: finalImage.height || newHeight || height
            },
            ditherType: ditherType
        };
        
    } catch (error) {
        console.error('Error converting to GIF with sharp:', error);
        return { success: false, error: error.message };
    }
}

// Пример использования в main.js:
/*
ipcMain.handle('convert-to-gif', async (event, { groupName, pngFilePaths, outputDir, maxKB, frameDelay, colorCount, ditherType }) => {
    try {
        // Можно выбрать метод в зависимости от доступности ImageMagick
        const useImageMagick = await checkImageMagick();
        
        if (useImageMagick) {
            return await convertToGif(groupName, pngFilePaths, outputDir, maxKB, frameDelay, colorCount, ditherType);
        } else {
            console.log('ImageMagick not available, using sharp instead');
            return await convertToGifWithSharp(groupName, pngFilePaths, outputDir, maxKB, frameDelay, colorCount, ditherType);
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
});
*/ 
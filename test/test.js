// Тестовый скрипт для проверки работы библиотек
const { Image } = require('image-js');
const GIF = require('gif.js');
const fs = require('fs');
const path = require('path');

console.log('Тестирование библиотек...');

async function testLibraries() {
  try {
    console.log('Проверка доступа к зависимостям:');
    console.log('- image-js:', !!Image);
    console.log('- gif.js:', !!GIF);
    
    console.log('\nВсе библиотеки доступны!');
    
    // Создадим пустое изображение для теста
    const width = 100;
    const height = 100;
    const testImage = new Image(width, height);
    
    // Заполним его красным цветом
    for (let i = 0; i < width; i++) {
      for (let j = 0; j < height; j++) {
        testImage.setPixelXY(i, j, [255, 0, 0, 255]);
      }
    }
    
    console.log('\nТестовое изображение создано успешно!');
    console.log('Размер:', testImage.width, 'x', testImage.height);
    
    // Попробуем сохранить его как PNG
    const testPngPath = path.join(__dirname, 'test.png');
    await testImage.save(testPngPath);
    
    console.log('\nPNG файл сохранен:', testPngPath);
    console.log('Размер файла:', Math.round(fs.statSync(testPngPath).size / 1024), 'КБ');
    
    // Создадим GIF
    const gif = new GIF({
      workers: 2,
      quality: 10,
      width: testImage.width,
      height: testImage.height
    });
    
    gif.addFrame(testImage.getRGBAData(), { delay: 200 });
    
    const gifBuffer = await new Promise((resolve, reject) => {
      gif.on('finished', (blob) => {
        resolve(blob);
      });
      
      gif.on('error', (err) => {
        reject(err);
      });
      
      gif.render();
    });
    
    const testGifPath = path.join(__dirname, 'test.gif');
    fs.writeFileSync(testGifPath, gifBuffer);
    
    console.log('\nGIF файл сохранен:', testGifPath);
    console.log('Размер файла:', Math.round(fs.statSync(testGifPath).size / 1024), 'КБ');
    
    console.log('\nТестирование завершено успешно!');
  } catch (error) {
    console.error('Ошибка при тестировании:', error);
  }
}

testLibraries();
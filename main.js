const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = require('electron-is-dev');
const { Image } = require('image-js');
const GIFEncoder = require('gif-encoder-2');
const sharp = require('sharp');

let mainWindow;

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
    const stats = fs.statSync(filePath);
    const image = await sharp(filePath);
    const metadata = await image.metadata();
    
    return {
      success: true,
      size: stats.size,
      dimensions: {
        width: metadata.width,
        height: metadata.height
      }
    };
  } catch (error) {
    console.error('Error getting GIF info:', error);
    return { success: false, error: error.message };
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

// Convert multiple PNGs to GIF
async function convertToGif(groupName, pngFilePaths, outputDir, maxKB, frameDelay, colorCount, ditherType) {
  try {
    const firstImage = await sharp(pngFilePaths[0]);
    const metadata = await firstImage.metadata();
    const { width, height } = metadata;

    // Определяем тип дизеринга
    const dither = ditherType !== 'none';

    const encoder = new GIFEncoder(width, height);
    encoder.start();
    encoder.setRepeat(0);
    encoder.setDelay(frameDelay);
    encoder.setQuality(10);

    for (const pngPath of pngFilePaths) {
      let image_pipeline = sharp(pngPath);
      if(dither) {
        image_pipeline = image_pipeline.png({
          palette: true,
          colours: colorCount,
          dither: 1.0,
        })
      }
      const { data } = await image_pipeline.raw().toBuffer({ resolveWithObject: true });
      encoder.addFrame(data);
    }

    encoder.finish();
    const buffer = encoder.out.getData();
    let finalBuffer = buffer;
    let finalWidth = width;
    let finalHeight = height;

    if (buffer.length > maxKB * 1024) {
      const scale = Math.sqrt((maxKB * 1024) / buffer.length);
      const newWidth = Math.round(width * scale);
      const newHeight = Math.round(height * scale);
      finalWidth = newWidth;
      finalHeight = newHeight;

      const resizedEncoder = new GIFEncoder(newWidth, newHeight);
      resizedEncoder.start();
      resizedEncoder.setRepeat(0);
      resizedEncoder.setDelay(frameDelay);
      resizedEncoder.setQuality(10);

      for (const pngPath of pngFilePaths) {
        let image_pipeline = sharp(pngPath).resize(newWidth, newHeight);

        if(dither) {
          image_pipeline = image_pipeline.png({
            palette: true,
            colours: colorCount,
            dither: 1.0,
          })
        }

        const image = await image_pipeline
          .raw()
          .toBuffer({ resolveWithObject: true });
        resizedEncoder.addFrame(image.data);
      }

      resizedEncoder.finish();
      finalBuffer = resizedEncoder.out.getData();
    }

    const outputPath = path.join(outputDir, `${groupName}.gif`);
    fs.writeFileSync(outputPath, finalBuffer);
    return { 
      success: true, 
      path: outputPath,
      ditherType,
      size: finalBuffer.length,
      dimensions: {
        width: finalWidth,
        height: finalHeight
      }
    };
  } catch (error) {
    console.error('Error converting to GIF:', error);
    return { success: false, error: error.message };
  }
}

ipcMain.handle('convert-to-gif', async (event, { groupName, pngFilePaths, outputDir, maxKB, frameDelay, colorCount, ditherType }) => {
  return await convertToGif(groupName, pngFilePaths, outputDir, maxKB, frameDelay, colorCount, ditherType);
});
const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = require('electron-is-dev');
const im = require('imagemagick');
const { exec } = require('child_process');

let mainWindow;

// Функция для проверки, доступен ли ImageMagick
function checkImageMagick() {
  return new Promise((resolve) => {
    exec('magick --version', (error) => {
      if (error) {
        // Попробуем старую команду 'convert'
        exec('convert --version', (error2) => {
          if (error2) {
            resolve(false);
          } else {
            // 'convert' работает, используем его
            im.command = 'convert';
            resolve(true);
          }
        });
      } else {
        resolve(true);
      }
    });
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
  return new Promise((resolve) => {
    im.identify(filePath, (err, features) => {
      if (err) {
        console.error('Error getting GIF info:', err);
        resolve({ success: false, error: err.message });
        return;
      }
      resolve({
        success: true,
        size: features.filesize ? parseInt(features.filesize) : fs.statSync(filePath).size,
        dimensions: {
          width: features.width,
          height: features.height
        }
      });
    });
  });
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
  return new Promise((resolve, reject) => {
    const outputPath = path.join(outputDir, `${groupName}.gif`);
    const frameDelayTicks = Math.round(frameDelay / 10); // convert ms to ticks (1/100s)

    const args = [
      '-delay', frameDelayTicks,
      '-loop', '0',
      ...pngFilePaths,
    ];

    // Настройки палитры и дизеринга
    args.push('-layers', 'Optimize');
    args.push('+map');
    if (ditherType !== 'none') {
      args.push('-dither', ditherType);
    }
    args.push('-colors', colorCount);
    
    args.push(outputPath);

    im.convert(args, async (err) => {
      if (err) {
        console.error('Error converting to GIF:', err);
        return reject({ success: false, error: err.message });
      }

      // Проверяем размер файла и изменяем, если нужно
      const stats = fs.statSync(outputPath);
      const sizeInKB = stats.size / 1024;

      if (sizeInKB > maxKB) {
        const scale = Math.floor(Math.sqrt(maxKB / sizeInKB) * 100);
        const resizeArgs = [
          outputPath,
          '-resize', `${scale}%`,
          outputPath
        ];
        im.convert(resizeArgs, async (resizeErr) => {
          if (resizeErr) {
            console.error('Error resizing GIF:', resizeErr);
            return reject({ success: false, error: resizeErr.message });
          }
          const finalInfo = await getGifInfo(outputPath);
          resolve({
            success: true,
            path: outputPath,
            ditherType: ditherType,
            ...finalInfo
          });
        });
      } else {
        const finalInfo = await getGifInfo(outputPath);
        resolve({
          success: true,
          path: outputPath,
          ditherType: ditherType,
          ...finalInfo
        });
      }
    });
  });
}

ipcMain.handle('convert-to-gif', async (event, { groupName, pngFilePaths, outputDir, maxKB, frameDelay, colorCount, ditherType }) => {
  try {
    const result = await convertToGif(groupName, pngFilePaths, outputDir, maxKB, frameDelay, colorCount, ditherType);
    return result;
  } catch (error) {
    return error;
  }
});
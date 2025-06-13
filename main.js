const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = require('electron-is-dev');
const { Image } = require('image-js');
const GifEncoder = require('gifencoder');

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

// Choose directory dialog
ipcMain.handle('choose-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  
  if (!result.canceled) {
    return result.filePaths[0];
  }
  return null;
});

// Get PNG files from directory
ipcMain.handle('get-png-files', async (event, directoryPath) => {
  try {
    const files = fs.readdirSync(directoryPath);
    const pngFiles = files.filter(file => 
      file.toLowerCase().endsWith('.png')
    ).map(file => ({
      name: file,
      path: path.join(directoryPath, file)
    }));
    
    return pngFiles;
  } catch (error) {
    console.error('Error reading directory:', error);
    return [];
  }
});

// Convert PNG to GIF
ipcMain.handle('convert-to-gif', async (event, { pngFilePath, outputDir, maxKB }) => {
  try {
    const fileName = path.basename(pngFilePath, '.png');
    const outputPath = path.join(outputDir, `${fileName}.gif`);
    
    // Read the PNG file
    const image = await Image.load(pngFilePath);
    
    // Create a gif encoder
    const encoder = new GifEncoder(image.width, image.height);
    const writeStream = fs.createWriteStream(outputPath);
    
    // Pipe encoder to file
    encoder.createReadStream().pipe(writeStream);
    
    // Configure encoder
    encoder.start();
    encoder.setRepeat(0);  // 0 = repeat forever
    encoder.setDelay(200); // 200ms delay
    encoder.setQuality(10); // Quality setting (10 is best)
    
    // Add frame to GIF - convert RGBA data to format GifEncoder understands
    const pixelData = image.getRGBAData();
    encoder.addFrame(pixelData);
    
    // Finish encoding
    encoder.finish();
    
    // Wait for write to complete
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });
    
    // Check file size and optimize if needed
    const stats = fs.statSync(outputPath);
    const fileSizeInKB = stats.size / 1024;
    
    if (fileSizeInKB > maxKB) {
      // If file is too large, we might need to resize the image
      const scaleFactor = Math.sqrt(maxKB / fileSizeInKB);
      const newWidth = Math.floor(image.width * scaleFactor);
      const newHeight = Math.floor(image.height * scaleFactor);
      
      // Resize the image
      const resizedImage = image.resize({width: newWidth, height: newHeight});
      
      // Create a new gif with the resized image
      const newEncoder = new GifEncoder(newWidth, newHeight);
      const newWriteStream = fs.createWriteStream(outputPath);
      
      // Pipe encoder to file
      newEncoder.createReadStream().pipe(newWriteStream);
      
      // Configure encoder
      newEncoder.start();
      newEncoder.setRepeat(0);  // 0 = repeat forever
      newEncoder.setDelay(200); // 200ms delay
      newEncoder.setQuality(10); // Quality setting (10 is best)
      
      // Add frame to GIF
      newEncoder.addFrame(resizedImage.getRGBAData());
      
      // Finish encoding
      newEncoder.finish();
      
      // Wait for write to complete
      await new Promise((resolve, reject) => {
        newWriteStream.on('finish', resolve);
        newWriteStream.on('error', reject);
      });
    }
    
    const finalStats = fs.statSync(outputPath);
    const finalFileSizeInKB = finalStats.size / 1024;
    
    return {
      success: true,
      outputPath,
      originalSize: finalFileSizeInKB
    };
  } catch (error) {
    console.error('Error converting file:', error);
    return {
      success: false,
      error: error.message
    };
  }
});
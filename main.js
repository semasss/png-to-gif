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

// Group PNG files by their prefix
function groupPngFiles(files) {
  const groups = {};
  
  files.forEach(file => {
    const match = file.name.match(/^(.+)_\d+\.png$/);
    if (match) {
      const prefix = match[1];
      if (!groups[prefix]) {
        groups[prefix] = [];
      }
      groups[prefix].push(file);
    }
  });
  
  // Sort files within each group by their number
  Object.keys(groups).forEach(prefix => {
    groups[prefix].sort((a, b) => {
      const numA = parseInt(a.name.match(/_(\d+)\.png$/)[1]);
      const numB = parseInt(b.name.match(/_(\d+)\.png$/)[1]);
      return numA - numB;
    });
  });
  
  return groups;
}

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
    
    // Group the files
    const groupedFiles = groupPngFiles(pngFiles);
    
    return {
      allFiles: pngFiles,
      groupedFiles: groupedFiles
    };
  } catch (error) {
    console.error('Error reading directory:', error);
    return {
      allFiles: [],
      groupedFiles: {}
    };
  }
});

// Convert multiple PNGs to GIF
ipcMain.handle('convert-to-gif', async (event, { pngFilePaths, outputDir, maxKB, frameDelay }) => {
  try {
    if (!pngFilePaths || pngFilePaths.length === 0) {
      throw new Error('No PNG files provided');
    }

    // Use the first file's name (without number) as the output name
    const firstFileName = path.basename(pngFilePaths[0], '.png');
    const outputName = firstFileName.replace(/_\d+$/, '');
    const outputPath = path.join(outputDir, `${outputName}.gif`);
    
    // Read all PNG files
    const images = await Promise.all(
      pngFilePaths.map(filePath => Image.load(filePath))
    );
    
    // Get dimensions from first image
    const { width, height } = images[0];
    
    // Create a gif encoder
    const encoder = new GifEncoder(width, height);
    const writeStream = fs.createWriteStream(outputPath);
    
    // Pipe encoder to file
    encoder.createReadStream().pipe(writeStream);
    
    // Configure encoder
    encoder.start();
    encoder.setRepeat(0);  // 0 = repeat forever
    encoder.setDelay(frameDelay || 200); // Use provided delay or default to 200ms
    encoder.setQuality(10); // Quality setting (10 is best)
    
    // Add all frames to GIF
    for (const image of images) {
      const pixelData = image.getRGBAData();
      encoder.addFrame(pixelData);
    }
    
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
      // If file is too large, we might need to resize the images
      const scaleFactor = Math.sqrt(maxKB / fileSizeInKB);
      const newWidth = Math.floor(width * scaleFactor);
      const newHeight = Math.floor(height * scaleFactor);
      
      // Create a new gif with the resized images
      const newEncoder = new GifEncoder(newWidth, newHeight);
      const newWriteStream = fs.createWriteStream(outputPath);
      
      // Pipe encoder to file
      newEncoder.createReadStream().pipe(newWriteStream);
      
      // Configure encoder
      newEncoder.start();
      newEncoder.setRepeat(0);
      newEncoder.setDelay(frameDelay || 200);
      newEncoder.setQuality(10);
      
      // Add all resized frames to GIF
      for (const image of images) {
        const resizedImage = image.resize({width: newWidth, height: newHeight});
        newEncoder.addFrame(resizedImage.getRGBAData());
      }
      
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
    console.error('Error converting files:', error);
    return {
      success: false,
      error: error.message
    };
  }
});
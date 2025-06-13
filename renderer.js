// const { ipcRenderer } = require('electron');

let selectedDirectory = null;
let pngFiles = [];
let groupedFiles = {};

// DOM Elements
const directoryDisplay = document.getElementById('directory-display');
const chooseDirectoryBtn = document.getElementById('choose-directory');
const convertButton = document.getElementById('convert-button');
const maxKBInput = document.getElementById('max-kb');
const frameDelayInput = document.getElementById('frame-delay');
const fileList = document.getElementById('file-list');
const filesContainer = document.getElementById('files-container');
const progressContainer = document.getElementById('progress-container');
const progressBar = document.getElementById('progress');
const progressText = document.getElementById('progress-text');
const statusDiv = document.getElementById('status');

// Event Listeners
chooseDirectoryBtn.addEventListener('click', async () => {
  selectedDirectory = await window.electronAPI.chooseDirectory();
  if (selectedDirectory) {
    directoryDisplay.value = selectedDirectory;
    await loadPngFiles();
  }
});

convertButton.addEventListener('click', async () => {
  if (!selectedDirectory) return;
  
  const maxMB = parseInt(maxKBInput.value);
  const maxKB = maxMB * 1024; // Конвертируем МБ в КБ
  const frameDelaySeconds = parseFloat(frameDelayInput.value);
  const frameDelay = Math.round(frameDelaySeconds * 1000); // Конвертируем секунды в миллисекунды
  
  if (isNaN(maxMB) || maxMB < 1) {
    showStatus('Пожалуйста, введите корректный размер файла (минимум 1 МБ)', 'error');
    return;
  }
  
  if (isNaN(frameDelaySeconds) || frameDelaySeconds < 0.1) {
    showStatus('Пожалуйста, введите корректную задержку между кадрами (минимум 0.1 сек)', 'error');
    return;
  }
  
  convertButton.disabled = true;
  progressContainer.style.display = 'block';
  progressBar.style.width = '0%';
  
  let totalGroups = Object.keys(groupedFiles).length;
  let completedGroups = 0;
  
  for (const [groupName, files] of Object.entries(groupedFiles)) {
    try {
      const result = await window.electronAPI.convertToGif({
        pngFilePaths: files.map(f => f.path),
        outputDir: selectedDirectory,
        maxKB,
        frameDelay
      });
      
      if (result.success) {
        completedGroups++;
        updateProgress(completedGroups, totalGroups);
      } else {
        showStatus(`Ошибка при конвертации группы ${groupName}: ${result.error}`, 'error');
      }
    } catch (error) {
      showStatus(`Ошибка при конвертации группы ${groupName}: ${error.message}`, 'error');
    }
  }
  
  if (completedGroups === totalGroups) {
    showStatus(`Успешно сконвертировано ${completedGroups} групп файлов!`, 'success');
  }
  
  convertButton.disabled = false;
});

async function loadPngFiles() {
  try {
    const result = await window.electronAPI.getPngFiles(selectedDirectory);
    pngFiles = result.allFiles;
    groupedFiles = result.groupedFiles;
    
    if (pngFiles.length === 0) {
      showStatus('PNG файлы не найдены в выбранной директории', 'error');
      fileList.style.display = 'none';
      convertButton.disabled = true;
      return;
    }
    
    displayFiles();
    convertButton.disabled = false;
  } catch (error) {
    showStatus(`Ошибка при загрузке файлов: ${error.message}`, 'error');
  }
}

function displayFiles() {
  filesContainer.innerHTML = '';
  fileList.style.display = 'block';
  
  for (const [groupName, files] of Object.entries(groupedFiles)) {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'file-group';
    groupDiv.innerHTML = `
      <h4>Группа: ${groupName}</h4>
      <div class="file-items">
        ${files.map(file => `<div class="file-item">${file.name}</div>`).join('')}
      </div>
    `;
    filesContainer.appendChild(groupDiv);
  }
}

function updateProgress(current, total) {
  const percentage = (current / total) * 100;
  progressBar.style.width = `${percentage}%`;
  progressText.textContent = `${current}/${total} групп сконвертировано`;
}

function showStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.style.display = 'block';
}
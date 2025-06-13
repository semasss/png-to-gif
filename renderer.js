// const { ipcRenderer } = require('electron');

let selectedDirectory = null;
let pngFiles = [];
let groupedFiles = {};
let conversionResults = [];
let ditherType = 'none';

// DOM Elements
const directoryDisplay = document.getElementById('directory-display');
const chooseDirectoryBtn = document.getElementById('choose-directory');
const convertButton = document.getElementById('convert-button');
const resetSettingsBtn = document.getElementById('reset-settings');
const maxKBInput = document.getElementById('max-kb');
const frameDelayInput = document.getElementById('frame-delay');
const colorCountSelect = document.getElementById('color-count');
const fileList = document.getElementById('file-list');
const filesContainer = document.getElementById('files-container');
const progressContainer = document.getElementById('progress-container');
const progressBar = document.getElementById('progress');
const progressText = document.getElementById('progress-text');
const statusDiv = document.getElementById('status');
const mainPage = document.getElementById('main-page');
const resultsPage = document.getElementById('results-page');
const backButton = document.getElementById('back-button');
const resultsGrid = document.getElementById('results-grid');
const infoButton = document.getElementById('info-button');
const infoModal = document.getElementById('info-modal');
const modalClose = document.querySelector('.modal-close');
const asciiLogo = document.getElementById('ascii-logo');
const ditherRadios = document.querySelectorAll('input[name="dither"]');

// Загрузка ASCII логотипа
fetch('logo.txt')
  .then(response => response.text())
  .then(text => {
    asciiLogo.textContent = text;
  })
  .catch(error => console.error('Error loading logo:', error));

// Обработчики событий для модального окна
infoButton.addEventListener('click', () => {
  infoModal.classList.add('active');
});

modalClose.addEventListener('click', () => {
  infoModal.classList.remove('active');
});

infoModal.addEventListener('click', (e) => {
  if (e.target === infoModal) {
    infoModal.classList.remove('active');
  }
});

// Обработчик сброса настроек
resetSettingsBtn.addEventListener('click', () => {
  maxKBInput.value = '10';
  frameDelayInput.value = '0.1';
  colorCountSelect.value = '256';
});

// Обработчик кнопки "Назад"
backButton.addEventListener('click', () => {
  mainPage.classList.add('active');
  resultsPage.classList.remove('active');
});

// Выбор директории
chooseDirectoryBtn.addEventListener('click', async () => {
  const result = await window.electronAPI.chooseDirectory();
  if (result && result.success) {
    selectedDirectory = result.path;
    directoryDisplay.textContent = selectedDirectory;
    
    try {
      // Получаем список PNG файлов
      const files = await window.electronAPI.getPngFiles(selectedDirectory);
      if (files && files.success) {
        groupedFiles = files.groups;
        displayFiles(groupedFiles);
        convertButton.disabled = false;
      } else {
        showStatus('Ошибка при получении списка файлов: ' + (files?.error || 'Неизвестная ошибка'), 'error');
      }
    } catch (error) {
      showStatus('Ошибка при получении списка файлов: ' + error.message, 'error');
    }
  } else {
    showStatus('Директория не выбрана', 'error');
  }
});

// Отображение файлов
function displayFiles(groups) {
  fileList.innerHTML = '';
  filesContainer.style.display = 'block';
  
  for (const [groupName, files] of Object.entries(groups)) {
    const groupItem = document.createElement('li');
    groupItem.textContent = `${groupName} (${files.length} файлов)`;
    fileList.appendChild(groupItem);
  }
}

// Конвертация в GIF
convertButton.addEventListener('click', async () => {
  if (!selectedDirectory) return;
  
  const maxMB = parseInt(maxKBInput.value);
  const maxKB = maxMB * 1024;
  const frameDelaySeconds = parseFloat(frameDelayInput.value);
  const frameDelay = Math.round(frameDelaySeconds * 1000);
  const colorCount = parseInt(colorCountSelect.value);
  
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
  conversionResults = [];
  
  for (const [groupName, files] of Object.entries(groupedFiles)) {
    try {
      const result = await window.electronAPI.convertToGif({
        groupName: groupName,
        pngFilePaths: files.map(f => f.path),
        outputDir: selectedDirectory,
        maxKB,
        frameDelay,
        colorCount,
        ditherType
      });
      
      if (result.success) {
        completedGroups++;
        updateProgress(completedGroups, totalGroups);
        
        conversionResults.push({
          path: result.path,
          name: groupName,
          size: result.size,
          dimensions: result.dimensions,
          ditherType: result.ditherType
        });
      } else {
        showStatus(`Ошибка при конвертации группы ${groupName}: ${result.error}`, 'error');
      }
    } catch (error) {
      showStatus(`Ошибка при конвертации группы ${groupName}: ${error.message}`, 'error');
    }
  }
  
  if (completedGroups === totalGroups) {
    showStatus(`Успешно сконвертировано ${completedGroups} групп файлов!`, 'success');
    displayResults();
  }
  
  convertButton.disabled = false;
});

// Отображение результатов
function displayResults() {
  resultsGrid.innerHTML = '';
  
  conversionResults.forEach(result => {
    const card = document.createElement('div');
    card.className = 'result-card';
    
    card.innerHTML = `
      <img src="file://${result.path}" alt="${result.name}">
      <div class="result-info">
        <p><strong>${result.name}</strong></p>
        <p>Размер: ${(result.size / 1024 / 1024).toFixed(2)} МБ</p>
        <p>Размеры: ${result.dimensions.width}x${result.dimensions.height}px</p>
        <p>Дизеринг: ${result.ditherType}</p>
      </div>
    `;
    
    resultsGrid.appendChild(card);
  });
  
  mainPage.classList.remove('active');
  resultsPage.classList.add('active');
}

// Обновление прогресса
function updateProgress(current, total) {
  const percentage = Math.round((current / total) * 100);
  progressBar.style.width = `${percentage}%`;
  progressText.textContent = `${percentage}%`;
}

// Отображение статуса
function showStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = type;
  statusDiv.style.display = 'block';
  
  setTimeout(() => {
    statusDiv.style.display = 'none';
  }, 5000);
}

ditherRadios.forEach(radio => {
  radio.addEventListener('change', () => {
    ditherType = radio.value;
  });
  if (radio.checked) ditherType = radio.value;
});
// const { ipcRenderer } = require('electron');

let selectedDirectory = null;
let pngFiles = [];
let groupedFiles = {};
let conversionResults = [];
let ditherType = 'FloydSteinberg';

let defaultConfig = {};

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
const infoButton = document.getElementById('info-link');
const infoModal = document.getElementById('info-modal');
const modalClose = document.querySelector('.modal-close');
const asciiLogo = document.getElementById('ascii-logo');
const ditherSelect = document.getElementById('dither-select');
const ditherExplanation = document.getElementById('dither-explanation');
const openFolderBtn = document.getElementById('open-folder-button');

const ditherExplanations = {
    'none': 'Без дизеринга. Возможны резкие переходы между цветами.',
    'FloydSteinberg': 'Floyd–Steinberg — классический алгоритм диффузии ошибки. Подходит для большинства изображений.',
    'Riemersma': 'Riemersma — менее шумный, но более структурированный результат.'
};

function updateDitherExplanation() {
    ditherType = ditherSelect.value;
    ditherExplanation.textContent = ditherExplanations[ditherType];
}

// Загрузка и применение конфига
async function loadAndApplyConfig() {
    defaultConfig = await window.electronAPI.getConfig();
    maxKBInput.value = defaultConfig.maxKb;
    frameDelayInput.value = defaultConfig.frameDelay;
    colorCountSelect.value = defaultConfig.colorCount;
    ditherType = defaultConfig.dither || 'FloydSteinberg';
    ditherSelect.value = ditherType;
    updateDitherExplanation();
}

// Проверка наличия ImageMagick при запуске
document.addEventListener('DOMContentLoaded', async () => {
    await loadAndApplyConfig();
    const isImageMagickAvailable = await window.electronAPI.checkImageMagick();
    if (!isImageMagickAvailable) {
        showStatus('Внимание: ImageMagick не найден. Установите его и перезапустите приложение. Инструкции в README.', 'error');
        convertButton.disabled = true;
    }
});

// Загрузка ASCII логотипа
fetch('assets/logo.txt')
    .then(response => {
        if (!response.ok) {
            throw new Error('Файл logo.txt не найден');
        }
        return response.text();
    })
    .then(text => {
        asciiLogo.textContent = text;
    })
    .catch(error => {
        console.error('Ошибка загрузки логотипа:', error);
        asciiLogo.textContent = 'Ошибка: не удалось загрузить logo.txt.\n\nПожалуйста, поместите файл logo.txt в папку src/.';
    });

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
    maxKBInput.value = defaultConfig.maxKb;
    frameDelayInput.value = defaultConfig.frameDelay;
    colorCountSelect.value = defaultConfig.colorCount;
    ditherType = defaultConfig.dither || 'FloydSteinberg';
    ditherSelect.value = ditherType;
    updateDitherExplanation();
});

// Обработчик кнопки "Назад"
backButton.addEventListener('click', () => {
  mainPage.classList.add('active');
  resultsPage.classList.remove('active');
});

openFolderBtn.addEventListener('click', () => {
    if (selectedDirectory) {
        const gifFolder = selectedDirectory + '/GIF';
        window.electronAPI.openFolder(gifFolder);
    }
});

// Выбор директории
chooseDirectoryBtn.addEventListener('click', async () => {
  const result = await window.electronAPI.chooseDirectory();
  if (result && result.success) {
    selectedDirectory = result.path;
    directoryDisplay.textContent = selectedDirectory;
    directoryDisplay.style.display = 'none';
    chooseDirectoryBtn.textContent = selectedDirectory;
    
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
    return;
  }
});

// Отображение файлов
function displayFiles(groups) {
  fileList.innerHTML = '';
  filesContainer.style.display = 'block';
  
  for (const [groupName, files] of Object.entries(groups)) {
    const groupItem = document.createElement('li');
    const displayName = groupName.replace(/_/g, ' ');
    groupItem.innerHTML = `<img src="file://${files[0].path}" class="tiny-preview" alt="prev"> ${displayName} <span class="muted">(${files.length})</span>`;
    fileList.appendChild(groupItem);
  }
}

// Конвертация в GIF
convertButton.addEventListener('click', async () => {
  if (!selectedDirectory) return;
  
  const maxKB = parseInt(maxKBInput.value);
  const frameDelaySeconds = parseFloat(frameDelayInput.value);
  const frameDelay = Math.round(frameDelaySeconds * 1000);
  const colorCount = parseInt(colorCountSelect.value);
  
  if (isNaN(maxKB) || maxKB < 1) {
    showStatus('Пожалуйста, введите корректный размер файла (минимум 1 КБ)', 'error');
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
      progressText.textContent = `Конвертируется группа: ${groupName}...`;
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
          ditherType: result.ditherType,
          colorsReduced: result.colorsReduced,
          finalColorCount: result.finalColorCount,
          initialColorCount: result.initialColorCount
        });
      } else {
        showStatus(`Ошибка при конвертации группы ${groupName}: ${result.error}`, 'error');
      }
    } catch (error) {
      showStatus(`Ошибка при конвертации группы ${groupName}: ${error.message}`, 'error');
    }
  }
  
  if (completedGroups === totalGroups && completedGroups > 0) {
    showStatus(`Успешно сконвертировано ${completedGroups} групп файлов!`, 'success');
    displayResults();
  } else {
    progressContainer.style.display = 'none';
  }
  
  convertButton.disabled = false;
  progressText.textContent = '';
});

// Отображение результатов
function displayResults() {
  resultsGrid.innerHTML = '';
  
  conversionResults.forEach(result => {
    const card = document.createElement('div');
    card.className = 'result-card';
    
    let colorInfo = `<p>Цветов: ${result.finalColorCount}</p>`;
    if (result.colorsReduced) {
        colorInfo = `<p>Цветов: ${result.finalColorCount} (уменьшено с ${result.initialColorCount})</p>`;
    }

    card.innerHTML = `
      <img src="file://${result.path}" alt="${result.name}">
      <div class="result-info">
        <p><strong>${result.name}</strong></p>
        <p>Размер: ${(result.size / 1024).toFixed(1)} КБ</p>
        <p>Размеры: ${result.dimensions.width}×${result.dimensions.height}px</p>
        <p>Дизеринг: ${result.ditherType === 'none' ? 'Без дизеринга' : result.ditherType}</p>
        ${colorInfo}
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

ditherSelect.addEventListener('change', updateDitherExplanation);
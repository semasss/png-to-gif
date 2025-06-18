// const { ipcRenderer } = require('electron');

let selectedDirectory = null;
let pngFiles = [];
let groupedFiles = {};
let conversionResults = [];

let defaultConfig = {};

// DOM Elements
const directoryDisplay = document.getElementById('directory-display');
const chooseDirectoryBtn = document.getElementById('choose-directory');
const convertButton = document.getElementById('convert-button');
const resetSettingsBtn = document.getElementById('reset-settings');
const frameDelayInput = document.getElementById('frame-delay');
// const qualitySlider = document.getElementById('quality-slider');
// const qualityValue = document.getElementById('quality-value');
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
const openFolderBtn = document.getElementById('open-folder-button');
const maxSizeSelect = document.getElementById('max-size');
const colorCountSelect = document.getElementById('color-count');
const ditherTypeSelect = document.getElementById('dither-type');
const groupsInfo = document.getElementById('groups-info');
const groupsCountSpan = document.getElementById('groups-count');

// Загрузка и применение конфига
async function loadAndApplyConfig() {
    defaultConfig = await window.electronAPI.getConfig();
    frameDelayInput.value = defaultConfig.frameDelay;
    // qualitySlider.value = defaultConfig.quality;
    // qualityValue.textContent = `${defaultConfig.quality}%`;
    if (defaultConfig.colorCount && colorCountSelect) {
        colorCountSelect.value = defaultConfig.colorCount.toString();
    }
}

// Проверка наличия gifski при запуске
document.addEventListener('DOMContentLoaded', async () => {
    await loadAndApplyConfig();
    const isGifskiAvailable = await window.electronAPI.checkImageMagick(); // API остался тот же
    if (!isGifskiAvailable) {
        showStatus('Внимание: gifski не найден. Установите его (brew install gifski) и перезапустите приложение.', 'error');
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
    frameDelayInput.value = defaultConfig.frameDelay;
    // qualitySlider.value = defaultConfig.quality;
    // qualityValue.textContent = `${defaultConfig.quality}%`;
    if (defaultConfig.colorCount) {
        colorCountSelect.value = defaultConfig.colorCount.toString();
    }
    // Сбрасываем визуальное состояние кнопки выбора папки
    chooseDirectoryBtn.classList.remove('chosen');
    chooseDirectoryBtn.innerHTML = 'Выбор папки <span class="arrow">›</span>';
    directoryDisplay.style.display = 'none';
    groupsInfo.style.display = 'none';
    fileList.innerHTML = '';
    convertButton.disabled = true;
    selectedDirectory = null;
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
    // Отображаем имя папки прямо на кнопке
    const baseFolderName = selectedDirectory.split(/[/\\]/).pop();
    chooseDirectoryBtn.classList.add('chosen');
    chooseDirectoryBtn.innerHTML = `${baseFolderName} <span class="arrow">›</span>`;
    directoryDisplay.style.display = 'none';
    
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
  
  const groupNames = Object.keys(groups);
  if (groupNames.length > 0) {
    groupsCountSpan.textContent = groupNames.length.toString();
    groupsInfo.style.display = 'block';
  }
  
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
  
  const frameDelaySeconds = parseFloat(frameDelayInput.value);
  const maxKb = maxSizeSelect ? parseInt(maxSizeSelect.value) : 2048;
  const colorCount = parseInt(colorCountSelect.value);
  const ditherType = ditherTypeSelect ? ditherTypeSelect.value : 'floyd';

  if (isNaN(frameDelaySeconds) || frameDelaySeconds < 0.01) {
    showStatus('Пожалуйста, введите корректную задержку между кадрами (минимум 0.01 сек)', 'error');
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
        frameDelay: frameDelaySeconds,
        quality: 90,
        maxKb: maxKb,
        colorCount: colorCount,
        ditherType: ditherType,
      });
      
      if (result.success) {
        completedGroups++;
        updateProgress(completedGroups, totalGroups);
        
        conversionResults.push({
          path: result.path,
          name: groupName,
          size: result.size,
          dimensions: result.dimensions,
          finalColorCount: result.finalColorCount,
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
});

// Отображение результатов
function displayResults() {
  resultsGrid.innerHTML = '';
  
  conversionResults.forEach(result => {
    const card = document.createElement('div');
    card.className = 'result-card';
    
    let colorInfo = `<p>Цветов: до ${result.finalColorCount}</p>`;

    card.innerHTML = `
      <img src="file://${result.path}" alt="${result.name}">
      <div class="result-info">
        <p><strong>${result.name}</strong></p>
        <p>Размер: ${(result.size / 1024).toFixed(1)} КБ</p>
        <p>Размеры: н/д</p> 
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

/* qualitySlider.addEventListener('input', () => {
    qualityValue.textContent = `${qualitySlider.value}%`;
}); */
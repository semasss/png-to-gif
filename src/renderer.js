// Исправленный renderer.js с улучшенной диагностикой

let selectedDirectory = null;
let pngFiles = [];
let groupedFiles = {};
let conversionResults = [];
let defaultConfig = {};

// Подписка на события прогресса
window.electronAPI.onConversionProgress((data) => {
    const { groupName, status } = data;
    const detailStatus = document.getElementById('detail-status');
    if (detailStatus) {
        detailStatus.textContent = `${groupName}: ${status}`;
    }
});

// DOM Elements
const directoryDisplay = document.getElementById('directory-display');
const chooseDirectoryBtn = document.getElementById('choose-directory');
const convertButton = document.getElementById('convert-button');
const resetSettingsBtn = document.getElementById('reset-settings');
const frameDelayInput = document.getElementById('frame-delay');
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

// Функция для отображения статуса с улучшенным логированием
function showStatus(message, type = 'info') {
    console.log(`[STATUS] ${type.toUpperCase()}: ${message}`);
    if (statusDiv) {
        statusDiv.textContent = message;
        statusDiv.className = type;
        statusDiv.style.display = 'block';
        
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 5000);
    }
}

// Проверка доступности electronAPI при загрузке
function checkElectronAPI() {
    console.log('[ДИАГНОСТИКА] Проверка доступности electronAPI...');
    
    if (typeof window.electronAPI === 'undefined') {
        console.error('[ОШИБКА] window.electronAPI не доступен! Проблема с preload.js');
        showStatus('Критическая ошибка: API недоступен. Проверьте preload.js', 'error');
        return false;
    }
    
    console.log('[OK] window.electronAPI доступен');
    console.log('[ДИАГНОСТИКА] Доступные методы:', Object.keys(window.electronAPI));
    
    // Проверяем каждый необходимый метод
    const requiredMethods = ['chooseDirectory', 'getPngFiles', 'convertToGif', 'getConfig', 'checkImageMagick'];
    const missingMethods = requiredMethods.filter(method => typeof window.electronAPI[method] !== 'function');
    
    if (missingMethods.length > 0) {
        console.error('[ОШИБКА] Отсутствуют методы:', missingMethods);
        showStatus(`Ошибка API: отсутствуют методы ${missingMethods.join(', ')}`, 'error');
        return false;
    }
    
    console.log('[OK] Все необходимые методы API доступны');
    return true;
}

// Загрузка и применение конфига с улучшенной обработкой ошибок
async function loadAndApplyConfig() {
    try {
        console.log('[CONFIG] Загрузка конфигурации...');
        defaultConfig = await window.electronAPI.getConfig();
        console.log('[CONFIG] Конфигурация загружена:', defaultConfig);
        
        if (frameDelayInput) {
            frameDelayInput.value = defaultConfig.frameDelay || 3;
        }
        
        if (defaultConfig.colorCount && colorCountSelect) {
            colorCountSelect.value = defaultConfig.colorCount.toString();
        }
        
        console.log('[CONFIG] Конфигурация применена успешно');
    } catch (error) {
        console.error('[CONFIG] Ошибка загрузки конфигурации:', error);
        showStatus('Ошибка загрузки конфигурации', 'error');
    }
}

// Проверка наличия gifski при запуске
async function checkGifskiAvailability() {
    try {
        console.log('[GIFSKI] Проверка доступности gifski...');
        const isGifskiAvailable = await window.electronAPI.checkImageMagick();
        
        if (!isGifskiAvailable) {
            console.warn('[GIFSKI] gifski недоступен');
            showStatus('Внимание: gifski не найден. Установите его (brew install gifski) и перезапустите приложение.', 'error');
            if (convertButton) {
                convertButton.disabled = true;
            }
            return false;
        }
        
        console.log('[GIFSKI] gifski доступен');
        return true;
    } catch (error) {
        console.error('[GIFSKI] Ошибка проверки gifski:', error);
        showStatus('Ошибка проверки gifski', 'error');
        return false;
    }
}

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[INIT] Начало инициализации приложения');
    
    // Проверяем доступность API
    if (!checkElectronAPI()) {
        return; // Прекращаем инициализацию если API недоступен
    }
    
    // Загружаем конфигурацию
    await loadAndApplyConfig();
    
    // Проверяем gifski
    await checkGifskiAvailability();
    
    // Загружаем ASCII логотип
    loadAsciiLogo();
    
    console.log('[INIT] Инициализация завершена');
});

// Загрузка ASCII логотипа с улучшенной обработкой ошибок
function loadAsciiLogo() {
    if (!asciiLogo) return;
    
    fetch('assets/logo.txt')
        .then(response => {
            if (!response.ok) {
                throw new Error('Файл logo.txt не найден');
            }
            return response.text();
        })
        .then(text => {
            asciiLogo.textContent = text;
            console.log('[LOGO] ASCII логотип загружен');
        })
        .catch(error => {
            console.error('[LOGO] Ошибка загрузки логотипа:', error);
            asciiLogo.textContent = 'Ошибка: не удалось загрузить logo.txt.\n\nПожалуйста, поместите файл logo.txt в папку src/.';
        });
}

// Обработчик выбора директории с детальным логированием
if (chooseDirectoryBtn) {
    chooseDirectoryBtn.addEventListener('click', async (event) => {
        console.log('[CLICK] Клик по кнопке выбора директории');
        
        // Предотвращаем всплытие события
        event.preventDefault();
        event.stopPropagation();
        
        try {
            // Проверяем доступность API еще раз
            if (!window.electronAPI || typeof window.electronAPI.chooseDirectory !== 'function') {
                throw new Error('API chooseDirectory недоступен');
            }
            
            console.log('[API] Вызов chooseDirectory...');
            showStatus('Выбор папки...', 'info');
            
            // Вызываем диалог выбора папки
            const result = await window.electronAPI.chooseDirectory();
            console.log('[API] Результат chooseDirectory:', result);
            
            if (result && result.success && result.path) {
                selectedDirectory = result.path;
                console.log('[SUCCESS] Выбрана папка:', selectedDirectory);
                
                // Отображаем имя папки на кнопке
                const baseFolderName = selectedDirectory.split(/[/\\]/).pop();
                chooseDirectoryBtn.classList.add('chosen');
                chooseDirectoryBtn.innerHTML = `${baseFolderName} <span class="arrow">›</span>`;
                
                if (directoryDisplay) {
                    directoryDisplay.style.display = 'none';
                }
                
                try {
                    console.log('[FILES] Получение списка PNG файлов...');
                    showStatus('Анализ папки...', 'info');
                    
                    // Получаем список PNG файлов
                    const files = await window.electronAPI.getPngFiles(selectedDirectory);
                    console.log('[FILES] Результат getPngFiles:', files);
                    
                    if (files && files.success && files.groups) {
                        groupedFiles = files.groups;
                        displayFiles(groupedFiles);
                        
                        if (convertButton) {
                            convertButton.disabled = false;
                        }
                        
                        showStatus(`Найдено ${Object.keys(groupedFiles).length} групп файлов`, 'success');
                    } else {
                        const errorMsg = files?.error || 'Неизвестная ошибка при получении файлов';
                        console.error('[FILES] Ошибка:', errorMsg);
                        showStatus(`Ошибка: ${errorMsg}`, 'error');
                    }
                } catch (filesError) {
                    console.error('[FILES] Исключение при получении файлов:', filesError);
                    showStatus(`Ошибка получения файлов: ${filesError.message}`, 'error');
                }
            } else {
                console.log('[CANCEL] Выбор папки отменен или произошла ошибка');
                if (result && result.error) {
                    console.error('[ERROR] Ошибка при выборе папки:', result.error);
                    showStatus(`Ошибка выбора папки: ${result.error}`, 'error');
                }
            }
        } catch (error) {
            console.error('[EXCEPTION] Критическая ошибка при выборе директории:', error);
            showStatus(`Критическая ошибка: ${error.message}`, 'error');
        }
    });
    
    console.log('[INIT] Обработчик кнопки выбора папки установлен');
} else {
    console.error('[ERROR] Кнопка выбора папки не найдена в DOM!');
}

// Остальные обработчики событий...

// Обработчик сброса настроек
if (resetSettingsBtn) {
    resetSettingsBtn.addEventListener('click', () => {
        console.log('[RESET] Сброс настроек');
        
        if (frameDelayInput) {
            frameDelayInput.value = defaultConfig.frameDelay || 3;
        }
        
        if (defaultConfig.colorCount && colorCountSelect) {
            colorCountSelect.value = defaultConfig.colorCount.toString();
        }
        
        // Сбрасываем визуальное состояние кнопки выбора папки
        if (chooseDirectoryBtn) {
            chooseDirectoryBtn.classList.remove('chosen');
            chooseDirectoryBtn.innerHTML = 'Выбор папки <span class="arrow">›</span>';
        }
        
        if (directoryDisplay) {
            directoryDisplay.style.display = 'none';
        }
        
        if (groupsInfo) {
            groupsInfo.style.display = 'none';
        }
        
        if (fileList) {
            fileList.innerHTML = '';
        }
        
        if (convertButton) {
            convertButton.disabled = true;
        }
        
        selectedDirectory = null;
        groupedFiles = {};
        
        showStatus('Настройки сброшены', 'success');
    });
}

// Обработчик кнопки "Назад"
if (backButton) {
    backButton.addEventListener('click', () => {
        if (mainPage) mainPage.classList.add('active');
        if (resultsPage) resultsPage.classList.remove('active');
    });
}

// Обработчик открытия папки результатов
if (openFolderBtn) {
    openFolderBtn.addEventListener('click', () => {
        if (selectedDirectory && window.electronAPI && window.electronAPI.openFolder) {
            const gifFolder = selectedDirectory + '/GIF';
            window.electronAPI.openFolder(gifFolder);
        }
    });
}

// Обработчики модального окна
if (infoButton && infoModal) {
    infoButton.addEventListener('click', () => {
        infoModal.classList.add('active');
    });
}

if (modalClose && infoModal) {
    modalClose.addEventListener('click', () => {
        infoModal.classList.remove('active');
    });
}

if (infoModal) {
    infoModal.addEventListener('click', (e) => {
        if (e.target === infoModal) {
            infoModal.classList.remove('active');
        }
    });
}

// Функция отображения файлов
function displayFiles(groups) {
    if (!fileList) return;
    
    console.log('[DISPLAY] Отображение файлов:', groups);
    
    fileList.innerHTML = '';
    
    if (filesContainer) {
        filesContainer.style.display = 'block';
    }
    
    const groupNames = Object.keys(groups);
    if (groupNames.length > 0) {
        if (groupsCountSpan) {
            groupsCountSpan.textContent = groupNames.length.toString();
        }
        if (groupsInfo) {
            groupsInfo.style.display = 'block';
        }
    }
    
    for (const [groupName, files] of Object.entries(groups)) {
        const groupItem = document.createElement('div');
        const displayName = groupName.replace(/_/g, ' ');
        groupItem.innerHTML = `<img src="file://${files[0].path}" class="tiny-preview" alt="prev"> ${displayName} <span class="muted">(${files.length})</span>`;
        fileList.appendChild(groupItem);
    }
}

// Конвертация в GIF (упрощенная версия для диагностики)
if (convertButton) {
    convertButton.addEventListener('click', async () => {
        console.log('[CONVERT] Начало конвертации');
        
        if (!selectedDirectory) {
            showStatus('Сначала выберите папку', 'error');
            return;
        }
        
        const frameDelaySeconds = parseFloat(frameDelayInput?.value || 3);
        const colorCount = parseInt(colorCountSelect?.value || '256');
        
        if (isNaN(frameDelaySeconds) || frameDelaySeconds < 0.01) {
            showStatus('Пожалуйста, введите корректную задержку между кадрами (минимум 0.01 сек)', 'error');
            return;
        }
        
        convertButton.disabled = true;
        progressContainer.style.display = 'block';
        progressBar.style.width = '0%';
        progressText.textContent = 'Подготовка...';
        
        let totalGroups = Object.keys(groupedFiles).length;
        let completedGroups = 0;
        conversionResults = [];
        
        try {
            for (const [groupName, files] of Object.entries(groupedFiles)) {
                console.log(`[CONVERT] Конвертация группы: ${groupName}`);
                
                if (progressText) {
                    progressText.textContent = `Конвертируется группа: ${groupName}...`;
                }
                
                try {
                    const result = await window.electronAPI.convertToGif({
                        groupName: groupName,
                        pngFilePaths: files.map(f => f.path),
                        outputDir: selectedDirectory,
                        frameDelay: frameDelaySeconds,
                        quality: 90,
                        maxKb: 500,
                        colorCount: colorCount,
                        ditherType: 'floyd',
                    });
                    
                    if (result.success) {
                        completedGroups++;
                        updateProgress(completedGroups, totalGroups);
                        
                        conversionResults.push({
                            path: result.path,
                            name: groupName,
                            size: result.size,
                            dimensions: result.dimensions,
                            finalColorCount: result.finalColorCount || colorCount,
                        });
                        
                        console.log(`[CONVERT] Группа ${groupName} сконвертирована успешно`);
                    } else {
                        console.error(`[CONVERT] Ошибка конвертации группы ${groupName}:`, result.error);
                        showStatus(`Ошибка при конвертации группы ${groupName}: ${result.error}`, 'error');
                    }
                } catch (groupError) {
                    console.error(`[CONVERT] Исключение при конвертации группы ${groupName}:`, groupError);
                    showStatus(`Ошибка при конвертации группы ${groupName}: ${groupError.message}`, 'error');
                }
            }
            
            if (completedGroups === totalGroups && completedGroups > 0) {
                showStatus(`Успешно сконвертировано ${completedGroups} групп файлов!`, 'success');
                displayResults();
            } else if (completedGroups > 0) {
                showStatus(`Сконвертировано ${completedGroups} из ${totalGroups} групп`, 'warning');
                displayResults();
            } else {
                showStatus('Не удалось сконвертировать ни одной группы', 'error');
            }
        } catch (error) {
            console.error('[CONVERT] Критическая ошибка конвертации:', error);
            showStatus(`Критическая ошибка конвертации: ${error.message}`, 'error');
        } finally {
            if (progressContainer) {
                progressContainer.style.display = 'none';
            }
            convertButton.disabled = false;
        }
    });
}

// Отображение результатов
function displayResults() {
    if (!resultsGrid) return;
    
    resultsGrid.innerHTML = '';
    
    conversionResults.forEach(result => {
        const card = document.createElement('div');
        card.className = 'result-card';
        
        const colorInfo = `<p>Цветов: до ${result.finalColorCount}</p>`;
        
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
    
    if (mainPage) mainPage.classList.remove('active');
    if (resultsPage) resultsPage.classList.add('active');
}

// Обновление прогресса
function updateProgress(current, total) {
    const percentage = Math.round((current / total) * 100);
    progressBar.style.width = `${percentage}%`;
    progressText.textContent = `Выполнено: ${current} из ${total} (${percentage}%)`;
}

// Глобальная обработка ошибок
window.addEventListener('error', (event) => {
    console.error('[GLOBAL ERROR]', event.error);
    showStatus(`Глобальная ошибка: ${event.error.message}`, 'error');
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('[UNHANDLED PROMISE REJECTION]', event.reason);
    showStatus(`Необработанная ошибка: ${event.reason}`, 'error');
});

console.log('[RENDERER] Скрипт renderer.js загружен полностью');
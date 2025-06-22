// Исправленный renderer.js с улучшенной диагностикой и системой отчетности

let selectedDirectory = null;
let pngFiles = [];
let groupedFiles = {};
let conversionResults = [];
let defaultConfig = {};

// ================================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ УЛУЧШЕННОЙ ОТЧЕТНОСТИ
// ================================================================================

function formatDateTime(date) {
    return date.toLocaleString('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

function formatTimestamp(date) {
    return date.toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

function formatDuration(seconds) {
    if (seconds < 60) {
        return `${seconds} сек`;
    } else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes} мин ${remainingSeconds} сек`;
    } else {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours} ч ${minutes} мин`;
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Б';
    
    const k = 1024;
    const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function generateDetailedReport(conversionResults, sessionLog, sessionInfo) {
    const { sessionStart, sessionEnd, totalGroups, completedGroups, selectedDirectory, settings } = sessionInfo;
    
    // Вычисляем статистику
    const duration = Math.round((sessionEnd - sessionStart) / 1000); // в секундах
    const successfulConversions = conversionResults.filter(r => r.success).length;
    const failedConversions = conversionResults.filter(r => !r.success).length;
    
    let totalInputFiles = 0;
    let totalOutputSize = 0;
    let generatedGifs = [];
    
    conversionResults.forEach(result => {
        if (result.success) {
            totalInputFiles += result.inputFilesCount || 0;
            totalOutputSize += result.outputSize || 0;
            generatedGifs.push({
                name: result.groupName,
                size: result.outputSize || 0,
                inputFiles: result.inputFilesCount || 0,
                quality: result.quality || 'Высокое'
            });
        }
    });

    // Генерируем красивый отчет
    let report = '';
    
    // ЗАГОЛОВОК ОТЧЕТА
    report += '╔══════════════════════════════════════════════════════════════════════════════╗\n';
    report += '║                            ОТЧЕТ О КОНВЕРТАЦИИ                              ║\n';
    report += '║                        PNG/JPEG → GIF Конвертер                             ║\n';
    report += '╚══════════════════════════════════════════════════════════════════════════════╝\n\n';

    // ИНФОРМАЦИЯ О СЕССИИ
    report += '┌─ ИНФОРМАЦИЯ О СЕССИИ ────────────────────────────────────────────────────────┐\n';
    report += `│ 📅 Дата начала: ${formatDateTime(sessionStart)}\n`;
    report += `│ 🏁 Дата окончания: ${formatDateTime(sessionEnd)}\n`;
    report += `│ ⏱️  Продолжительность: ${formatDuration(duration)}\n`;
    report += `│ 📁 Исходная папка: ${selectedDirectory}\n`;
    report += `│ 💾 Папка результатов: Результаты конвертации - ${formatTimestamp(sessionStart)}\n`;
    report += '└──────────────────────────────────────────────────────────────────────────────┘\n\n';

    // НАСТРОЙКИ КОНВЕРТАЦИИ
    report += '┌─ НАСТРОЙКИ КОНВЕРТАЦИИ ──────────────────────────────────────────────────────┐\n';
    report += `│ ⏰ Задержка между кадрами: ${settings.frameDelay} сек\n`;
    report += `│ 📏 Максимальный размер файла: ${settings.maxKb} КБ\n`;
    report += `│ 🎨 Качество сжатия: Автоматическое\n`;
    report += `│ ⚡ Оптимизация: Включена\n`;
    report += '└──────────────────────────────────────────────────────────────────────────────┘\n\n';

    // СТАТИСТИКА РЕЗУЛЬТАТОВ
    report += '┌─ СТАТИСТИКА РЕЗУЛЬТАТОВ ─────────────────────────────────────────────────────┐\n';
    report += `│ 📊 Всего групп для обработки: ${totalGroups}\n`;
    report += `│ ✅ Успешно сконвертировано: ${successfulConversions}\n`;
    if (failedConversions > 0) {
        report += `│ ❌ Неудачных конвертаций: ${failedConversions}\n`;
    }
    report += `│ 🖼️  Общее количество входных файлов: ${totalInputFiles}\n`;
    report += `│ 🎬 Сгенерировано GIF файлов: ${generatedGifs.length}\n`;
    report += `│ 💽 Общий размер результатов: ${formatFileSize(totalOutputSize)}\n`;
    report += `│ 📈 Процент успеха: ${Math.round((successfulConversions / totalGroups) * 100)}%\n`;
    report += '└──────────────────────────────────────────────────────────────────────────────┘\n\n';

    // ДЕТАЛИ СГЕНЕРИРОВАННЫХ ФАЙЛОВ
    if (generatedGifs.length > 0) {
        report += '┌─ СГЕНЕРИРОВАННЫЕ GIF ФАЙЛЫ ──────────────────────────────────────────────────┐\n';
        generatedGifs.forEach((gif, index) => {
            const prefix = index === generatedGifs.length - 1 ? '└─' : '├─';
            report += `│ ${prefix} 🎬 ${gif.name}.gif\n`;
            report += `│ │  ├─ 💽 Размер файла: ${formatFileSize(gif.size)}\n`;
            report += `│ │  ├─ 🖼️  Входных изображений: ${gif.inputFiles}\n`;
            if (index < generatedGifs.length - 1) {
                report += `│ │  └─ ⭐ Качество: ${gif.quality}\n`;
                report += '│ │\n';
            } else {
                report += `│ └─ ⭐ Качество: ${gif.quality}\n`;
            }
        });
        report += '└──────────────────────────────────────────────────────────────────────────────┘\n\n';
    }

    // ОШИБКИ И ПРЕДУПРЕЖДЕНИЯ (если есть)
    const errors = conversionResults.filter(r => !r.success);
    if (errors.length > 0) {
        report += '┌─ ОШИБКИ И ПРЕДУПРЕЖДЕНИЯ ────────────────────────────────────────────────────┐\n';
        errors.forEach((error, index) => {
            const prefix = index === errors.length - 1 ? '└─' : '├─';
            report += `│ ${prefix} ❌ ${error.groupName}: ${error.error}\n`;
        });
        report += '└──────────────────────────────────────────────────────────────────────────────┘\n\n';
    }

    // ПРОИЗВОДИТЕЛЬНОСТЬ
    if (successfulConversions > 0) {
        const avgTimePerGroup = duration / successfulConversions;
        const avgFilesPerGroup = totalInputFiles / successfulConversions;
        
        report += '┌─ ПРОИЗВОДИТЕЛЬНОСТЬ ─────────────────────────────────────────────────────────┐\n';
        report += `│ ⚡ Среднее время на группу: ${avgTimePerGroup.toFixed(1)} сек\n`;
        report += `│ 📊 Среднее количество файлов в группе: ${Math.round(avgFilesPerGroup)}\n`;
        report += `│ 🚀 Файлов обработано в секунду: ${(totalInputFiles / duration).toFixed(1)}\n`;
        report += '└──────────────────────────────────────────────────────────────────────────────┘\n\n';
    }

    // ПОДРОБНЫЕ ЛОГИ КОНВЕРТАЦИИ
    report += '╔══════════════════════════════════════════════════════════════════════════════╗\n';
    report += '║                           ПОДРОБНЫЕ ЛОГИ                                    ║\n';
    report += '╚══════════════════════════════════════════════════════════════════════════════╝\n\n';

    // Форматируем существующие логи
    sessionLog.forEach(logLine => {
        if (logLine.includes('============================================================')) {
            report += '═'.repeat(80) + '\n';
        } else if (logLine.includes('------------------------------------------------------------')) {
            report += '─'.repeat(80) + '\n';
        } else if (logLine.startsWith('* ')) {
            report += `🚀 ${logLine.substring(2)}\n`;
        } else if (logLine.startsWith('- ')) {
            report += `   ${logLine}\n`;
        } else if (logLine.includes('✓') || logLine.includes('успешно')) {
            report += `✅ ${logLine}\n`;
        } else if (logLine.includes('✗') || logLine.includes('ошибка')) {
            report += `❌ ${logLine}\n`;
        } else if (logLine.includes('[ПРЕ-ПРОЦЕССИНГ]')) {
            report += `🔄 ${logLine}\n`;
        } else if (logLine.includes('[ОПТИМИЗАЦИЯ]')) {
            report += `⚡ ${logLine}\n`;
        } else {
            report += `   ${logLine}\n`;
        }
    });

    // ПОДВАЛ ОТЧЕТА
    report += '\n' + '═'.repeat(80) + '\n';
    report += `📝 Отчет сгенерирован: ${formatDateTime(new Date())}\n`;
    report += `🔧 PNG/JPEG → GIF Конвертер v2.0\n`;
    report += '═'.repeat(80) + '\n';

    return report;
}

// ================================================================================
// ОСНОВНОЙ КОД ПРИЛОЖЕНИЯ
// ================================================================================

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
const openOutputFolderBtn = document.getElementById('open-output-folder-button');

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
        const isAvailable = await window.electronAPI.checkTools();
        
        if (!isAvailable) {
            console.warn('[GIFSKI] gifski недоступен');
            showStatus('Внимание: gifski не найден. Установите его (brew install gifski) или поместите в папку vendor и перезапустите приложение.', 'error');
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
    
    // Устанавливаем значение по умолчанию для задержки кадра
    if (frameDelayInput) {
        frameDelayInput.value = '3';
    }
    
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
    openFolderBtn.addEventListener('click', async () => {
        const firstSuccessfulResult = conversionResults.find(r => r.success && r.outputDir);
        if (firstSuccessfulResult) {
            // Открываем корневую папку 'gif_conversions'
            window.electronAPI.openPath(firstSuccessfulResult.outputDir);
        } else if (selectedDirectory) {
            window.electronAPI.openPath(selectedDirectory);
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

// Конвертация в GIF с улучшенной отчетностью
if (convertButton) {
    convertButton.addEventListener('click', async () => {
        console.log('[CONVERT] Начало конвертации');
        
        if (!selectedDirectory) {
            showStatus('Сначала выберите папку', 'error');
            return;
        }
        
        const frameDelaySeconds = parseFloat(frameDelayInput?.value || 0.1);
        const maxKb = parseInt(maxSizeSelect?.value || '500');
        
        if (isNaN(frameDelaySeconds) || frameDelaySeconds < 0.01) {
            showStatus('Пожалуйста, введите корректную задержку между кадрами (минимум 0.01 сек)', 'error');
            return;
        }
        
        convertButton.disabled = true;
        progressContainer.style.display = 'block';
        progressBar.style.width = '0%';
        progressText.textContent = 'Подготовка...';
        
        // ДОБАВЛЯЕМ ВРЕМЯ НАЧАЛА СЕССИИ
        const sessionStartTime = new Date();
        
        let totalGroups = Object.keys(groupedFiles).length;
        let completedGroups = 0;
        conversionResults = [];
        let sessionLog = [`Сессия конвертации запущена: ${new Date().toISOString()}`];
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const sessionOutputDir = await window.electronAPI.pathJoin(selectedDirectory, `Результаты конвертации - ${timestamp}`);
        
        try {
            for (const [groupName, files] of Object.entries(groupedFiles)) {
                console.log(`[CONVERT] Конвертация группы: ${groupName}`);
                
                if (progressText) {
                    progressText.textContent = `Конвертируется группа: ${groupName}...`;
                }
                
                try {
                    const result = await window.electronAPI.convertToGif({
                        groupName: groupName,
                        files: files,
                        outputDir: selectedDirectory,
                        frameDelay: frameDelaySeconds,
                        maxKb: maxKb,
                        sessionOutputDir: sessionOutputDir,
                    });

                    // Сохраняем полный результат
                    conversionResults.push(result);
                    // Добавляем логи группы в общий лог сессии
                    if(result.logMessages) {
                        sessionLog.push(...result.logMessages);
                    }
                    
                    if (result.success) {
                        completedGroups++;
                        updateProgress(completedGroups, totalGroups);
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
            } else if (completedGroups > 0) {
                showStatus(`Сконвертировано ${completedGroups} из ${totalGroups} групп`, 'warning');
            } else {
                showStatus('Не удалось сконвертировать ни одной группы', 'error');
            }
            displayResults();

            // УЛУЧШЕННАЯ СИСТЕМА СОХРАНЕНИЯ ОТЧЕТА
            if (sessionOutputDir && conversionResults.length > 0) {
                const finalReport = generateDetailedReport(conversionResults, sessionLog, {
                    sessionStart: sessionStartTime,
                    sessionEnd: new Date(),
                    totalGroups: totalGroups,
                    completedGroups: completedGroups,
                    selectedDirectory: selectedDirectory,
                    settings: {
                        frameDelay: frameDelaySeconds,
                        maxKb: maxKb
                    }
                });
                
                const saveResult = await window.electronAPI.saveLog({
                    logContent: finalReport,
                    directory: sessionOutputDir
                });
                
                if (saveResult && saveResult.success) {
                    console.log('[REPORT] Детальный отчет сохранен:', saveResult.reportPath);
                    console.log('[REPORT] Краткий отчет сохранен:', saveResult.summaryPath);
                }
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
        
        if (result.success) {
            card.innerHTML = `
                <img src="file://${result.path}?t=${new Date().getTime()}" alt="${result.groupName}">
                <div class="result-info">
                    <p><strong>${result.groupName}</strong></p>
                    <p>Размер: ${(result.size / 1024).toFixed(1)} КБ</p>
                    <p>Размеры: ${result.dimensions.width}x${result.dimensions.height}</p> 
                    <p>Качество: ${result.quality || 'N/A'}</p>
                </div>
                <div class="result-actions">
                    <button class="action-btn show-in-folder-btn">Показать в проводнике</button>
                </div>
            `;

            card.querySelector('.show-in-folder-btn').addEventListener('click', () => {
                window.electronAPI.showItemInFolder(result.path);
            });

        } else {
            card.classList.add('error');
            card.innerHTML = `
                <div class="result-info">
                    <p><strong>${result.groupName}</strong></p>
                    <p class="error-message">Ошибка: ${result.error || 'Неизвестная ошибка'}</p>
                </div>
            `;
        }

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

// Обработчик открытия папки с результатами
if (openOutputFolderBtn) {
    openOutputFolderBtn.addEventListener('click', () => {
        const firstSuccessfulResult = conversionResults.find(r => r.success && r.outputDir);
        if (firstSuccessfulResult) {
            // outputDir теперь указывает на общую папку 'gif_conversions'
            window.electronAPI.openPath(firstSuccessfulResult.outputDir);
        } else if (selectedDirectory) {
            // Фоллбэк, если ничего не сконвертировано
            window.electronAPI.openPath(selectedDirectory);
        }
    });
}
// Главный файл интерфейса с полной функциональностью
let selectedDirectory = null;
let groupedFiles = {};
let conversionResults = [];
let defaultConfig = { frameDelay: 3, maxKb: 510 };

// Ссылки на DOM-элементы
const selectDirectoryButton = document.getElementById('select-directory-button');
const chooseSub = document.getElementById('choose-sub');
const groupsInfo = document.getElementById('groups-info');
const groupsCountSpan = document.getElementById('groups-count');
const fileList = document.getElementById('file-list');
const convertButton = document.getElementById('convert-button');
const frameDelayInput = document.getElementById('frame-delay');
const maxSizeInput = document.getElementById('max-size');
const resetSettingsBtn = document.getElementById('reset-settings');
const progressContainer = document.getElementById('progress-container');
const progressBar = document.getElementById('progress');
const progressText = document.getElementById('progress-text');
const detailStatus = document.getElementById('detail-status');
const mainPage = document.getElementById('main-page');
const resultsPage = document.getElementById('results-page');
const resultsTitle = document.getElementById('results-title');
const resultsGrid = document.getElementById('results-grid');
const openOutputFolderBtn = document.getElementById('open-output-folder-button');
const infoModal = document.getElementById('info-modal');
const modalClose = document.querySelector('.modal-close');
const groupsHelpButton = document.getElementById('groups-help');

// Функция для отображения статуса
function showStatus(message, type = 'info') {
    console.log(`[STATUS] ${type}: ${message}`);
    const statusEl = document.getElementById('status');
    if (statusEl) {
        statusEl.textContent = message;
        statusEl.className = type;
        statusEl.style.display = 'block';
        
        setTimeout(() => {
            statusEl.style.display = 'none';
        }, 5000);
    }
}

// Обновление состояния кнопки конвертации
function updateConvertButtonState() {
    const hasGroups = Object.keys(groupedFiles).length > 0;
    convertButton.disabled = !selectedDirectory || !hasGroups;
}

// Обновление интерфейса после выбора папки
function updateUIAfterDirectorySelection() {
    // Меняем текст кнопки
    selectDirectoryButton.classList.add('chosen');
    
    // Меняем подзаголовок
    chooseSub.textContent = `YYsalesCompany_24`;
    
    // Показываем информацию о группах
    const groupCount = Object.keys(groupedFiles).length;
    groupsCountSpan.textContent = groupCount;
    groupsInfo.style.display = 'flex';
    
    // Показываем список файлов
    fileList.style.display = 'block';
    displayFiles(groupedFiles);
    
    updateConvertButtonState();
}

// Функция отображения файлов
function displayFiles(groups) {
    fileList.innerHTML = '';
    
    for (const [groupName, files] of Object.entries(groups)) {
        const groupItem = document.createElement('div');
        const displayName = groupName.replace(/_/g, ' ');
        
        // Создаем превью для группы (используем первый файл)
        const previewImg = document.createElement('img');
        previewImg.src = `file://${files[0].path}`;
        previewImg.className = 'tiny-preview';
        previewImg.alt = 'preview';
        
        const textSpan = document.createElement('span');
        textSpan.textContent = `${displayName} `;
        
        const countSpan = document.createElement('span');
        countSpan.className = 'muted';
        countSpan.textContent = `(${files.length})`;
        
        groupItem.appendChild(previewImg);
        groupItem.appendChild(textSpan);
        groupItem.appendChild(countSpan);
        
        fileList.appendChild(groupItem);
    }
}

// Функция отображения результатов
function displayResults() {
    const successfulResults = conversionResults.filter(r => r.success);
    resultsTitle.textContent = `Сконвертировано ${successfulResults.length} гифов`;
    
    resultsGrid.innerHTML = '';
    
    successfulResults.forEach(result => {
        const resultCard = document.createElement('div');
        resultCard.className = 'result-card';
        
        const preview = document.createElement('div');
        preview.className = 'result-preview';
        
        // Создаем изображение превью
        const img = document.createElement('img');
        img.src = result.gifPath || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkdJRjwvdGV4dD48L3N2Zz4=';
        img.alt = result.groupName;
        preview.appendChild(img);
        
        const info = document.createElement('div');
        info.className = 'result-info';
        
        const name = document.createElement('div');
        name.className = 'result-name';
        name.textContent = result.groupName;
        
        const details = document.createElement('div');
        details.className = 'result-details';
        
        const sizeDetail = document.createElement('div');
        sizeDetail.className = 'result-detail';
        sizeDetail.textContent = `Вес: ${Math.round((result.outputSize || 0) / 1024)} Кб`;
        
        const colorDetail = document.createElement('div');
        colorDetail.className = 'result-detail';
        colorDetail.textContent = `Цвета: ${result.colors || 'auto'}`;
        
        const durationDetail = document.createElement('div');
        durationDetail.className = 'result-detail';
        durationDetail.textContent = `Длительность: ${result.duration || 'auto'} сек`;
        
        details.appendChild(sizeDetail);
        details.appendChild(colorDetail);
        details.appendChild(durationDetail);
        
        info.appendChild(name);
        info.appendChild(details);
        
        resultCard.appendChild(preview);
        resultCard.appendChild(info);
        
        resultsGrid.appendChild(resultCard);
    });
}

// Функция генерации отчета
function generateReport(results, settings, sessionInfo) {
    const { sessionStart, sessionEnd, selectedDirectory } = sessionInfo;
    const duration = Math.round((sessionEnd - sessionStart) / 1000);
    const successfulConversions = results.filter(r => r.success).length;
    const totalInputFiles = results.reduce((sum, r) => sum + (r.inputFilesCount || 0), 0);
    const totalOutputSize = results.reduce((sum, r) => sum + (r.outputSize || 0), 0);
    
    let report = '';
    report += '╔══════════════════════════════════════════════════════════════════════════════╗\n';
    report += '║                            ОТЧЕТ О КОНВЕРТАЦИИ                              ║\n';
    report += '║                        PNG → GIF Конвертер                                  ║\n';
    report += '╚══════════════════════════════════════════════════════════════════════════════╝\n\n';
    
    report += '┌─ ИНФОРМАЦИЯ О СЕССИИ ────────────────────────────────────────────────────────┐\n';
    report += `│ 📅 Дата начала: ${sessionStart.toLocaleString()}\n`;
    report += `│ 🏁 Дата окончания: ${sessionEnd.toLocaleString()}\n`;
    report += `│ ⏱️  Продолжительность: ${duration} сек\n`;
    report += `│ 📁 Исходная папка: ${selectedDirectory}\n`;
    report += '└──────────────────────────────────────────────────────────────────────────────┘\n\n';
    
    report += '┌─ НАСТРОЙКИ КОНВЕРТАЦИИ ──────────────────────────────────────────────────────┐\n';
    report += `│ ⏰ Задержка между кадрами: ${settings.frameDelay} сек\n`;
    report += `│ 📏 Максимальный размер файла: ${settings.maxKb} КБ\n`;
    report += '└──────────────────────────────────────────────────────────────────────────────┘\n\n';
    
    report += '┌─ СТАТИСТИКА РЕЗУЛЬТАТОВ ─────────────────────────────────────────────────────┐\n';
    report += `│ 📊 Всего групп для обработки: ${Object.keys(groupedFiles || {}).length}\n`;
    report += `│ ✅ Успешно сконвертировано: ${successfulConversions}\n`;
    report += `│ 🖼️  Общее количество входных файлов: ${totalInputFiles}\n`;
    report += `│ 💽 Общий размер результатов: ${Math.round(totalOutputSize / 1024)} КБ\n`;
    report += '└──────────────────────────────────────────────────────────────────────────────┘\n\n';
    
    if (successfulConversions > 0) {
        report += '┌─ СГЕНЕРИРОВАННЫЕ GIF ФАЙЛЫ ──────────────────────────────────────────────────┐\n';
        results.filter(r => r.success).forEach((result, index) => {
            const prefix = index === successfulConversions - 1 ? '└─' : '├─';
            report += `│ ${prefix} 🎬 ${result.groupName}.gif\n`;
            report += `│ │  ├─ 💽 Размер файла: ${Math.round((result.outputSize || 0) / 1024)} КБ\n`;
            report += `│ │  ├─ 🖼️  Входных изображений: ${result.inputFilesCount || 0}\n`;
            if (index < successfulConversions - 1) {
                report += `│ │  └─ ⭐ Качество: Высокое\n│ │\n`;
            } else {
                report += `│ └─ ⭐ Качество: Высокое\n`;
            }
        });
        report += '└──────────────────────────────────────────────────────────────────────────────┘\n\n';
    }
    
    report += `📝 Отчет сгенерирован: ${new Date().toLocaleString()}\n`;
    report += `🔧 PNG → GIF Конвертер v2.0\n`;
    
    return report;
}

// Обработчики событий

// Выбор директории
selectDirectoryButton.addEventListener('click', async () => {
    try {
        console.log('[DIR] Открытие диалога выбора папки...');
        
        if (!window.electronAPI || !window.electronAPI.openDirectoryDialog) {
            showStatus('Ошибка: API недоступен', 'error');
            return;
        }
        
        const result = await window.electronAPI.openDirectoryDialog();
        
        if (result.canceled) {
            console.log('[DIR] Выбор папки отменен');
            return;
        }

        selectedDirectory = result.filePaths[0];
        console.log('[DIR] Выбрана папка:', selectedDirectory);

        // Группируем файлы
        console.log('[GROUP] Группировка PNG файлов...');
        const groupingResult = await window.electronAPI.groupPngFiles(selectedDirectory);
        
        if (!groupingResult.success) {
            showStatus(`Ошибка: ${groupingResult.error}`, 'error');
            return;
        }
        
        groupedFiles = groupingResult.groupedFiles;
        console.log('[GROUP] Найдено групп:', Object.keys(groupedFiles).length);
        
        updateUIAfterDirectorySelection();
        showStatus(`Папка выбрана. Найдено ${Object.keys(groupedFiles).length} групп файлов.`, 'success');
        
    } catch (error) {
        console.error('[DIR] Ошибка выбора директории:', error);
        showStatus(`Ошибка выбора папки: ${error.message}`, 'error');
    }
});

// Сброс настроек
resetSettingsBtn.addEventListener('click', () => {
    console.log('[RESET] Сброс настроек');
    
    frameDelayInput.value = defaultConfig.frameDelay;
    maxSizeInput.value = defaultConfig.maxKb;
    
    selectDirectoryButton.classList.remove('chosen');
    chooseSub.textContent = 'Выбери папку в которой есть изображения';
    groupsInfo.style.display = 'none';
    fileList.style.display = 'none';
    fileList.innerHTML = '';
    
    selectedDirectory = null;
    groupedFiles = {};
    conversionResults = [];
    
    updateConvertButtonState();
    showStatus('Настройки сброшены', 'info');
});

// Конвертация
convertButton.addEventListener('click', async () => {
    if (!selectedDirectory || Object.keys(groupedFiles).length === 0) {
        showStatus('Выберите папку с PNG файлами', 'error');
        return;
    }

    const frameDelay = parseFloat(frameDelayInput.value);
    const maxKb = parseInt(maxSizeInput.value);

    if (isNaN(frameDelay) || frameDelay <= 0) {
        showStatus('Введите корректную длину кадра', 'error');
        return;
    }
    
    if (isNaN(maxKb) || maxKb < 510) {
        showStatus('Минимальный вес должен быть не менее 510 Кб', 'error');
        return;
    }

    // Запускаем конвертацию
    console.log('[CONVERT] Начало конвертации');
    const sessionStart = new Date();
    
    convertButton.disabled = true;
    progressContainer.style.display = 'block';
    progressText.textContent = 'Подготовка к конвертации...';
    progressBar.style.width = '0%';

    try {
        const totalGroups = Object.keys(groupedFiles).length;
        let currentGroup = 0;

        const settings = { frameDelay, maxKb };
        
        // Имитируем процесс конвертации с прогрессом
        conversionResults = [];
        
        for (const [groupName, files] of Object.entries(groupedFiles)) {
            currentGroup++;
            const progressPercent = (currentGroup / totalGroups) * 100;
            
            progressBar.style.width = `${progressPercent}%`;
            progressText.textContent = `Конвертация группы ${currentGroup} из ${totalGroups}`;
            detailStatus.textContent = `Обработка: ${groupName}`;
            
            console.log(`[CONVERT] Группа ${currentGroup}/${totalGroups}: ${groupName}`);
            
            try {
                // Вызываем реальную конвертацию через electronAPI
                const result = await window.electronAPI.convertGroup({
                    groupName,
                    files,
                    settings,
                    outputDirectory: selectedDirectory
                });
                
                // Используем реальный результат от conversion service
                if (result.success) {
                    conversionResults.push({
                        success: true,
                        groupName,
                        outputSize: result.outputSize || 0,
                        inputFilesCount: result.inputFilesCount || files.length,
                        colors: result.colorCount || 'auto',
                        duration: result.duration || (files.length * frameDelay).toFixed(1),
                        gifPath: result.outputPath
                    });
                } else {
                    conversionResults.push({
                        success: false,
                        groupName,
                        error: result.error || 'Неизвестная ошибка конвертации'
                    });
                }
                
            } catch (error) {
                console.error(`[CONVERT] Ошибка конвертации группы ${groupName}:`, error);
                conversionResults.push({
                    success: false,
                    groupName,
                    error: error.message
                });
            }
            
            // Небольшая задержка для плавности анимации
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        const sessionEnd = new Date();
        
        // Генерируем отчет
        const reportContent = generateReport(conversionResults, settings, {
            sessionStart,
            sessionEnd,
            selectedDirectory
        });
        
        // Сохраняем отчет
        await window.electronAPI.saveReport(reportContent, sessionStart, selectedDirectory);
        
        // Переходим на страницу результатов
        mainPage.classList.remove('active');
        resultsPage.classList.add('active');
        displayResults();
        
        const successCount = conversionResults.filter(r => r.success).length;
        showStatus(`Конвертация завершена! Успешно: ${successCount} из ${totalGroups}`, 'success');
        
    } catch (error) {
        console.error('[CONVERT] Общая ошибка конвертации:', error);
        showStatus(`Ошибка конвертации: ${error.message}`, 'error');
    } finally {
        progressContainer.style.display = 'none';
        convertButton.disabled = false;
    }
});

// Открытие папки результатов
openOutputFolderBtn.addEventListener('click', async () => {
    try {
        if (selectedDirectory) {
            await window.electronAPI.openOutputFolder(selectedDirectory);
        } else {
            showStatus('Папка не выбрана', 'error');
        }
    } catch (error) {
        console.error('[FOLDER] Ошибка открытия папки:', error);
        showStatus(`Ошибка открытия папки: ${error.message}`, 'error');
    }
});

// Модальное окно помощи
groupsHelpButton.addEventListener('click', () => {
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

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    console.log('[INIT] Инициализация приложения');
    
    // Устанавливаем значения по умолчанию
    frameDelayInput.value = defaultConfig.frameDelay;
    maxSizeInput.value = defaultConfig.maxKb;
    
    updateConvertButtonState();
    
    console.log('[INIT] Приложение готово к работе');
});
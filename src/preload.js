// Исправленный preload.js с улучшенной обработкой ошибок

const { contextBridge, ipcRenderer } = require('electron');

// Логирование для диагностики
console.log('[PRELOAD] Загрузка preload.js...');

// Функция-обертка для безопасного вызова IPC
function safeIpcInvoke(channel, ...args) {
    return new Promise((resolve, reject) => {
        console.log(`[PRELOAD] IPC вызов: ${channel}`, args);
        
        // Таймаут для предотвращения зависания
        const timeout = setTimeout(() => {
            reject(new Error(`Таймаут IPC вызова: ${channel}`));
        }, 30000); // 30 секунд
        
        ipcRenderer.invoke(channel, ...args)
            .then(result => {
                clearTimeout(timeout);
                console.log(`[PRELOAD] IPC результат ${channel}:`, result);
                resolve(result);
            })
            .catch(error => {
                clearTimeout(timeout);
                console.error(`[PRELOAD] IPC ошибка ${channel}:`, error);
                reject(error);
            });
    });
}

// API объект для экспорта в renderer процесс
const electronAPI = {
    // Проверка доступности ImageMagick/gifski
    checkImageMagick: () => {
        console.log('[PRELOAD] Вызов checkImageMagick');
        return safeIpcInvoke('check-imagemagick');
    },
    
    // Выбор директории
    chooseDirectory: () => {
        console.log('[PRELOAD] Вызов chooseDirectory');
        return safeIpcInvoke('choose-directory');
    },
    
    // Получение списка PNG файлов
    getPngFiles: (directoryPath) => {
        console.log('[PRELOAD] Вызов getPngFiles с путем:', directoryPath);
        if (!directoryPath || typeof directoryPath !== 'string') {
            return Promise.reject(new Error('Неверный путь к директории'));
        }
        return safeIpcInvoke('get-png-files', directoryPath);
    },
    
    // Конвертация в GIF
    convertToGif: (options) => {
        console.log('[PRELOAD] Вызов convertToGif с опциями:', options);
        if (!options || typeof options !== 'object') {
            return Promise.reject(new Error('Неверные параметры конвертации'));
        }
        return safeIpcInvoke('convert-to-gif', options);
    },
    
    // Получение конфигурации
    getConfig: () => {
        console.log('[PRELOAD] Вызов getConfig');
        return safeIpcInvoke('get-config');
    },
    
    // Открытие папки в файловом менеджере
    openFolder: (path) => {
        console.log('[PRELOAD] Вызов openFolder с путем:', path);
        if (!path || typeof path !== 'string') {
            return Promise.reject(new Error('Неверный путь к папке'));
        }
        return safeIpcInvoke('open-folder', path);
    },
    
    // Методы для диагностики
    _diagnostics: {
        // Проверка связи с main процессом
        ping: () => {
            console.log('[PRELOAD] Диагностический ping');
            return safeIpcInvoke('ping').catch(() => 'pong'); // fallback
        },
        
        // Получение информации о среде выполнения
        getEnvInfo: () => {
            return {
                platform: process.platform,
                version: process.version,
                electronVersion: process.versions.electron,
                nodeVersion: process.versions.node,
                chromeVersion: process.versions.chrome
            };
        },
        
        // Проверка доступности ipcRenderer
        testIpc: () => {
            try {
                return !!ipcRenderer;
            } catch (error) {
                return false;
            }
        }
    }
};

// Проверяем доступность contextBridge
if (!contextBridge) {
    console.error('[PRELOAD] contextBridge недоступен!');
    throw new Error('contextBridge недоступен');
}

// Проверяем доступность ipcRenderer
if (!ipcRenderer) {
    console.error('[PRELOAD] ipcRenderer недоступен!');
    throw new Error('ipcRenderer недоступен');
}

try {
    // Экспортируем API в renderer процесс
    contextBridge.exposeInMainWorld('electronAPI', electronAPI);
    console.log('[PRELOAD] electronAPI успешно экспортирован в window.electronAPI');
    console.log('[PRELOAD] Доступные методы:', Object.keys(electronAPI));
    
    // Дополнительная диагностическая информация
    contextBridge.exposeInMainWorld('_preloadInfo', {
        loaded: true,
        timestamp: Date.now(),
        methods: Object.keys(electronAPI),
        platform: process.platform,
        versions: {
            electron: process.versions.electron,
            node: process.versions.node,
            chrome: process.versions.chrome
        }
    });
    
} catch (error) {
    console.error('[PRELOAD] Ошибка при экспорте API:', error);
    throw error;
}

// Обработчик событий для диагностики
ipcRenderer.on('main-ready', () => {
    console.log('[PRELOAD] Получен сигнал main-ready от main процесса');
});

// Глобальная обработка ошибок в preload
process.on('uncaughtException', (error) => {
    console.error('[PRELOAD] Необработанное исключение:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[PRELOAD] Необработанный rejection:', reason);
});

console.log('[PRELOAD] preload.js загружен успешно');
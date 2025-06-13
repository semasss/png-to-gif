# 🚀 Инструкция по исправлению ImageMagick в Electron для macOS ARM

## 📋 Что было исправлено:

### 1. **package.json**
- Добавлен `extraResources` для включения ImageMagick в финальную сборку
- Исправлена конфигурация для правильной архитектуры (arm64)
- Добавлены entitlements для обхода ограничений macOS
- Добавлен postinstall скрипт для автоматической настройки

### 2. **main.js**
- Исправлены пути для поиска ImageMagick в production режиме
- Добавлена установка переменной окружения DYLD_LIBRARY_PATH
- Улучшена диагностика и обработка ошибок
- Автоматическая установка прав на выполнение

### 3. **afterPack.js**
- Полностью переписан для корректной обработки библиотек
- Автоматическая проверка и исправление путей к dylib
- Обработка прав доступа для всех файлов
- Финальная проверка работоспособности

### 4. **entitlements.mac.plist**
- Необходимые разрешения для запуска внешних процессов
- Разрешение на использование динамических библиотек

### 5. **setup-imagemagick.js**
- Автоматическое копирование ImageMagick из Downloads
- Установка правильных прав доступа

## 🛠 Как применить изменения:

### Шаг 1: Резервная копия
```bash
cd /Users/tsekh/Documents/GitHub/png-to-gif
cp -r . ../png-to-gif-backup
```

### Шаг 2: Применение изменений
```bash
# Копируем исправленные файлы
cp /Users/tsekh/electron-imagemagick-fix/package.json ./package.json
cp /Users/tsekh/electron-imagemagick-fix/main.js ./src/main.js
cp /Users/tsekh/electron-imagemagick-fix/afterPack.js ./scripts/afterPack.js
cp /Users/tsekh/electron-imagemagick-fix/entitlements.mac.plist ./entitlements.mac.plist

# Создаём папку для скриптов если её нет
mkdir -p scripts
cp /Users/tsekh/electron-imagemagick-fix/setup-imagemagick.js ./scripts/setup-imagemagick.js
```

### Шаг 3: Установка зависимостей
```bash
# Удаляем старые node_modules и package-lock
rm -rf node_modules package-lock.json

# Устанавливаем заново (это также запустит setup-imagemagick.js)
npm install
```

### Шаг 4: Проверка
```bash
# Проверяем что ImageMagick скопирован
ls -la vendor/imagemagick/

# Тестируем в режиме разработки
npm start
```

### Шаг 5: Сборка
```bash
# Для локальной сборки без подписи
CSC_IDENTITY_AUTO_DISCOVERY=false npm run build-mac

# Или с подписью (если есть сертификат разработчика)
npm run build-mac
```

## 🔍 Диагностика проблем:

### Если ImageMagick не найден:
1. Убедитесь что Magick.app находится в /Users/tsekh/Downloads/
2. Запустите вручную: `node scripts/setup-imagemagick.js`

### Если ошибка при запуске:
1. Проверьте консоль разработчика (DevTools)
2. Посмотрите логи с префиксом [MAGICK_PATH] и [RUN_MAGICK]

### Если ошибка при сборке:
1. Проверьте логи с префиксом [afterPack]
2. Убедитесь что все файлы скопированы правильно

## 💡 Дополнительные советы:

1. **Для production**: Рекомендую получить сертификат разработчика Apple и правильно подписать приложение
2. **Размер приложения**: ImageMagick добавляет ~50MB к размеру приложения
3. **Альтернатива**: Можно использовать sharp вместо ImageMagick (он уже в зависимостях)

## 🎯 Результат:
После применения всех изменений, ImageMagick будет корректно встроен в Electron приложение и будет работать на macOS ARM без проблем.

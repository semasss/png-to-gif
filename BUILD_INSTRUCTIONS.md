# Инструкции по сборке PNG to GIF Converter

## Требования

- Node.js (версия 16 или выше)
- npm
- macOS (для сборки под macOS)

## Подготовка к сборке

1. Установите зависимости:
```bash
npm install
```

2. Убедитесь, что у вас есть нужные бинарные файлы в папке `vendor/`:
   - `vendor/gifski/gifski` - для конвертации в GIF
   - `vendor/gifsicle/gifsicle` - для оптимизации GIF

## Сборка

### Сборка для macOS (универсальная - ARM64 + x64)
```bash
npm run build-mac
```

### Сборка только для ARM64 (Apple Silicon)
```bash
npm run build-mac-arm
```

### Сборка только для x64 (Intel)
```bash
npm run build-mac-intel
```

### Сборка для Windows
```bash
npm run build-win
```

## Использование скриптов

Для удобства можно использовать готовые скрипты:

### macOS
```bash
chmod +x scripts/build-mac.sh
./scripts/build-mac.sh
```

### Windows
```cmd
scripts\build-win.bat
```

## Результаты сборки

Готовые файлы будут находиться в папке `dist/`:
- **macOS**: `PNG to GIF Converter-1.0.0.dmg`
- **Windows**: `PNG to GIF Converter 1.0.0.exe`

## Структура проекта

- `src/main/` - основной процесс Electron
- `src/renderer/` - интерфейс приложения
- `src/core/` - логика конвертации
- `src/preload/` - preload скрипт для безопасности
- `vendor/` - бинарные файлы (gifski, gifsicle)

## Возможные проблемы

### 1. Отсутствуют права на выполнение
```bash
chmod +x vendor/gifski/gifski
chmod +x vendor/gifsicle/gifsicle
```

### 2. Ошибка при сборке под macOS
Убедитесь, что у вас установлены Xcode Command Line Tools:
```bash
xcode-select --install
```

### 3. Ошибки с зависимостями
Попробуйте очистить node_modules и переустановить:
```bash
rm -rf node_modules package-lock.json
npm install
```

## Конфигурация сборки

Настройки сборки находятся в `package.json` в секции `build`. Здесь можно изменить:
- Название приложения
- Иконку
- Файлы для включения в сборку
- Целевые платформы

## Тестирование

Перед сборкой рекомендуется протестировать приложение в режиме разработки:
```bash
npm run dev
```
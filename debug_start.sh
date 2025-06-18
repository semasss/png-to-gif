#!/bin/bash

echo "🔧 Диагностика проблемы с кнопкой выбора папки"
echo "=============================================="

# Переходим в директорию проекта
cd "/Users/tsekh/Documents/GitHub/png-to-gif"

echo "📁 Текущая директория: $(pwd)"

# Проверяем структуру файлов
echo ""
echo "📋 Проверка файлов:"
echo "✅ Основные файлы:"
ls -la src/ | grep -E "(main.js|renderer.js|preload.js|index.html)"

echo ""
echo "🔍 Проверка зависимостей:"
if command -v npm &> /dev/null; then
    echo "✅ npm установлен"
else
    echo "❌ npm не найден"
    exit 1
fi

if command -v electron &> /dev/null; then
    echo "✅ electron доступен глобально"
else
    echo "⚠️  electron не найден глобально, проверяем локально..."
fi

echo ""
echo "🎯 Проверка gifski:"
if command -v gifski &> /dev/null; then
    echo "✅ gifski найден: $(which gifski)"
    gifski --version
else
    echo "❌ gifski не найден! Установите его: brew install gifski"
fi

echo ""
echo "🚀 Запуск приложения с диагностикой..."
echo "Следите за логами в терминале!"
echo "Откроется окно с DevTools для дополнительной диагностики"
echo ""

# Запускаем приложение
npm start

echo ""
echo "📋 После запуска:"
echo "1. Откройте DevTools (F12) если они не открылись автоматически"
echo "2. Перейдите в Console"
echo "3. Проверьте наличие ошибок"
echo "4. Попробуйте кликнуть по кнопке 'Выбор папки'"
echo "5. Следите за логами в этом терминале и в DevTools"
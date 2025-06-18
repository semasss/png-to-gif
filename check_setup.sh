#!/bin/bash

# Простая диагностика без запуска приложения
echo "🔧 Быстрая диагностика PNG-to-GIF конвертера"
echo "============================================="

cd "/Users/tsekh/Documents/GitHub/png-to-gif"

echo "📁 Директория проекта: $(pwd)"

echo ""
echo "📋 Проверка ключевых файлов:"
files=("src/main.js" "src/renderer.js" "src/preload.js" "src/index.html" "package.json")
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file (размер: $(stat -f%z "$file") байт)"
    else
        echo "❌ $file - НЕ НАЙДЕН!"
    fi
done

echo ""
echo "🔍 Проверка зависимостей:"
if [ -d "node_modules" ]; then
    echo "✅ node_modules существует"
    if [ -f "node_modules/.bin/electron" ]; then
        echo "✅ electron установлен локально"
    else
        echo "❌ electron не найден в node_modules"
    fi
else
    echo "❌ node_modules не найден! Выполните: npm install"
fi

echo ""
echo "🎯 Проверка gifski:"
if command -v gifski &> /dev/null; then
    echo "✅ gifski найден: $(which gifski)"
    echo "   Версия: $(gifski --version 2>/dev/null || echo 'не удалось определить')"
else
    echo "❌ gifski НЕ НАЙДЕН!"
    echo "   Установите его: brew install gifski"
fi

echo ""
echo "📝 Содержимое начала main.js:"
echo "----------------------------"
head -15 src/main.js

echo ""
echo "📝 Содержимое начала renderer.js:"
echo "---------------------------------"
head -15 src/renderer.js

echo ""
echo "📝 Содержимое начала preload.js:"
echo "--------------------------------"
head -15 src/preload.js

echo ""
echo "🏁 Диагностика завершена!"
echo ""
echo "Для запуска приложения выполните:"
echo "  cd $(pwd)"
echo "  npm start"
echo ""
echo "Если есть проблемы:"
echo "1. Установите gifski: brew install gifski"
echo "2. Установите зависимости: npm install"
echo "3. Запустите: npm start"
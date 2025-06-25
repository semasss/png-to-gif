#!/bin/bash

# Быстрая сборка ЖИФ для macOS
# Собирает React и сразу делает macOS билд

set -e

echo "🚀 Начинаем быструю сборку ЖИФ для macOS..."

# Шаг 1: Собираем React приложение
echo "📦 Сборка React приложения..."
npm run build:react

# Шаг 2: Копируем в renderer директорию
echo "📁 Обновляем renderer директорию..."
rm -rf src/renderer
mkdir -p src/renderer
cp -r dist/react/* src/renderer/

# Шаг 3: Собираем macOS приложение
echo "🍎 Сборка macOS приложения (x64 + ARM64)..."
npm run build-mac

# Шаг 4: Показываем результат
echo "✅ Сборка завершена!"
echo ""
echo "📦 Созданные файлы:"
ls -la dist/*.dmg

echo ""
echo "🎉 Готово! Файлы находятся в папке dist/"
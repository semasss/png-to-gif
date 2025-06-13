#!/bin/bash

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Применение исправлений ImageMagick для Electron${NC}"
echo ""

# Проверяем что мы в правильной директории
PROJECT_DIR="/Users/tsekh/Documents/GitHub/png-to-gif"
FIX_DIR="/Users/tsekh/electron-imagemagick-fix"

if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${RED}❌ Ошибка: Директория проекта не найдена: $PROJECT_DIR${NC}"
    exit 1
fi

cd "$PROJECT_DIR"

# Создаём резервную копию
echo -e "${YELLOW}📦 Создание резервной копии...${NC}"
BACKUP_DIR="../png-to-gif-backup-$(date +%Y%m%d-%H%M%S)"
cp -r . "$BACKUP_DIR"
echo -e "${GREEN}✅ Резервная копия создана: $BACKUP_DIR${NC}"

# Копируем файлы
echo -e "${YELLOW}📋 Копирование исправленных файлов...${NC}"

# package.json
cp "$FIX_DIR/package.json" ./package.json
echo "  ✓ package.json"

# main.js
cp "$FIX_DIR/main.js" ./src/main.js
echo "  ✓ src/main.js"

# scripts
mkdir -p scripts
cp "$FIX_DIR/afterPack.js" ./scripts/afterPack.js
cp "$FIX_DIR/setup-imagemagick.js" ./scripts/setup-imagemagick.js
echo "  ✓ scripts/afterPack.js"
echo "  ✓ scripts/setup-imagemagick.js"

# entitlements
cp "$FIX_DIR/entitlements.mac.plist" ./entitlements.mac.plist
echo "  ✓ entitlements.mac.plist"

# Удаляем старые зависимости
echo -e "${YELLOW}🗑  Очистка старых зависимостей...${NC}"
rm -rf node_modules package-lock.json
echo -e "${GREEN}✅ Очистка завершена${NC}"

# Устанавливаем зависимости
echo -e "${YELLOW}📦 Установка зависимостей...${NC}"
npm install

# Проверяем установку ImageMagick
if [ -d "vendor/imagemagick" ] && [ -f "vendor/imagemagick/magick" ]; then
    echo -e "${GREEN}✅ ImageMagick успешно установлен!${NC}"
    echo ""
    echo -e "${GREEN}🎉 Все исправления применены!${NC}"
    echo ""
    echo "Следующие шаги:"
    echo "1. Протестируйте приложение: npm start"
    echo "2. Соберите приложение: CSC_IDENTITY_AUTO_DISCOVERY=false npm run build-mac"
else
    echo -e "${RED}❌ ImageMagick не установлен${NC}"
    echo "Запустите вручную: node scripts/setup-imagemagick.js"
fi

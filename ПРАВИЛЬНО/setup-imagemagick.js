const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Setting up ImageMagick for the project...');

const projectRoot = path.join(__dirname, '..');
const vendorDir = path.join(projectRoot, 'vendor');
const imagemagickDir = path.join(vendorDir, 'imagemagick');

// Создаём директории если их нет
if (!fs.existsSync(vendorDir)) {
    fs.mkdirSync(vendorDir, { recursive: true });
}

// Проверяем есть ли уже ImageMagick
if (fs.existsSync(imagemagickDir) && fs.existsSync(path.join(imagemagickDir, 'magick'))) {
    console.log('ImageMagick already set up in vendor directory');
    
    // Проверяем права на выполнение
    try {
        fs.chmodSync(path.join(imagemagickDir, 'magick'), 0o755);
        const libs = fs.readdirSync(path.join(imagemagickDir, 'libs')).filter(f => f.endsWith('.dylib'));
        libs.forEach(lib => {
            fs.chmodSync(path.join(imagemagickDir, 'libs', lib), 0o755);
        });
        console.log('Execution permissions set');
    } catch (e) {
        console.error('Could not set permissions:', e.message);
    }
    
    process.exit(0);
}

// Ищем Magick.app в стандартных местах
const possibleLocations = [
    '/Users/tsekh/Downloads/Magick.app',
    path.join(process.env.HOME, 'Downloads/Magick.app'),
    path.join(process.env.HOME, 'Downloads/ImageMagick.app'),
    '/Applications/Magick.app',
    '/Applications/ImageMagick.app'
];

let sourcePath = null;
for (const location of possibleLocations) {
    if (fs.existsSync(location)) {
        sourcePath = location;
        console.log(`Found ImageMagick at: ${location}`);
        break;
    }
}

if (!sourcePath) {
    console.error('\n❌ ERROR: ImageMagick not found!');
    console.error('\nPlease download ImageMagick and place it in one of these locations:');
    possibleLocations.forEach(loc => console.error(`  - ${loc}`));
    console.error('\nYou can download it from: https://imagemagick.org/script/download.php#macosx');
    process.exit(1);
}

// Копируем ImageMagick в vendor
console.log('Copying ImageMagick to vendor directory...');

try {
    // Создаём директорию imagemagick
    if (!fs.existsSync(imagemagickDir)) {
        fs.mkdirSync(imagemagickDir, { recursive: true });
    }

    // Копируем бинарник
    const sourceBin = path.join(sourcePath, 'Contents/MacOS/magick');
    const destBin = path.join(imagemagickDir, 'magick');
    fs.copyFileSync(sourceBin, destBin);
    fs.chmodSync(destBin, 0o755);
    
    // Копируем библиотеки
    const sourceLibs = path.join(sourcePath, 'Contents/libs');
    const destLibs = path.join(imagemagickDir, 'libs');
    
    if (!fs.existsSync(destLibs)) {
        fs.mkdirSync(destLibs, { recursive: true });
    }
    
    const libs = fs.readdirSync(sourceLibs);
    libs.forEach(lib => {
        const sourceLib = path.join(sourceLibs, lib);
        const destLib = path.join(destLibs, lib);
        fs.copyFileSync(sourceLib, destLib);
        fs.chmodSync(destLib, 0o755);
    });
    
    console.log(`✅ ImageMagick successfully set up!`);
    console.log(`   Binary: ${destBin}`);
    console.log(`   Libraries: ${libs.length} files copied to ${destLibs}`);
    
} catch (error) {
    console.error('❌ Error setting up ImageMagick:', error.message);
    process.exit(1);
}

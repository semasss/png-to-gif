const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// Helper to run commands and log them
function run(command, timeout = 30000) { // 30 секунд по умолчанию
  console.log(`[afterPack] Executing: ${command}`);
  
  // Используем spawnSync для лучшего контроля, особенно для таймаутов
  const [cmd, ...args] = command.split(' ');
  const result = spawnSync(cmd, args, { 
    stdio: 'pipe', 
    encoding: 'utf-8', 
    timeout: timeout,
    shell: true // Важно для команд с кавычками и путями
  });

  if (result.status === 0) {
    return result.stdout.trim();
  } else {
    const error = result.error || new Error(`Command failed with status ${result.status}`);
    const stderr = result.stderr ? result.stderr.trim() : '(no stderr)';
    console.error(`[afterPack] Command failed: ${command}`);
    console.error(`[afterPack] stderr: ${stderr}`);
    console.error(`[afterPack] error:`, error.message);

    if (result.signal) {
      console.error(`[afterPack] Command was killed with signal: ${result.signal}`);
    }

    throw error;
  }
}

exports.default = async function(context) {
  const { appOutDir, packager, electronPlatformName } = context;
  
  // Обрабатываем только macOS
  if (electronPlatformName !== 'darwin') {
    console.log('[afterPack] Skipping non-macOS platform');
    return;
  }
  
  console.log('[afterPack] Starting post-processing for macOS build...');

  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(appOutDir, `${appName}.app`);
  const resourcesPath = path.join(appPath, 'Contents', 'Resources');
  const imagemagickPath = path.join(resourcesPath, 'imagemagick');
  const magickBin = path.join(imagemagickPath, 'magick');
  const libsDir = path.join(imagemagickPath, 'libs');
  
  console.log(`[afterPack] App path: ${appPath}`);
  console.log(`[afterPack] ImageMagick path: ${imagemagickPath}`);
  
  if (!fs.existsSync(magickBin)) {
    console.error(`[afterPack] ERROR: magick binary not found at ${magickBin}`);
    console.error(`[afterPack] Contents of resources directory:`);
    try {
      const contents = fs.readdirSync(resourcesPath);
      console.error(`[afterPack]   ${contents.join(', ')}`);
    } catch (e) {
      console.error(`[afterPack]   Could not list directory: ${e.message}`);
    }
    return;
  }

  if (!fs.existsSync(libsDir)) {
    console.error(`[afterPack] ERROR: libs directory not found at ${libsDir}`);
    return;
  }

  // 1. Делаем бинарник исполняемым
  console.log(`[afterPack] Making magick binary executable...`);
  fs.chmodSync(magickBin, 0o755);
  
  // 2. Делаем все библиотеки исполняемыми
  const libs = fs.readdirSync(libsDir).filter(f => f.endsWith('.dylib'));
  console.log(`[afterPack] Found ${libs.length} libraries to process`);
  
  libs.forEach(lib => {
    const libPath = path.join(libsDir, lib);
    fs.chmodSync(libPath, 0o755);
  });

  // 3. Проверяем текущие пути в бинарнике
  console.log(`[afterPack] Checking current library paths in magick binary...`);
  const otoolOutput = run(`otool -L "${magickBin}"`);
  console.log(`[afterPack] Current paths:\n${otoolOutput}`);

  // 4. Исправляем пути. Убираем проверку и делаем это принудительно.
  console.log(`[afterPack] Forcing library path correction...`);
  
  // Добавляем rpath если его нет
  try {
    run(`install_name_tool -add_rpath "@executable_path/../libs" "${magickBin}"`);
    console.log(`[afterPack] Added @rpath to magick binary`);
  } catch (e) {
    // Rpath уже может существовать, это нормально
    console.log(`[afterPack] Note: rpath might already exist (this is OK)`);
  }

  // Исправляем пути для всех библиотек
  const allBinaries = [magickBin, ...libs.map(f => path.join(libsDir, f))];

  for (const binary of allBinaries) {
    const binaryName = path.basename(binary);
    console.log(`[afterPack] Processing: ${binaryName}`);
    
    // Получаем зависимости
    const dependencies = run(`otool -L "${binary}"`)
      .split('\n')
      .slice(1)
      .map(line => line.trim().split(' ')[0])
      .filter(dep => dep && !dep.startsWith('/System/') && !dep.startsWith('/usr/lib/'));

    for (const dep of dependencies) {
      const depName = path.basename(dep);
      
      // Если это одна из наших библиотек
      if (libs.includes(depName)) {
        const newPath = `@rpath/${depName}`; // Используем @rpath
        try {
          run(`install_name_tool -change "${dep}" "${newPath}" "${binary}"`);
          console.log(`[afterPack]   Changed in ${binaryName}: ${dep} -> ${newPath}`);
        } catch (e) {
          console.error(`[afterPack]   Failed to change path: ${e.message}`);
        }
      }
    }

    // Также нужно исправить ID самой библиотеки
    if (libs.includes(binaryName)) {
      const newId = `@rpath/${binaryName}`;
      try {
        run(`install_name_tool -id "${newId}" "${binary}"`);
        console.log(`[afterPack]   Updated self-ID for ${binaryName} to ${newId}`);
      } catch (e) {
        // Иногда ID менять не нужно или нельзя
         console.log(`[afterPack]   Note: Could not update self-ID for ${binaryName}`);
      }
    }
  }

  // 5. Удаляем подпись если она есть (для локальной разработки)
  if (process.env.CSC_IDENTITY_AUTO_DISCOVERY === 'false') {
    console.log(`[afterPack] Removing code signatures for local development...`);
    try {
      run(`codesign --remove-signature "${magickBin}"`);
      libs.forEach(lib => {
        run(`codesign --remove-signature "${path.join(libsDir, lib)}"`);
      });
      console.log(`[afterPack] Code signatures removed`);
    } catch (e) {
      console.log(`[afterPack] Note: Could not remove signatures (they might not exist)`);
    }
  }

  console.log('[afterPack] Post-processing completed');
}; 
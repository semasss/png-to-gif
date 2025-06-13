const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Helper to run commands and log them
function run(command) {
  console.log(`[exec] ${command}`);
  try {
    return execSync(command, { stdio: 'pipe' }).toString().trim();
  } catch (e) {
    console.error(`[exec] FAILED: ${command}`);
    const stderr = e.stderr ? e.stderr.toString().trim() : '(no stderr)';
    console.error(`[exec] stderr: ${stderr}`);
    throw e; // re-throw the error to stop the build process
  }
}

exports.default = async function(context) {
  const { appOutDir, packager } = context;
  if (packager.platform.name !== 'mac') {
    return;
  }
  
  console.log('[afterPack] Starting dylib rewrite process for embedded ImageMagick...');

  const appName = context.packager.appInfo.productFilename;
  const magickBasePath = path.join(appOutDir, `${appName}.app`, 'Contents', 'Resources', 'vendor', 'imagemagick');
  const magickBin = path.join(magickBasePath, 'magick');
  const libsDir = path.join(magickBasePath, 'libs');
  
  if (!fs.existsSync(magickBin) || !fs.existsSync(libsDir)) {
    console.error(`[afterPack] FATAL: magick binary or libs directory not found. Searched in: ${magickBasePath}`);
    return;
  }

  // 1. Set +x on the main binary
  console.log(`[afterPack] Making magick binary executable...`);
  fs.chmodSync(magickBin, 0o755);
  
  // 2. Add an rpath to the main executable so it knows to look for dylibs in its own libs folder
  console.log(`[afterPack] Adding @rpath to magick binary...`);
  run(`install_name_tool -add_rpath "@executable_path/../libs" "${magickBin}"`);

  const bundledLibs = fs.readdirSync(libsDir).filter(f => f.endsWith('.dylib'));
  const allBinaries = [magickBin, ...bundledLibs.map(f => path.join(libsDir, f))];

  for (const binary of allBinaries) {
    const binaryName = path.basename(binary);
    console.log(`[afterPack] Processing: ${binaryName}`);
    
    // Get all library dependencies
    const dependencies = (run(`otool -L "${binary}"`) || '')
      .split('\n')
      .slice(1)
      .map(line => line.trim().split(' ')[0])
      .filter(dep => !dep.startsWith('/System/Library')); // Exclude system libraries

    for (const dep of dependencies) {
      const depName = path.basename(dep);
      
      // If the dependency is one of our bundled libraries...
      if (bundledLibs.includes(depName)) {
        const newPath = `@rpath/${depName}`;
        console.log(`[afterPack]   Rewriting "${dep}" to "${newPath}" in "${binaryName}"`);
        run(`install_name_tool -change "${dep}" "${newPath}" "${binary}"`);
      }
    }
    
    // Also update the library's own ID if it has one
    if (dependencies.includes(binaryName)) {
        const newIdPath = `@rpath/${binaryName}`;
        console.log(`[afterPack]   Updating self-ID for "${binaryName}" to "${newIdPath}"`);
        run(`install_name_tool -id "${newIdPath}" "${binary}"`);
    }
  }

  console.log('[afterPack] Dylib rewrite process completed successfully.');
}; 
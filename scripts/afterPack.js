const fs = require('fs');
const path = require('path');

exports.default = async function(context) {
  const { appOutDir, electronPlatformName } = context;
  
  if (electronPlatformName !== 'darwin' && electronPlatformName !== 'linux') {
    console.log('[afterPack] Skipping non-macOS/linux platform');
    return;
  }
  
  console.log('[afterPack] Setting executable permissions for tools...');

  const appName = context.packager.appInfo.productFilename;
  const resourcesPath = path.join(appOutDir, `${appName}.app`, 'Contents', 'Resources');
  
  const tools = ['gifski', 'gifsicle'];

  tools.forEach(toolName => {
    const toolPath = path.join(resourcesPath, toolName);
    if (fs.existsSync(toolPath)) {
      console.log(`[afterPack] Setting +x for ${toolName}`);
      fs.chmodSync(toolPath, 0o755);
    } else {
      console.warn(`[afterPack] Tool not found, skipping: ${toolPath}`);
    }
  });

  console.log('[afterPack] Post-processing completed.');
}; 
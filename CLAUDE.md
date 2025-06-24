# CLAUDE.md

Язык общения и комментирования: исключительно русский

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a cross-platform Electron application that converts PNG image sequences to GIF files. It provides a desktop GUI for batch processing PNG files with size optimization and quality control.

## Key Commands

### Development
- `npm start` or `npm run dev` - Start the Electron app in development mode
- `npm run build` - Build app for current platform
- `npm run build-win` - Build Windows executable
- `npm run build-mac` - Build macOS DMG (ARM64)
- `npm run postinstall` - Setup ImageMagick dependencies (runs automatically)

### Platform-specific execution
- **macOS**: `./scripts/run.sh` (make executable first: `chmod +x scripts/run.sh`)
- **Windows**: `scripts/run.bat`

### Build scripts
- **macOS**: `./scripts/build-mac.sh`
- **Windows**: `scripts/build-win.bat`

## Architecture

### Core Components

**Main Process** (`src/main/main.js`):
- Handles Electron app lifecycle and window management
- IPC handlers for file operations, conversion coordination, and reporting
- Manages conversion sessions with progress tracking
- Generates detailed conversion reports in Russian language

**Conversion Service** (`src/core/conversion-service.js`):
- Core business logic for PNG to GIF conversion
- Uses external tools: `gifski` (primary conversion) and `gifsicle/giflossy` (optimization)
- Implements binary search for optimal quality/size balance
- Handles image normalization and frame synchronization
- Tool discovery: checks system PATH, then falls back to bundled binaries

**Preload Script** (`src/preload/preload.js`):
- Secure bridge between main and renderer processes
- Exposes conversion APIs with error handling and timeouts
- Includes diagnostic methods for troubleshooting

**Renderer Process** (`src/renderer/renderer.js`):
- User interface logic and event handling
- Progress tracking and results display
- File grouping and batch conversion coordination

### File Processing Logic

The app groups PNG files by base name (removing numeric suffixes) and converts each group into a separate GIF:
- `image_01.png`, `image_02.png` → `image.gif`
- Files are sorted numerically for proper frame sequence
- Each group is processed with consistent dimensions (resized to match first frame)

### External Tool Dependencies

- **gifski**: High-quality GIF creation with motion interpolation
- **gifsicle/giflossy**: GIF optimization and frame timing adjustment
- Tools are bundled in `vendor/` directory for distribution
- Development mode can use system-installed versions

### Build Configuration

The app uses electron-builder with:
- **macOS**: DMG distribution with ARM64/x64 universal support
- **Windows**: Portable executable
- **Resources**: Bundles gifski/gifsicle binaries via `extraResources`
- **Security**: Hardened runtime and entitlements for macOS

## Important Notes

- Interface language is Russian
- Configuration stored in `src/main/config.json` and `src/config.json`
- Reports generated with detailed logging and session summaries
- No test framework configured - testing relies on manual verification
- Development uses `electron-is-dev` to distinguish dev/production modes
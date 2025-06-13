#!/bin/bash

# Exit on error
set -e

echo "Building ЖИФ for macOS..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Build the app
echo "Building the app..."
npm run build-mac

echo "Build complete! You can find the DMG file in the dist folder."
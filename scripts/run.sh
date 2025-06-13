#!/bin/bash

# Exit on error
set -e

echo "Setting up ЖИФ..."
cd "$(dirname "$0")"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed."
    echo "Please install Node.js from https://nodejs.org/ and try again."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d 'v' -f 2)
NODE_MAJOR_VERSION=$(echo $NODE_VERSION | cut -d '.' -f 1)

if [ $NODE_MAJOR_VERSION -gt 18 ]; then
    echo "WARNING: You're using Node.js v$NODE_VERSION, which is quite new."
    echo "Some dependencies might have compatibility issues with Node.js versions above 18."
    echo "If you encounter problems, consider downgrading to Node.js v18.x LTS."
    echo "Continuing anyway..."
    echo ""
fi

# Clean existing installation if present
if [ -d "node_modules" ]; then
    echo "Cleaning existing node_modules directory..."
    rm -rf node_modules
fi

if [ -f "package-lock.json" ]; then
    echo "Removing package-lock.json..."
    rm package-lock.json
fi

# Install dependencies
echo "Installing dependencies..."
npm install --no-optional

# Run the app
echo "Starting the app..."
npm start
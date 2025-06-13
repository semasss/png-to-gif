const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  chooseDirectory: () => ipcRenderer.invoke('choose-directory'),
  getPngFiles: (directoryPath) => ipcRenderer.invoke('get-png-files', directoryPath),
  convertToGif: (options) => ipcRenderer.invoke('convert-to-gif', options)
});
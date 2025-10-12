const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  openDirectory: (defaultPath) => ipcRenderer.invoke('dialog:openDirectory', defaultPath),
  readDirectory: (directoryPath) => ipcRenderer.invoke('fs:readDirectory', directoryPath),
  readFile: (filePath) => ipcRenderer.invoke('fs:readFile', filePath),
  applyChanges: (filePath, partKey, pendingChanges) =>
    ipcRenderer.invoke('jbeam:applyChanges', { filePath, partKey, pendingChanges }),
  writeFile: (filePath, contents) => ipcRenderer.invoke('fs:writeFile', filePath, contents),
  checkForUpdate: () => ipcRenderer.invoke('check-for-update'),
  applyEnhancedAudio: (engineFilePath) => ipcRenderer.invoke('audio:applyEnhanced', engineFilePath),
  applyStockAudio: (engineFilePath) => ipcRenderer.invoke('audio:applyStock', engineFilePath),
  detectAudioState: (engineFilePath) => ipcRenderer.invoke('audio:detectState', engineFilePath),
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
});

contextBridge.exposeInMainWorld('presets', {
  list:       () => ipcRenderer.invoke('presets:list'),
  load:       (which,name) => ipcRenderer.invoke('presets:load', which, name),
  save:       (data)       => ipcRenderer.invoke('presets:save', data),
  openFolder: () => ipcRenderer.invoke('presets:openFolder'),
  pick:       (which)        => ipcRenderer.invoke('presets:pick', which),
});

contextBridge.exposeInMainWorld('settings', {
  get:    () => ipcRenderer.invoke('settings:get'),
  set:    (settingsObj) => ipcRenderer.invoke('settings:set', settingsObj),
});

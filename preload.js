const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  loadData: () => ipcRenderer.invoke('load-data'),
  saveData: (data) => ipcRenderer.invoke('save-data', data),
  showNotification: (title, body) => ipcRenderer.invoke('show-notification', { title, body }),
  platform: process.platform
})

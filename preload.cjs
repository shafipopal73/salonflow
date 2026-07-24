const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('salonflowDesktop', {
  showNotification(notification) {
    ipcRenderer.send('show-notification', notification);
  }
});
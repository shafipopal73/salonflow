import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('salonflowDesktop', {
  showNotification: (notification) => {
    ipcRenderer.send('show-notification', notification);
  }
});

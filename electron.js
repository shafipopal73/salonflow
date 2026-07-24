import {
  app,
  BrowserWindow,
  shell,
  ipcMain,
  Notification,
  Tray,
  Menu
} from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDevelopment = !app.isPackaged;
if (process.platform === 'win32') {
  app.setAppUserModelId('live.salonflow.app');
}
let mainWindow;
let tray;
let isQuitting = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 650,
    title: 'SalonFlow',
    icon: path.join(__dirname, 'build', 'icon.png'),
    backgroundColor: '#0f172a',
    autoHideMenuBar: true,
    webPreferences: {
    preload: path.join(__dirname, 'preload.cjs'),
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true
}
  });

  if (isDevelopment) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}
ipcMain.on('show-notification', (_event, notificationData) => {
  if (!Notification.isSupported()) {
    console.log('System notifications are not supported.');
    return;
  }

  const title = notificationData?.title || 'SalonFlow';
  const body = notificationData?.body || 'You have a new notification.';

  const notification = new Notification({
    title,
    body,
    silent: false
  });

  notification.on('click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  notification.show();
});
app.whenReady().then(() => {
  createWindow();
setTimeout(() => {
  const testNotification = new Notification({
    title: 'SalonFlow',
    body: 'Desktop notifications are working.'
  });

  testNotification.on('show', () => {
    console.log('Notification displayed successfully.');
  });

  testNotification.on('failed', (_event, error) => {
    console.error('Notification failed:', error);
  });

  testNotification.show();
}, 3000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
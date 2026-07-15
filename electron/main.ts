import { app, BrowserWindow, globalShortcut, ipcMain, Menu, nativeImage, Notification, shell, Tray, screen } from 'electron'
import { join } from 'path'

declare module 'electron' { interface App { isQuitting?: boolean } }

const isDev = process.env.NODE_ENV === 'development'
const DEV_URL = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173'

let mainWindow: BrowserWindow | null = null
let captureWindow: BrowserWindow | null = null
let companionWindow: BrowserWindow | null = null
let tray: Tray | null = null
let companionPos = { x: 40, y: 40 }
let companionVisible = false

// ── helpers ──────────────────────────────────────────────────────────────────
const preload = () => join(__dirname, 'preload.js')
const appUrl  = (hash = '') => isDev ? `${DEV_URL}${hash}` : `file://${join(__dirname, '../dist/index.html')}${hash}`

// ── main window ──────────────────────────────────────────────────────────────
function createMain() {
  mainWindow = new BrowserWindow({
    width: 1200, height: 760, minWidth: 860, minHeight: 580,
    frame: false, backgroundColor: '#0b0b0c',
    webPreferences: { preload: preload(), contextIsolation: true, nodeIntegration: false },
    show: false,
  })
  mainWindow.loadURL(appUrl())
  mainWindow.once('ready-to-show', () => mainWindow?.show())
  mainWindow.on('close', e => { if (!app.isQuitting) { e.preventDefault(); mainWindow?.hide() } })
  if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' })
}

// ── capture overlay ──────────────────────────────────────────────────────────
function showCapture() {
  if (captureWindow && !captureWindow.isDestroyed()) {
    captureWindow.show(); captureWindow.focus()
    captureWindow.webContents.send('capture:focus')
    return
  }
  const { width, height } = screen.getPrimaryDisplay().workAreaSize
  captureWindow = new BrowserWindow({
    width: 580, height: 88,
    x: Math.round(width / 2 - 290), y: Math.round(height * 0.32),
    frame: false, alwaysOnTop: true, resizable: false,
    skipTaskbar: true, backgroundColor: '#1b1b1d',
    webPreferences: { preload: preload(), contextIsolation: true, nodeIntegration: false },
    show: false,
  })
  captureWindow.loadURL(appUrl('#/capture'))
  captureWindow.once('ready-to-show', () => { captureWindow?.show(); captureWindow?.focus() })
  captureWindow.on('blur', () => captureWindow?.hide())
  captureWindow.on('closed', () => { captureWindow = null })
}

function hideCapture() { captureWindow?.hide() }

// ── companion widget ─────────────────────────────────────────────────────────
function createCompanion() {
  companionWindow = new BrowserWindow({
    width: 230, height: 280,
    x: companionPos.x, y: companionPos.y,
    frame: false, alwaysOnTop: true, resizable: false,
    backgroundColor: '#131314',
    webPreferences: { preload: preload(), contextIsolation: true, nodeIntegration: false },
    show: false,
  })
  companionWindow.loadURL(appUrl('#/companion'))
  companionWindow.on('moved', () => {
    if (companionWindow) {
      const [x, y] = companionWindow.getPosition()
      companionPos = { x, y }
    }
  })
  companionWindow.on('closed', () => { companionWindow = null; companionVisible = false })
}

function toggleCompanion() {
  if (!companionWindow || companionWindow.isDestroyed()) {
    createCompanion(); companionWindow?.show(); companionVisible = true
  } else if (companionVisible) {
    companionWindow.hide(); companionVisible = false
  } else {
    companionWindow.show(); companionVisible = true
  }
}

// ── tray ─────────────────────────────────────────────────────────────────────
function createTray() {
  const img = nativeImage.createEmpty()
  tray = new Tray(img)
  tray.setToolTip('Flow')
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open Flow',      click: () => { mainWindow?.show(); mainWindow?.focus() } },
    { label: 'Quick Capture',  click: () => showCapture() },
    { label: 'Companion',      click: () => toggleCompanion() },
    { type: 'separator' },
    { label: 'Quit',           click: () => { app.isQuitting = true; app.quit() } },
  ]))
  tray.on('double-click', () => { mainWindow?.show(); mainWindow?.focus() })
}

// ── ipc ───────────────────────────────────────────────────────────────────────
function setupIPC() {
  ipcMain.on('win:minimize',  () => mainWindow?.minimize())
  ipcMain.on('win:maximize',  () => mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow?.maximize())
  ipcMain.on('win:close',     () => mainWindow?.hide())

  ipcMain.on('capture:open',  () => showCapture())
  ipcMain.on('capture:close', () => hideCapture())
  ipcMain.on('capture:saved', () => {
    hideCapture()
    mainWindow?.webContents.send('db:refresh')
    companionWindow?.webContents.send('db:refresh')
  })

  ipcMain.on('companion:toggle', () => toggleCompanion())

  ipcMain.on('db:changed', () => {
    mainWindow?.webContents.send('db:refresh')
    companionWindow?.webContents.send('db:refresh')
  })

  ipcMain.on('notify', (_e, { title, body, style }) => {
    // Desktop has no vibration motor: map 'vibration' to a silent OS banner
    // plus an in-app pulse event the renderer can animate instead.
    const silent = style === 'silent' || style === 'vibration'
    new Notification({ title, body, silent }).show()
    if (style === 'vibration') {
      mainWindow?.webContents.send('flow:pulse')
      companionWindow?.webContents.send('flow:pulse')
    }
  })

  ipcMain.on('open:external', (_e, url) => shell.openExternal(url))
}

// ── lifecycle ─────────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  Menu.setApplicationMenu(null)
  setupIPC()
  createMain()
  createTray()
  createCompanion()
  globalShortcut.register('Ctrl+Space', () => showCapture())
})

app.on('window-all-closed', () => { if (process.platform === 'darwin') app.quit() })
app.on('activate', () => mainWindow?.show())
app.on('will-quit', () => globalShortcut.unregisterAll())

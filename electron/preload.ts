import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('flow', {
  win: {
    minimize: () => ipcRenderer.send('win:minimize'),
    maximize: () => ipcRenderer.send('win:maximize'),
    close:    () => ipcRenderer.send('win:close'),
  },
  capture: {
    open:   () => ipcRenderer.send('capture:open'),
    close:  () => ipcRenderer.send('capture:close'),
    saved:  () => ipcRenderer.send('capture:saved'),
    onFocus:(cb: () => void) => ipcRenderer.on('capture:focus', () => cb()),
  },
  companion: {
    toggle: () => ipcRenderer.send('companion:toggle'),
  },
  db: {
    changed:   () => ipcRenderer.send('db:changed'),
    onRefresh: (cb: () => void) => {
      const handler = () => cb()
      ipcRenderer.on('db:refresh', handler)
      return () => ipcRenderer.removeListener('db:refresh', handler)
    },
  },
  notify: (title: string, body: string) => ipcRenderer.send('notify', { title, body }),
  openExternal: (url: string) => ipcRenderer.send('open:external', url),
  platform: process.platform,
  isElectron: true,
})

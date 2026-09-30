import { app, BrowserWindow, ipcMain, nativeTheme, protocol, shell } from 'electron'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { registerIpc } from './ipc'
import { loadWorkspace, migrateLegacyDataDir } from './services/db'
import { readThumbnail } from './services/thumbnails'

const isDev = !app.isPackaged

/**
 * dev 跑的是 package.json 的 name，打包后 electron-builder 会换成 productName，
 * 两者不一致就会落到两个不同的 userData 目录 —— 换一种启动方式看起来就像数据全没了。
 * 这里统一钉死，读写永远只有一份。
 *
 * 带 --user-data-dir 启动时不覆盖，留给自动化测试用独立目录，免得碰到真实数据。
 */
app.setName('ComfyUI Workspace')

const hasUserDataOverride = process.argv.some(
  (arg, index) =>
    arg === '--user-data-dir' ||
    arg.startsWith('--user-data-dir=') ||
    process.argv[index - 1] === '--user-data-dir'
)

if (!hasUserDataOverride) {
  app.setPath('userData', join(app.getPath('appData'), 'ComfyUI Workspace'))
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'thumb',
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true }
  }
])

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  const devIcon = join(__dirname, '../../build/icon.png')

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    frame: false,
    // 窗口本身透明，圆角交给页面里的外框决定，
    // 否则方角窗口会在圆角外露出一圈底色。
    transparent: true,
    hasShadow: false,
    backgroundColor: '#00000000',
    title: 'ComfyUI 工作台',
    ...(existsSync(devIcon) ? { icon: devIcon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())
  mainWindow.on('maximize', () => mainWindow?.webContents.send('window:maximized-changed', true))
  mainWindow.on('unmaximize', () => mainWindow?.webContents.send('window:maximized-changed', false))

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    void mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

ipcMain.handle('window:minimize', () => mainWindow?.minimize())
ipcMain.handle('window:toggle-maximize', () => {
  if (!mainWindow) return false
  if (mainWindow.isMaximized()) mainWindow.unmaximize()
  else mainWindow.maximize()
  return mainWindow.isMaximized()
})
ipcMain.handle('window:close', () => mainWindow?.close())
ipcMain.handle('window:is-maximized', () => mainWindow?.isMaximized() ?? false)

ipcMain.handle('app:info', () => ({
  version: app.getVersion(),
  name: 'ComfyUI 工作台',
  platform: process.platform,
  userData: app.getPath('userData')
}))

void app.whenReady().then(() => {
  nativeTheme.themeSource = 'dark'
  migrateLegacyDataDir()
  loadWorkspace()

  protocol.handle('thumb', (request) => {
    const id = new URL(request.url).pathname.replace(/^\//, '')
    const data = readThumbnail(id)
    if (!data) return new Response('', { status: 404 })
    return new Response(new Uint8Array(data), {
      headers: { 'content-type': 'image/jpeg', 'cache-control': 'no-cache' }
    })
  })

  registerIpc()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

export interface AppInfo {
  version: string
  name: string
  platform: string
  userData: string
}

const FALLBACK_APP_INFO: AppInfo = {
  // 版本留空而不是写死，取不到时界面显示「—」，免得发版后还显示旧版本号
  version: '',
  name: 'ComfyUI 工作台',
  platform: 'web',
  userData: ''
}

export const bridge = {
  isDesktop: (): boolean => typeof window !== 'undefined' && Boolean(window.workspace),

  async appInfo(): Promise<AppInfo> {
    const info = await window.workspace?.app.info()
    return info ?? FALLBACK_APP_INFO
  },

  minimize(): void {
    void window.workspace?.window.minimize()
  },

  async toggleMaximize(): Promise<boolean> {
    return (await window.workspace?.window.toggleMaximize()) ?? false
  },

  close(): void {
    void window.workspace?.window.close()
  },

  async isMaximized(): Promise<boolean> {
    return (await window.workspace?.window.isMaximized()) ?? false
  },

  onMaximizedChange(callback: (maximized: boolean) => void): () => void {
    return window.workspace?.window.onMaximizedChange(callback) ?? (() => {})
  }
}

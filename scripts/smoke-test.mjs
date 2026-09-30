#!/usr/bin/env node
/**
 * ComfyUI 工作台 — v1.0.0 功能检测
 *
 * 起一个**隔离数据目录**的应用实例，连 CDP 跑一遍主流程，逐项打勾。
 * 用 --user-data-dir 指到临时目录，绝不碰 %APPDATA%\ComfyUI Workspace 里的真实数据。
 *
 *   node scripts/smoke-test.mjs
 *   node scripts/smoke-test.mjs --keep    失败时保留临时目录，方便翻 workspace.json
 *
 * 退出码 0 = 全过，1 = 有失败项。
 */

import { spawn, spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { deflateSync } from 'node:zlib'

const require = createRequire(import.meta.url)
const electronPath = require('electron')
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const keepTemp = process.argv.includes('--keep')

const sandbox = join(tmpdir(), `comfy-smoke-${Date.now()}`)
const userData = join(sandbox, 'userData')
const images = join(sandbox, 'images')

// ---------------------------------------------------------------- 测试基建

const results = []
let current = null
const consoleErrors = []

function check(name, passed, detail = '') {
  results.push({ name, passed: Boolean(passed), detail: String(detail) })
  const mark = passed ? '  OK  ' : ' FAIL '
  console.log(`[${mark}] ${name}${detail ? `   ${detail}` : ''}`)
}

async function step(name, fn) {
  current = name
  try {
    const detail = await fn()
    if (!results.some((r) => r.name === name)) check(name, true, detail ?? '')
  } catch (error) {
    check(name, false, error instanceof Error ? error.message : String(error))
  }
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b)

// ---------------------------------------------------------------- 造测试图片

function crc32(buf) {
  let c = ~0
  for (const byte of buf) {
    c ^= byte
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function makePng(width, height, rgb) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  const raw = Buffer.alloc((width * 3 + 1) * height)
  for (let y = 0; y < height; y++) {
    const row = y * (width * 3 + 1)
    for (let x = 0; x < width; x++) {
      const p = row + 1 + x * 3
      raw[p] = rgb[0] + ((x * 7) % 40)
      raw[p + 1] = rgb[1] + ((y * 5) % 40)
      raw[p + 2] = rgb[2]
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0))
  ])
}

// ---------------------------------------------------------------- CDP 驱动

let ws = null
let seq = 0
const pending = new Map()
let devtoolsPort = 0

function send(method, params = {}, timeoutMs = 30000) {
  return new Promise((resolvePromise) => {
    const id = ++seq
    const timer = setTimeout(() => {
      pending.delete(id)
      resolvePromise({ error: 'timeout' })
    }, timeoutMs)
    pending.set(id, (message) => {
      clearTimeout(timer)
      resolvePromise(message)
    })
    ws.send(JSON.stringify({ id, method, params }))
  })
}

async function evalJs(expression) {
  const message = await send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true
  })
  const details = message.result?.exceptionDetails
  if (details) throw new Error(details.exception?.description ?? details.text ?? 'JS 异常')
  return message.result?.result?.value
}

async function connect() {
  const deadline = Date.now() + 40000
  while (Date.now() < deadline) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${devtoolsPort}/json`)).json()
      const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl)
      if (page) {
        ws = new WebSocket(page.webSocketDebuggerUrl)
        await new Promise((res, rej) => {
          ws.addEventListener('open', res)
          ws.addEventListener('error', rej)
        })
        ws.addEventListener('message', (ev) => {
          const message = JSON.parse(ev.data)
          if (message.id && pending.has(message.id)) {
            pending.get(message.id)(message)
            pending.delete(message.id)
          }
          if (message.method === 'Runtime.exceptionThrown') {
            consoleErrors.push(message.params.exceptionDetails?.text ?? 'exception')
          }
          if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
            consoleErrors.push(
              message.params.args.map((a) => a.value ?? a.description).join(' ').slice(0, 160)
            )
          }
        })
        await send('Runtime.enable')
        return
      }
    } catch {
      // 还没起来，继续等
    }
    await wait(400)
  }
  throw new Error('连不上渲染进程的调试端口')
}

async function setInput(ariaLabel, value, tag = 'INPUT') {
  const selector = `[aria-label="${ariaLabel}"]`
  return evalJs(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)})
    if (!el) return false
    const proto = ${JSON.stringify(tag)} === 'TEXTAREA' ? window.HTMLTextAreaElement : window.HTMLInputElement
    const setter = Object.getOwnPropertyDescriptor(proto.prototype, 'value').set
    setter.call(el, ${JSON.stringify(value)})
    el.dispatchEvent(new Event('input', { bubbles: true }))
    return true
  })()`)
}

const clickNav = (index) =>
  evalJs(
    `(() => { const b = document.querySelectorAll('nav[aria-label="主导航"] button')[${index}]; if (!b) return false; b.click(); return true })()`
  )

const clickTab = (label) =>
  evalJs(
    `(() => {
      const b = [...document.querySelectorAll('[aria-label="打标页面"] [role="radio"]')].find(x => x.textContent.startsWith(${JSON.stringify(label)}))
      if (!b) return false
      b.click()
      return true
    })()`
  )

const clickButton = (text) =>
  evalJs(
    `(() => {
      const b = [...document.querySelectorAll('main button, [role="dialog"] button')].find(x => x.textContent.trim() === ${JSON.stringify(text)})
      if (!b) return false
      b.click()
      return true
    })()`
  )

// ---------------------------------------------------------------- 主流程

let child = null

function cleanup() {
  if (child && !child.killed) {
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
    } else {
      child.kill('SIGTERM')
    }
  }
  if (!keepTemp) {
    try {
      rmSync(sandbox, { recursive: true, force: true })
    } catch {
      // 临时目录清不掉不影响结论
    }
  } else {
    console.log(`\n临时目录保留在：${sandbox}`)
  }
}

async function main() {
  console.log('ComfyUI 工作台 — 功能检测\n')
  console.log(`隔离数据目录：${userData}\n`)

  mkdirSync(userData, { recursive: true })
  mkdirSync(images, { recursive: true })
  const names = ['alpha', 'bravo', 'charlie']
  names.forEach((name, i) => {
    writeFileSync(join(images, `${name}.png`), makePng(160, 120, [40 + i * 60, 90, 150]))
  })

  // --remote-debugging-port=0 让 Electron 自己挑端口，写到 DevToolsActivePort
  child = spawn(
    electronPath,
    [
      '.',
      '--remote-debugging-port=0',
      `--user-data-dir=${userData}`,
      '--disable-features=CalculateNativeWinOcclusion'
    ],
    { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] }
  )
  child.stderr.on('data', (buf) => {
    const text = String(buf)
    if (/error|Error/.test(text) && !/DevTools|Autofill|GPU|gpu_/.test(text)) {
      consoleErrors.push(text.trim().slice(0, 160))
    }
  })

  const portFile = join(userData, 'DevToolsActivePort')
  const deadline = Date.now() + 30000
  while (!existsSync(portFile) && Date.now() < deadline) await wait(300)
  if (!existsSync(portFile)) throw new Error('Electron 没写出 DevToolsActivePort')
  devtoolsPort = Number(readFileSync(portFile, 'utf8').split('\n')[0].trim())
  await connect()
  await wait(2200)

  // ------------------------------------------------------------ 启动与骨架

  await step('应用启动 / 窗口渲染', async () => {
    const info = await evalJs(`(() => {
      const shell = document.querySelector('#root > div > div')
      const rail = document.querySelector('nav[aria-label="主导航"]')
      const items = [...rail.querySelectorAll('button')].filter(
        (b) => b.getAttribute('aria-label') !== '帮助与快捷键'
      )
      return {
        hasShell: Boolean(shell),
        width: Math.round(shell?.getBoundingClientRect().width ?? 0),
        views: items.length
      }
    })()`)
    if (!info.hasShell) throw new Error('应用外壳没渲染出来')
    if (info.views !== 6) throw new Error(`导航项应为 6，实际 ${info.views}`)
    return `外壳 ${info.width}px，导航 ${info.views} 项`
  })

  await step('版本号来自 package.json（不是写死的）', async () => {
    const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version
    const shown = await evalJs(
      `document.querySelector('nav[aria-label="主导航"]').innerText.trim()`
    )
    if (!shown.includes(`v${version}`)) {
      throw new Error(`界面上没显示 v${version}，实际导航底部是「${shown}」`)
    }
    return `v${version}`
  })

  await step('数据目录被隔离（没写进真实 APPDATA）', async () => {
    const dir = await evalJs(`window.workspace.workspace.snapshot().then(s => s.dataDir)`)
    if (resolve(dir) !== resolve(join(userData, 'data'))) {
      throw new Error(`数据目录不对：${dir}`)
    }
    return dir
  })

  const viewNames = ['主页', '图库', '数据集', '打标工作台', '标签库', '设置']
  for (const [index, name] of viewNames.entries()) {
    await step(`视图可渲染 · ${name}`, async () => {
      if (!(await clickNav(index))) throw new Error('导航按钮不存在')
      await wait(520)
      const length = await evalJs(`document.querySelector('main')?.innerText.trim().length ?? 0`)
      if (length < 10) throw new Error(`内容为空（${length} 字符）`)
      return `${length} 字符`
    })
  }

  await step('命令面板 Ctrl+K 打开并能过滤', async () => {
    await evalJs(
      `(window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true })), true)`
    )
    await wait(500)
    const opened = await evalJs(`Boolean(document.querySelector('[role="dialog"][aria-label="命令面板"]'))`)
    if (!opened) throw new Error('面板没打开')
    await evalJs(`(() => {
      const input = document.querySelector('[aria-label="搜索命令"]')
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
      setter.call(input, '打标')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })(), true`)
    await wait(400)
    const items = await evalJs(
      `document.querySelectorAll('[role="dialog"][aria-label="命令面板"] button[data-index]').length`
    )
    await evalJs(`(window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })), true)`)
    await wait(400)
    if (items === 0) throw new Error('过滤后没有结果')
    return `过滤后 ${items} 条`
  })

  // ------------------------------------------------------------ 数据集

  await step('添加数据集并完成扫描', async () => {
    const dataset = await evalJs(
      `window.workspace.datasets.add(${JSON.stringify(images)}).then(d => d && { name: d.name, count: d.imageCount })`
    )
    if (!dataset) throw new Error('添加失败')
    await wait(2500)
    const snapshot = await evalJs(
      `window.workspace.workspace.snapshot().then(s => ({ datasets: s.datasets.length, images: s.images.length }))`
    )
    if (snapshot.images !== 3) throw new Error(`应有 3 张图，实际 ${snapshot.images}`)
    return `${dataset.name} / ${snapshot.images} 张`
  })

  await step('缩略图能真正解码出来', async () => {
    await clickNav(1)
    await wait(1200)
    const decoded = await evalJs(`(() => {
      const img = [...document.querySelectorAll('main img')].find(i => i.src.startsWith('thumb:'))
      return img ? { src: img.src.slice(0, 24), w: img.naturalWidth, h: img.naturalHeight } : null
    })()`)
    if (!decoded) throw new Error('图库里没有 thumb:// 图片')
    if (decoded.w === 0) throw new Error('缩略图没解码（naturalWidth=0）')
    return `${decoded.w}×${decoded.h}`
  })

  await step('图库多选与批处理条', async () => {
    await evalJs(`(() => {
      const cards = [...document.querySelectorAll('main button')].filter(b => b.querySelector('img[src^="thumb:"]'))
      cards.slice(0, 2).forEach(c => c.click())
      return cards.length
    })()`)
    await wait(600)
    const selected = await evalJs(
      `document.querySelector('[aria-label="状态栏"]')?.innerText ?? document.body.innerText`
    )
    if (!/已选/.test(selected)) throw new Error('状态栏没有「已选」计数')
    return selected.replace(/\s+/g, ' ').slice(0, 60)
  })

  await step('读取原始元数据不报错', async () => {
    const result = await evalJs(`(async () => {
      const s = await window.workspace.workspace.snapshot()
      const raw = await window.workspace.images.raw(s.images[0].id)
      return raw === null ? '无嵌入元数据（正常）' : '拿到元数据对象'
    })()`)
    return result
  })

  // ------------------------------------------------------------ 打标工作台

  await step('打标工作台三个切换页', async () => {
    await clickNav(3)
    await wait(800)
    const tabs = await evalJs(
      `[...document.querySelectorAll('[aria-label="打标页面"] [role="radio"]')].map(b => b.textContent)`
    )
    if (tabs.length !== 3) throw new Error(`应有 3 个子页，实际 ${tabs.length}`)
    return tabs.join(' / ')
  })

  await step('手动编辑：加标签并落盘', async () => {
    await clickTab('手动编辑')
    await wait(700)
    const picked = await evalJs(`(() => {
      const row = document.querySelectorAll('main ul li button')[0]
      if (!row) return null
      row.click()
      return row.innerText.replace(/\\n/g, ' ')
    })()`)
    if (!picked) throw new Error('左侧列表是空的')
    await setInput('新增标签', 'smoke-tag', 'INPUT')
    await evalJs(
      `document.querySelector('[aria-label="新增标签"]').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })), true`
    )
    await wait(1400)
    const stored = await evalJs(`(async () => {
      const s = await window.workspace.workspace.snapshot()
      const img = s.images.find(i => i.manualTags.includes('smoke-tag'))
      return img ? { file: img.fileName, tags: img.tags } : null
    })()`)
    if (!stored) throw new Error('标签没写进 workspace')
    return `${stored.file} → ${stored.tags.join(', ')}`
  })

  await step('打标文本（标签模式）与胶囊双向同步', async () => {
    await setInput('打标文本', 'one, two, three', 'TEXTAREA')
    await wait(1500)
    const synced = await evalJs(`(async () => {
      const s = await window.workspace.workspace.snapshot()
      const img = s.images.find(i => i.tags.includes('three'))
      const pills = [...document.querySelectorAll('main [aria-label^="移除标签"]')].map(b => b.textContent)
      return img ? { tags: img.tags, pills } : null
    })()`)
    if (!synced) throw new Error('打标文本没写回标签')
    if (synced.pills.length !== 3) throw new Error(`胶囊应同步成 3 个，实际 ${synced.pills.length}`)
    return synced.tags.join(', ')
  })

  await step('删标签进「已隐藏」而不是永久丢弃', async () => {
    const hidden = await evalJs(`(async () => {
      const s = await window.workspace.workspace.snapshot()
      const img = s.images.find(i => i.tags.includes('three'))
      await window.workspace.images.setTags({ imageId: img.id, tags: img.tags.filter(t => t !== 'three') })
      const after = await window.workspace.workspace.snapshot()
      const now = after.images.find(i => i.id === img.id)
      return { tags: now.tags, hidden: now.hiddenTags }
    })()`)
    if (!hidden.hidden.includes('three')) throw new Error('删掉的标签没进 hiddenTags')
    return `隐藏 ${hidden.hidden.join(', ')}`
  })

  await step('移到准备打标：标签保留（非破坏）', async () => {
    await clickTab('已有标签')
    await wait(700)
    const before = await evalJs(`(async () => {
      const s = await window.workspace.workspace.snapshot()
      const img = s.images.find(i => i.tags.length > 0)
      return { id: img.id, tags: img.tags.length }
    })()`)
    const clicked = await clickButton('移回')
    if (!clicked) throw new Error('没找到「移回」按钮')
    await wait(1500)
    const after = await evalJs(`(async () => {
      const s = await window.workspace.workspace.snapshot()
      const img = s.images.find(i => i.id === ${JSON.stringify(before.id)})
      return { requeued: Boolean(img.requeued), tags: img.tags.length }
    })()`)
    if (!after.requeued) throw new Error('没有标记为重新排队')
    if (after.tags !== before.tags) throw new Error(`标签被动了：${before.tags} → ${after.tags}`)
    return `标签 ${after.tags} 个，原样保留`
  })

  await step('撤销排队', async () => {
    const undone = await evalJs(`(async () => {
      const s = await window.workspace.workspace.snapshot()
      const target = s.images.find(i => i.requeued)
      await window.workspace.images.requeue([target.id], false)
      const after = await window.workspace.workspace.snapshot()
      return after.images.some(i => i.requeued)
    })()`)
    if (undone) throw new Error('撤销后仍有排队标记')
    return '已放回'
  })

  await step('导出标签写出 .txt', async () => {
    const result = await evalJs(
      `window.workspace.datasets.exportTags('all').then(r => r)`
    )
    if (result.written < 1) throw new Error(`写出 0 个文件`)
    const txt = join(images, 'alpha.txt')
    const anyTxt = names.map((n) => join(images, `${n}.txt`)).find((p) => existsSync(p))
    if (!anyTxt) throw new Error('磁盘上没有生成 .txt')
    const content = readFileSync(anyTxt, 'utf8')
    if (!content.trim()) throw new Error('.txt 是空的')
    return `${result.written} 个文件，例：${content.slice(0, 40)}`
  })

  // ------------------------------------------------------------ 标签库

  await step('标签库改分类 / 别名 / 黑名单', async () => {
    await clickNav(4)
    await wait(800)
    const updated = await evalJs(`(async () => {
      const s = await window.workspace.workspace.snapshot()
      const name = s.tags.find(t => t.count > 0)?.name ?? s.tags[0]?.name
      if (!name) return null
      await window.workspace.tags.update({ name, category: 'style', aliases: ['smoke-alias'], blacklisted: true })
      const after = await window.workspace.workspace.snapshot()
      const tag = after.tags.find(t => t.name === name)
      return { name, category: tag.category, aliases: tag.aliases, blacklisted: tag.blacklisted }
    })()`)
    if (!updated) throw new Error('标签库里没有词条')
    if (updated.category !== 'style' || !updated.blacklisted) throw new Error('修改没生效')
    await evalJs(`(async () => {
      await window.workspace.tags.update({ name: ${JSON.stringify(updated.name)}, category: 'other', aliases: [], blacklisted: false })
    })()`)
    return `${updated.name} → ${updated.category} / 黑名单 ✓`
  })

  // ------------------------------------------------------------ 设置 / API

  await step('API 配置：胶囊切换 + 环境变量与 SK 互斥', async () => {
    await clickNav(5)
    await wait(900)
    const pills = await evalJs(
      `[...document.querySelectorAll('[role="radiogroup"][aria-label="服务来源"] [role="radio"]')].map(b => b.textContent)`
    )
    if (pills.length === 0) throw new Error('没有配置胶囊')
    await setInput('环境变量名', 'SMOKE_KEY')
    await wait(900)
    const envState = await evalJs(`(() => {
      const key = document.querySelector('[aria-label="API Key"]')
      return { keyValue: key.value, keyDisabled: key.disabled }
    })()`)
    if (envState.keyValue !== '' || !envState.keyDisabled) {
      throw new Error(`互斥没生效：API Key 值="${envState.keyValue}" disabled=${envState.keyDisabled}`)
    }
    await setInput('API Key', 'sk-smoke-123456')
    await wait(900)
    const keyState = await evalJs(`(() => {
      const env = document.querySelector('[aria-label="环境变量名"]')
      return { envValue: env.value, envDisabled: env.disabled }
    })()`)
    if (keyState.envValue !== '' || !keyState.envDisabled) {
      throw new Error(`反向互斥没生效：环境变量="${keyState.envValue}"`)
    }
    return `胶囊 ${pills.length} 条，互斥双向生效`
  })

  await step('API 配置文件独立落盘', async () => {
    const file = await evalJs(`window.workspace.workspace.snapshot().then(s => s.endpointsFile)`)
    if (!existsSync(file)) throw new Error(`endpoints.json 不存在：${file}`)
    const parsed = JSON.parse(readFileSync(file, 'utf8'))
    if (!Array.isArray(parsed.items) || parsed.items.length === 0) throw new Error('配置为空')
    const saved = parsed.items.find((i) => i.apiKey === 'sk-smoke-123456')
    if (!saved) throw new Error('刚填的 API Key 没落盘')
    if (saved.envVar !== '') throw new Error('互斥没有被持久化')
    return `activeId=${parsed.activeId ? '有' : '无'}，${parsed.items.length} 条配置`
  })

  await step('添加配置弹窗', async () => {
    const opened = await clickButton('添加配置')
    if (!opened) throw new Error('没找到「添加配置」按钮')
    await wait(700)
    const dialog = await evalJs(`(() => {
      const d = document.querySelector('[role="dialog"][aria-label="添加配置"]')
      if (!d) return null
      return {
        presets: [...d.querySelectorAll('[role="radio"]')].map(b => b.textContent),
        fields: [...d.querySelectorAll('input')].map(i => i.getAttribute('aria-label'))
      }
    })()`)
    if (!dialog) throw new Error('弹窗没打开')
    if (!dialog.presets.includes('自定义')) throw new Error('预置模板不全')
    await evalJs(
      `document.querySelector('[role="dialog"][aria-label="添加配置"] [aria-label="关闭"]')?.click(), true`
    )
    await wait(400)
    return `预置 ${dialog.presets.length} 个，字段 ${dialog.fields.length} 个`
  })

  // ------------------------------------------------------------ 窗口行为

  await step('最大化铺满 / 还原留边距', async () => {
    const before = await evalJs(`(() => ({
      pad: getComputedStyle(document.querySelector('#root > div')).padding,
      radius: getComputedStyle(document.querySelector('#root > div > div')).borderTopLeftRadius
    }))()`)
    if (before.pad !== '16px') throw new Error(`未最大化应有 16px 留白，实际 ${before.pad}`)
    await evalJs(`window.workspace.window.toggleMaximize()`, true)
    await wait(1300)
    const maximized = await evalJs(`(() => ({
      pad: getComputedStyle(document.querySelector('#root > div')).padding,
      radius: getComputedStyle(document.querySelector('#root > div > div')).borderTopLeftRadius,
      w: Math.round(document.documentElement.clientWidth)
    }))()`)
    if (maximized.pad !== '0px' || maximized.radius !== '0px') {
      throw new Error(`最大化后应无留白无圆角，实际 pad=${maximized.pad} radius=${maximized.radius}`)
    }
    await evalJs(`window.workspace.window.toggleMaximize()`, true)
    await wait(1300)
    const restored = await evalJs(
      `getComputedStyle(document.querySelector('#root > div')).padding`
    )
    if (restored !== '16px') throw new Error(`还原后留白没回来：${restored}`)
    return `未最大化 16px/24px → 最大化 0/0 → 还原 16px`
  })

  await step('全局快捷键 Ctrl+B 开合检视面板', async () => {
    await clickNav(1)
    await wait(700)
    const width = () =>
      evalJs(
        `(() => { const el = document.querySelector('[aria-label="检视面板"]'); return el ? Math.round(el.getBoundingClientRect().width) : 0 })()`
      )
    const press = () =>
      evalJs(
        `(window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true })), true)`
      )

    const before = await width()
    if (before === 0) throw new Error('起始状态检视面板就不可见')
    await press()
    await wait(700)
    const after = await width()
    if (after === before) throw new Error(`Ctrl+B 没改变面板宽度（${before} → ${after}）`)
    await press()
    await wait(500)
    const restored = await width()
    if (restored !== before) throw new Error(`再按一次没还原：${restored} ≠ ${before}`)
    return `${before}px → ${after}px → ${restored}px`
  })

  await step('工作区文件包含全部新字段', async () => {
    const file = join(userData, 'data', 'workspace.json')
    if (!existsSync(file)) throw new Error('workspace.json 不存在')
    const parsed = JSON.parse(readFileSync(file, 'utf8'))
    const image = parsed.images?.[0]
    if (!image) throw new Error('没有图片记录')
    for (const field of ['manualTags', 'hiddenTags', 'sidecarTags', 'modelTags', 'tags']) {
      if (!Array.isArray(image[field])) throw new Error(`字段 ${field} 缺失`)
    }
    return `${parsed.images.length} 张图，字段齐全`
  })

  await step('整个流程没有控制台报错', async () => {
    const real = consoleErrors.filter((e) => !/DevTools|Autofill|GPU|gpu_|Electron Security/.test(e))
    if (real.length > 0) throw new Error(`${real.length} 条：${real.slice(0, 3).join(' | ')}`)
    return '零报错'
  })
}

main()
  .catch((error) => {
    check('测试流程本身跑完', false, error instanceof Error ? error.message : String(error))
  })
  .finally(() => {
    cleanup()
    const failed = results.filter((r) => !r.passed)
    console.log('\n' + '='.repeat(56))
    console.log(` 通过 ${results.length - failed.length} / ${results.length}`)
    if (failed.length > 0) {
      console.log(' 失败项：')
      for (const item of failed) console.log(`   - ${item.name}   ${item.detail}`)
    }
    console.log('='.repeat(56))
    process.exit(failed.length > 0 ? 1 : 0)
  })

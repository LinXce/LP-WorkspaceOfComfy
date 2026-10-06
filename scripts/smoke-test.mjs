#!/usr/bin/env node
/**
 * LP-Tagger — v1.1.1 功能检测
 *
 * 起一个**隔离数据目录**的应用实例，连 CDP 跑一遍主流程，逐项打勾。
 * 用 --user-data-dir 指到临时目录，绝不碰 %APPDATA%\LP-Tagger 里的真实数据。
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
// 故意起一个长名字：用来验证筛选框会把超长数据集名截断而不是换行
const images = join(sandbox, 'kzmyonon-krea2-v1-long-dataset-name')

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

/**
 * 填输入框。scope 用来限定范围 —— 有些 aria-label 会在页面和弹窗里各出现一次
 * （比如「模板名称」），不限定就会填错那个。
 */
async function setInput(ariaLabel, value, tag = 'INPUT', scope = 'body') {
  const selector = `${scope} [aria-label="${ariaLabel}"]`
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
  console.log('LP-Tagger — 功能检测\n')
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
      const shell = document.querySelector('#root > div')
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

  await step('数据集筛选超出长度会截断、悬停看全称', async () => {
    const select = await evalJs(`(() => {
      const trigger = document.querySelector('[aria-label="数据集筛选"]')
      if (!trigger) return null
      const value = trigger.querySelector('span')
      const style = value ? getComputedStyle(value) : null
      return {
        height: Math.round(trigger.getBoundingClientRect().height),
        title: trigger.getAttribute('title'),
        whiteSpace: style ? style.whiteSpace : null,
        textOverflow: style ? style.textOverflow : null,
        overflow: style ? style.overflow : null
      }
    })()`)
    if (!select) throw new Error('找不到数据集筛选控件')
    if (select.whiteSpace !== 'nowrap' || select.textOverflow !== 'ellipsis') {
      throw new Error(
        `没有截断样式：white-space=${select.whiteSpace} text-overflow=${select.textOverflow}`
      )
    }
    if (select.height > 34) throw new Error(`筛选框被撑成两行了（${select.height}px）`)
    if (!select.title) throw new Error('没有 title，悬停看不到全称')
    return `${select.height}px 单行 + 省略号，悬停显示「${select.title}」`
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

  await step('描述打标的结果也算「已打标」', async () => {
    // nl 模式产出的是 caption 而不是 tags，只看 tags 会让它永远卡在待打标
    await evalJs(`(() => {
      const b = [...document.querySelectorAll('[aria-label="打标模式"] [role="radio"]')].find(x => x.textContent === '描述')
      if (b) b.click()
    })(), true`)
    await wait(800)
    await clickTab('手动编辑')
    await wait(700)

    const picked = await evalJs(`(() => {
      const rows = [...document.querySelectorAll('main ul li button')]
      const target = rows.find((r) => r.innerText.includes('无内容'))
      if (!target) return null
      target.click()
      return target.innerText.split('\\n')[0]
    })()`)
    if (!picked) throw new Error('没有「无内容」的图片可用于测试')

    await wait(500)
    await setInput('打标文本', '一位少女站在黄昏的户外', 'TEXTAREA')
    await wait(2000)

    const stored = await evalJs(`(async () => {
      const s = await window.workspace.workspace.snapshot()
      const img = s.images.find(i => i.fileName === ${JSON.stringify(picked)})
      return { tags: img.tags.length, caption: img.caption ?? null }
    })()`)
    if (stored.tags !== 0 || !stored.caption) {
      throw new Error(`没造出「只有描述」的状态：tags=${stored.tags} caption=${stored.caption}`)
    }

    await clickTab('已有标签')
    await wait(800)
    const listed = await evalJs(
      `document.querySelector('main').innerText.includes(${JSON.stringify(picked)})`
    )
    if (!listed) {
      const tabs = await evalJs(
        `[...document.querySelectorAll('[aria-label="打标页面"] [role="radio"]')].map(b => b.textContent).join(' / ')`
      )
      throw new Error(`只有描述没被算作已打标，仍在待打标（页签：${tabs}）`)
    }

    await evalJs(`(() => {
      const b = [...document.querySelectorAll('[aria-label="打标模式"] [role="radio"]')].find(x => x.textContent === '标签')
      if (b) b.click()
    })(), true`)
    await wait(600)
    return `${picked} 只有 caption 也进了已打标页`
  })

  await step('描述模式下打标文本会兜底显示标签串', async () => {
    await evalJs(`(() => {
      const b = [...document.querySelectorAll('[aria-label="打标模式"] [role="radio"]')].find(x => x.textContent === '描述')
      if (b) b.click()
    })(), true`)
    await wait(800)
    await clickTab('手动编辑')
    await wait(700)

    const picked = await evalJs(`(() => {
      const rows = [...document.querySelectorAll('main ul li button')]
      const target = rows.find((r) => r.innerText.includes('个标签'))
      if (!target) return null
      target.click()
      return target.innerText.split('\\n')[0]
    })()`)
    if (!picked) throw new Error('没有「只有标签、没有描述」的图片可用于测试')
    await wait(600)

    const shown = await evalJs(`document.querySelector('[aria-label="打标文本"]').value`)
    const expected = await evalJs(`(async () => {
      const s = await window.workspace.workspace.snapshot()
      const img = s.images.find(i => i.fileName === ${JSON.stringify(picked)})
      return img.tags.join(', ')
    })()`)
    if (!expected) throw new Error('选中的图片没有标签，测不出兜底')
    if (shown !== expected) {
      throw new Error(`描述模式下应兜底显示「${expected}」，实际「${shown}」`)
    }

    await evalJs(`(() => {
      const b = [...document.querySelectorAll('[aria-label="打标模式"] [role="radio"]')].find(x => x.textContent === '标签')
      if (b) b.click()
    })(), true`)
    await wait(600)
    return `${picked} 在描述模式下也显示了「${shown}」`
  })

  await step('保存标签写出 .txt', async () => {
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

  await step('「保存标签」按钮是蓝色主按钮', async () => {
    const button = await evalJs(`(() => {
      const b = [...document.querySelectorAll('main button')].find(x => x.textContent.trim() === '保存标签')
      if (!b) return null
      const style = getComputedStyle(b)
      return { text: b.textContent.trim(), bg: style.backgroundColor, color: style.color }
    })()`)
    if (!button) throw new Error('没找到「保存标签」按钮')
    const rgb = button.bg.match(/\d+(\.\d+)?/g)?.map(Number) ?? []
    if (rgb.length < 3) throw new Error(`取不到底色：${button.bg}`)
    if (rgb.length > 3 && rgb[3] === 0) throw new Error(`按钮底色是透明的，不像主按钮：${button.bg}`)
    if (!(rgb[2] > rgb[0] && rgb[2] > rgb[1])) {
      throw new Error(`底色不是蓝色系：${button.bg}`)
    }
    return `${button.text} · 底色 ${button.bg}`
  })

  await step('打标结果不导出也不会丢', async () => {
    // 工作区文件里必须有打标结果，而导出只是把它写到图片目录
    const file = join(userData, 'data', 'workspace.json')
    const raw = readFileSync(file, 'utf8')
    const parsed = JSON.parse(raw)
    const tagged = parsed.images.filter((image) => (image.tags ?? []).length > 0 || image.caption)
    if (tagged.length === 0) throw new Error('workspace.json 里没有任何打标结果')
    const sample = tagged[0]
    return `${tagged.length} 张有结果，例：${sample.fileName} tags=${(sample.tags ?? []).length} caption=${sample.caption ? '有' : '无'}`
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
    // 端点编辑是防抖写入，多等一会儿再查，别把测试写成时序边缘
    await wait(1200)
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

  // ------------------------------------------------------------ 提示词模板

  await step('提示词模板：内置两套，独立落盘', async () => {
    await clickNav(5)
    await wait(800)
    const pills = await evalJs(
      `[...document.querySelectorAll('[role="radiogroup"][aria-label="提示词模板"] [role="radio"]')].map(b => b.textContent)`
    )
    if (pills.length < 2) throw new Error(`内置模板应至少 2 套，实际 ${pills.length}`)
    const file = await evalJs(`window.workspace.workspace.snapshot().then(s => s.promptsFile)`)
    if (!existsSync(file)) throw new Error(`prompts.json 不存在：${file}`)
    const parsed = JSON.parse(readFileSync(file, 'utf8'))
    if (!Array.isArray(parsed.items) || parsed.items.length < 2) throw new Error('prompts.json 内容不全')
    if (!parsed.items.some((item) => item.builtin === 'tag') || !parsed.items.some((item) => item.builtin === 'nl')) {
      throw new Error('内置的 tag / nl 模板不齐')
    }
    return `${pills.join(' / ')}，文件里 ${parsed.items.length} 套`
  })

  await step('添加提示词弹窗能新增并切过去', async () => {
    const opened = await clickButton('添加提示词')
    if (!opened) throw new Error('没找到「添加提示词」按钮')
    await wait(700)
    const dialog = await evalJs(`(() => {
      const d = document.querySelector('[role="dialog"][aria-label="添加提示词"]')
      if (!d) return null
      return {
        starters: [...d.querySelectorAll('[role="radio"]')].map(b => b.textContent),
        fields: [...d.querySelectorAll('input, textarea')].map(i => i.getAttribute('aria-label'))
      }
    })()`)
    if (!dialog) throw new Error('弹窗没打开')
    if (!dialog.starters.some((s) => s.includes('空白'))) throw new Error('缺少「空白」起点')

    await setInput(
      '模板名称',
      '冒烟测试模板',
      'INPUT',
      '[role="dialog"][aria-label="添加提示词"]'
    )
    await wait(500)
    await evalJs(
      `[...document.querySelectorAll('[role="dialog"][aria-label="添加提示词"] button')].find(b => b.textContent.trim() === '保存').click(), true`
    )
    await wait(1600)

    const state = await evalJs(`(async () => {
      const s = await window.workspace.workspace.snapshot()
      return { active: s.activePrompt?.name ?? null, count: s.prompts.length }
    })()`)
    if (state.active !== '冒烟测试模板') throw new Error(`新增后没切过去，当前是「${state.active}」`)
    return `${dialog.starters.length} 个起点，新增后当前用「${state.active}」（共 ${state.count} 套）`
  })

  await step('提示词改动即时落盘，切模式会换上对应内置模板', async () => {
    await setInput('模板内容', 'MODE TEST PROMPT', 'TEXTAREA')
    await wait(1600)

    const file = await evalJs(`window.workspace.workspace.snapshot().then(s => s.promptsFile)`)
    const parsed = JSON.parse(readFileSync(file, 'utf8'))
    const saved = parsed.items.find((item) => item.name === '冒烟测试模板')
    if (saved?.text.trim() !== 'MODE TEST PROMPT') {
      throw new Error(`模板内容没落盘：${JSON.stringify(saved?.text)}`)
    }

    // 切回内置标签模板 —— 必须走界面，直接调 API 的话 store 不会刷新
    await evalJs(`(() => {
      const b = [...document.querySelectorAll('[aria-label="提示词模板"] [role="radio"]')].find(x => x.textContent.trim() === '内置 · 标签')
      if (b) b.click()
    })(), true`)
    await wait(900)
    const switched = await evalJs(
      `window.workspace.workspace.snapshot().then(s => s.activePrompt?.name ?? null)`
    )
    if (switched !== '内置 · 标签') throw new Error(`没能切回内置标签模板，当前是「${switched}」`)

    const clickFormat = (label) =>
      evalJs(`(() => {
        const b = [...document.querySelectorAll('[aria-label="默认输出格式"] [role="radio"]')].find(x => x.textContent.trim() === ${JSON.stringify(label)})
        if (b) b.click()
      })(), true`)

    await clickFormat('描述')
    await wait(1000)
    const after = await evalJs(`(async () => {
      const s = await window.workspace.workspace.snapshot()
      return { builtin: s.activePrompt?.builtin ?? null, name: s.activePrompt?.name ?? null }
    })()`)
    if (after.builtin !== 'nl') {
      throw new Error(`切到描述模式后没换上内置描述模板，当前是「${after.name}」`)
    }

    await clickFormat('标签')
    await wait(600)

    // 删掉测试模板，别影响后面的检查
    await evalJs(`(async () => {
      const s = await window.workspace.workspace.snapshot()
      const mine = s.prompts.find(p => p.name === '冒烟测试模板')
      if (mine) await window.workspace.prompts.remove(mine.id)
    })()`)
    await wait(800)
    const left = await evalJs(
      `window.workspace.workspace.snapshot().then(s => s.prompts.map(p => p.name))`
    )
    if (left.includes('冒烟测试模板')) throw new Error('测试模板没删掉')
    return `内容落盘 ✓，切模式自动换成「${after.name}」✓，删除 ✓（剩 ${left.length} 套）`
  })

  // ------------------------------------------------------------ 窗口行为

  await step('面板始终铺满窗口（不透明窗口方案）', async () => {
    const measure = () =>
      evalJs(`(() => {
        const shell = document.querySelector('#root > div')
        const rect = shell.getBoundingClientRect()
        const style = getComputedStyle(shell)
        return {
          pad: style.padding,
          radius: style.borderTopLeftRadius,
          w: Math.round(rect.width),
          h: Math.round(rect.height),
          vw: window.innerWidth,
          vh: window.innerHeight
        }
      })()`)

    const before = await measure()
    if (before.pad !== '0px') throw new Error(`面板不该有留白，实际 padding=${before.pad}`)
    if (before.radius !== '0px') throw new Error(`最外层不该有圆角，实际 ${before.radius}`)
    if (before.w !== before.vw || before.h !== before.vh) {
      throw new Error(`面板没铺满窗口：面板 ${before.w}×${before.h} vs 视口 ${before.vw}×${before.vh}`)
    }

    await evalJs(`window.workspace.window.toggleMaximize()`, true)
    await wait(1300)
    const maximized = await measure()
    if (maximized.w !== maximized.vw || maximized.h !== maximized.vh) {
      throw new Error(`最大化后没铺满：${maximized.w}×${maximized.h} vs ${maximized.vw}×${maximized.vh}`)
    }

    await evalJs(`window.workspace.window.toggleMaximize()`, true)
    await wait(1300)
    const restored = await measure()
    if (restored.w !== restored.vw || restored.h !== restored.vh) {
      throw new Error(`还原后没铺满：${restored.w}×${restored.h} vs ${restored.vw}×${restored.vh}`)
    }
    return `未最大化 ${before.w}×${before.h} → 最大化 ${maximized.w}×${maximized.h} → 还原 ${restored.w}×${restored.h}`
  })

  await step('动效级别「完整」不会被系统偏好掐掉', async () => {
    await clickNav(5)
    await wait(800)
    const pick = (label) =>
      evalJs(`(() => {
        const b = [...document.querySelectorAll('[aria-label="动效级别"] [role="radio"]')].find(x => x.textContent.trim() === ${JSON.stringify(label)})
        if (b) b.click()
      })(), true`)
    const dur = () =>
      evalJs(`(() => {
        const root = document.documentElement
        return { motion: root.dataset.motion, base: getComputedStyle(root).getPropertyValue('--dur-base').trim() }
      })()`)

    await pick('完整')
    await wait(500)
    const full = await dur()
    if (full.motion !== 'full') throw new Error(`动效级别没切到完整：${full.motion}`)
    // 系统开了「减少动态效果」时，之前 CSS 的媒体查询会把用户明确选的「完整」也清零
    if (Number.parseFloat(full.base) <= 0) {
      throw new Error(`用户选了「完整」，但时长仍是 ${full.base}（被系统偏好盖掉了）`)
    }

    await pick('无')
    await wait(400)
    const none = await dur()
    if (Number.parseFloat(none.base) !== 0) throw new Error(`选「无」后时长应为 0，实际 ${none.base}`)

    await pick('完整')
    await wait(400)
    return `完整 → ${full.base}；无 → 0s`
  })

  await step('滚动条走自定义圆角样式', async () => {
    const scrollbar = await evalJs(`(() => {
      const style = getComputedStyle(document.body)
      return { width: style.scrollbarWidth, color: style.scrollbarColor }
    })()`)
    // Chromium 121 起，这两个标准属性一旦不是 auto，::-webkit-scrollbar 整套失效
    if (scrollbar.width !== 'auto' || scrollbar.color !== 'auto') {
      throw new Error(
        `scrollbar-width/color 被设置了（${scrollbar.width} / ${scrollbar.color}），圆角滚动条会失效`
      )
    }
    return '标准属性保持 auto，webkit 圆角样式生效'
  })

  await step('导航选中高亮是滑动块', async () => {
    const read = () =>
      evalJs(`(() => {
        const rail = document.querySelector('nav[aria-label="主导航"]')
        const block = rail.querySelector('span[aria-hidden]')
        const style = getComputedStyle(block)
        return {
          transform: style.transform,
          duration: style.transitionDuration,
          hasBar: Boolean(block.querySelector('span')),
          height: Math.round(block.getBoundingClientRect().height)
        }
      })()`)
    await clickNav(0)
    await wait(500)
    const first = await read()
    await clickNav(5)
    await wait(700)
    const last = await read()

    if (!first.hasBar) throw new Error('高亮块里没有柠檬绿竖条')
    if (first.height !== 52) throw new Error(`高亮块高度应为 52，实际 ${first.height}`)
    if (first.transform === last.transform) {
      throw new Error(`切换视图后高亮块没移动：${first.transform}`)
    }
    if (last.transform !== 'matrix(1, 0, 0, 1, 0, 280)') {
      throw new Error(`第 6 项的高亮位置不对：${last.transform}`)
    }

    // 系统开了「减少动态效果」或应用把动效设为「无」时，时长会被归零，这是对的
    const animated = await evalJs(
      `!matchMedia('(prefers-reduced-motion: reduce)').matches && document.documentElement.dataset.motion !== 'none'`
    )
    if (animated && parseFloat(last.duration) <= 0) {
      throw new Error(`动效已开启，但高亮块过渡时长为 ${last.duration}`)
    }
    return animated
      ? `${first.transform} → ${last.transform}，过渡 ${last.duration}`
      : `${first.transform} → ${last.transform}（系统要求减少动效，已按 0ms 直接吸附）`
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

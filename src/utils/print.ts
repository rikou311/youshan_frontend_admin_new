export interface PrintBySelectorOptions {
  pageWidthMm?: number
  pageHeightMm?: number
  /** CSS margin for @page, e.g. '0' | '0mm' | '30px' */
  pageMargin?: string
  delay?: number
  /** 使用 outerHTML（保留根节点 class，供打印样式命中） */
  useOuterHtml?: boolean
  /**
   * 是否复制当前页样式。
   * 标签打印建议关闭，避免全局 min-height/布局样式撑出空白第二页。
   * 默认 true（兼容纳品书等依赖页面样式的打印）。
   */
  copyStyles?: boolean
}

function collectCssFromSheet(sheet: CSSStyleSheet, out: string[]) {
  let rules: CSSRuleList | undefined
  try {
    rules = sheet.cssRules
  } catch {
    return
  }
  if (!rules) {
    return
  }
  for (const rule of Array.from(rules)) {
    if (rule instanceof CSSImportRule && rule.styleSheet) {
      collectCssFromSheet(rule.styleSheet, out)
      continue
    }
    out.push(rule.cssText)
  }
}

/**
 * 对齐旧版 vue-print-nb：把已解析的 cssRules 内联进打印文档。
 * 不要只复制 <link href>：iframe 是 about:blank，依赖缓存加载 CSS 会偶发丢样式。
 */
function collectPageCss(): string {
  const chunks: string[] = []
  for (const sheet of Array.from(document.styleSheets)) {
    collectCssFromSheet(sheet, chunks)
  }
  const adopted = document.adoptedStyleSheets
  if (adopted?.length) {
    for (const sheet of adopted) {
      collectCssFromSheet(sheet, chunks)
    }
  }
  return chunks.join('\n')
}

function buildPageRule(options?: PrintBySelectorOptions) {
  const margin = options?.pageMargin ?? '0'
  if (options?.pageWidthMm && options?.pageHeightMm) {
    return `@page { size: ${options.pageWidthMm}mm ${options.pageHeightMm}mm; margin: ${margin}; }`
  }
  return `@page { size: auto; margin: ${margin}; }`
}

const PRINT_RESET_CSS = `
  html, body {
    width: auto !important;
    height: auto !important;
    min-height: 0 !important;
    max-height: none !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: visible !important;
    background: #fff !important;
  }
  body > *:last-child {
    page-break-after: auto !important;
    break-after: auto !important;
  }
  body { box-sizing: border-box; }
  p, span { font-size: 14px; font-weight: 500; margin: 0; }
`

export function printBySelector(selector: string, options?: PrintBySelectorOptions) {
  const source = document.querySelector(selector)
  if (!source) {
    return
  }

  const run = () => {
    const iframe = document.createElement('iframe')
    iframe.setAttribute('title', 'print')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    iframe.style.visibility = 'hidden'

    const copyStyles = options?.copyStyles !== false
    const pageCss = copyStyles ? collectPageCss() : ''
    const html = options?.useOuterHtml ? source.outerHTML : source.innerHTML
    const docHtml = `<!DOCTYPE html><html>
      <head>
        <meta charset="utf-8" />
        <base href="${window.location.href}" />
        <title>print</title>
        <style type="text/css">${buildPageRule(options)}${PRINT_RESET_CSS}${pageCss}</style>
      </head>
      <body>${html}</body>
    </html>`

    let cleaned = false
    const cleanup = () => {
      if (cleaned) {
        return
      }
      cleaned = true
      iframe.remove()
    }

    iframe.addEventListener('load', () => {
      const win = iframe.contentWindow
      if (!win) {
        cleanup()
        return
      }

      const afterPrint = () => {
        win.removeEventListener('afterprint', afterPrint)
        cleanup()
      }
      win.addEventListener('afterprint', afterPrint)

      // 等一帧，确保内联样式完成应用后再唤起打印预览
      requestAnimationFrame(() => {
        win.focus()
        win.print()
      })

      // Chrome 部分版本 print() 非阻塞且不触发 afterprint，超时兜底
      window.setTimeout(cleanup, 60_000)
    })

    document.body.appendChild(iframe)
    iframe.srcdoc = docHtml
  }

  const delay = options?.delay ?? 0
  if (delay > 0) {
    setTimeout(run, delay)
    return
  }
  run()
}

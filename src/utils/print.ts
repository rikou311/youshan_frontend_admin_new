export interface PrintBySelectorOptions {
  pageWidthMm?: number
  pageHeightMm?: number
  /** CSS margin for @page, e.g. '0' | '0mm' | '30px' */
  pageMargin?: string
  delay?: number
  /** 使用 outerHTML（保留根节点 class，供打印样式命中） */
  useOuterHtml?: boolean
  /**
   * 是否复制当前页 style/link。
   * 标签打印建议关闭，避免全局 min-height/布局样式撑出空白第二页。
   * 默认 true（兼容纳品书等依赖页面样式的打印）。
   */
  copyStyles?: boolean
}

export function printBySelector(selector: string, options?: PrintBySelectorOptions) {
  const source = document.querySelector(selector)
  if (!source) {
    return
  }

  const run = () => {
    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    document.body.appendChild(iframe)

    const doc = iframe.contentDocument
    const win = iframe.contentWindow
    if (!doc || !win) {
      iframe.remove()
      return
    }

    const copyStyles = options?.copyStyles !== false
    const styles = copyStyles
      ? [...document.querySelectorAll('style, link[rel="stylesheet"]')]
          .map((node) => node.outerHTML)
          .join('')
      : ''

    const margin = options?.pageMargin ?? '0'
    // 对齐旧版 vue-print-nb：默认 size:auto，避免内容与固定纸张差 1px 就多出空白页
    const pageRule =
      options?.pageWidthMm && options?.pageHeightMm
        ? `@page { size: ${options.pageWidthMm}mm ${options.pageHeightMm}mm; margin: ${margin}; }`
        : `@page { size: auto; margin: ${margin}; }`

    const resetCss = `
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
    `

    const html = options?.useOuterHtml ? source.outerHTML : source.innerHTML

    doc.open()
    doc.write(
      `<!DOCTYPE html><html><head><title>print</title><style>${pageRule}${resetCss} body { box-sizing: border-box; } p, span { font-size: 14px; font-weight: 500; margin: 0; }</style>${styles}</head><body>${html}</body></html>`,
    )
    doc.close()

    win.focus()
    win.print()
    setTimeout(() => iframe.remove(), 1000)
  }

  const delay = options?.delay ?? 0
  if (delay > 0) {
    setTimeout(run, delay)
    return
  }
  run()
}

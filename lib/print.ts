export function printHtml(html: string) {
  try {
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(html)
    w.document.close()
    w.focus()
    w.print()
  } catch (e) {
    console.error('printHtml failed', e)
  }
}

export function printElementById(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Print</title></head><body>${el.innerHTML}</body></html>`
  printHtml(html)
}

export function downloadBlob(blob: Blob, filename: string) {
  try {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    try {
      a.click()
    } finally {
      try { URL.revokeObjectURL(url) } catch (e) {}
      try { if (a.parentNode) a.parentNode.removeChild(a) } catch (e) {}
    }
  } catch (e) {
    // Fallback: open in new tab
    try {
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        const w = window.open(dataUrl, '_blank')
        if (!w) console.warn('Could not open download window')
      }
      reader.readAsDataURL(blob)
    } catch (err) {
      console.error('downloadBlob failed', err)
    }
  }
}

export function downloadCsv(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: 'text/csv' })
  downloadBlob(blob, filename)
}

const isMobileDevice = () => {
  if (navigator.userAgentData) return navigator.userAgentData.mobile
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

async function doShare({ text, url }) {
  if (navigator.share && isMobileDevice()) {
    try {
      await navigator.share({ title: 'CommonGround', text, url })
      return null
    } catch (e) {
      if (e.name === 'AbortError') return null
    }
  }
  await navigator.clipboard.writeText(`${text} ${url}`)
  return { text, url }
}

export function sharePoint(pointId) {
  const text = 'Check out what people say about this area'
  const url = `https://commonground.page/map?point=${pointId}`
  return doShare({ text, url })
}

export function shareHex(cellId, zoom) {
  const text = 'Check out what people say about this area'
  const url = `https://commonground.page/map?hex=${cellId}&z=${Math.round(zoom)}`
  return doShare({ text, url })
}

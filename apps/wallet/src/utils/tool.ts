export const copyToClipboard = async (text: string) => {
  const isApiSupported = !!navigator.clipboard?.writeText
  let isAllowed = false
  try {
    const permission = await navigator.permissions?.query({ name: 'clipboard-write' } as any)
    isAllowed = permission && (permission.state === 'granted' || permission.state === 'prompt')
  } catch (e) {}
  if (!isApiSupported || !isAllowed) {
    legacyCopy(text)
  } else {
    await navigator.clipboard.writeText(text)
  }
}

const legacyCopy = (text: string) => {
  const ta = document.createElement('textarea')
  ta.value = text ?? ''
  ta.style.position = 'absolute'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  document.execCommand('copy')
  ta.remove()
}

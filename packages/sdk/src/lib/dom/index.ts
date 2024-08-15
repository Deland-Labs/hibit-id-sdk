import { CONTROLLER_CONTAINER_ID, IFRAME_CONTAINER_ID } from "../constants"
import { HibitEnv } from "../types"
import { clamp, getHibitIdUrl } from "../utils"
import './index.css'

export class HibitIdController {
  private container: HTMLDivElement
  private button: HTMLButtonElement
  private open = false
  private dragging = false
  private mouseDownStartAt = 0
  private lastTouchPosition = { x: 0, y: 0 }
  private onClick: () => void
  private onMove: (x: number, y: number) => void

  constructor(onClick: () => void, onMove: (x: number, y: number) => void) {
    this.onClick = onClick
    this.onMove = onMove

    const existed = document.getElementById(CONTROLLER_CONTAINER_ID)
    existed?.remove()
    const container = document.createElement('div')
    container.id = CONTROLLER_CONTAINER_ID
    const button = document.createElement('button')
    button.classList.add('hidden')
    button.addEventListener('mousedown', this.handleMouseDown)
    button.addEventListener('touchstart', this.handleTouchStart)
    container.appendChild(button)
    document.body.appendChild(container)
    
    this.container = container
    this.button = button
  }

  public getBoundingRect = () => {
    return this.container.getBoundingClientRect()
  }

  public setOpen = (open: boolean) => {
    if (open) {
      this.button.classList.remove('hidden')
      this.button.classList.add('show')
    } else {
      this.button.classList.remove('show')
      this.button.classList.add('hidden')
    }
    this.open = open
  }

  public destroy = () => {
    this.container?.remove()
  }

  private handleClick = () => {
    this.onClick?.()
    this.setOpen(!this.open)
  }

  private handleMouseDown = (ev: MouseEvent) => {
    ev.preventDefault()
    ev.stopPropagation()
    this.dragging = true
    this.mouseDownStartAt = Date.now()
    window.addEventListener('mouseup', this.handleMouseUp)
    window.addEventListener('mousemove', this.handleMouseMove)
  }

  private handleTouchStart = (ev: TouchEvent) => {
    ev.preventDefault()
    ev.stopPropagation()
    this.dragging = true
    this.mouseDownStartAt = Date.now()
    this.lastTouchPosition = { x: ev.touches[0].clientX, y: ev.touches[0].clientY }
    window.addEventListener('touchend', this.handleTouchEnd)
    window.addEventListener('touchmove', this.handleTouchMove)
  }

  private handleMouseUp = (ev: MouseEvent) => {
    ev.preventDefault()
    ev.stopPropagation()
    this.dragging = false
    if (Date.now() - this.mouseDownStartAt < 200) {
      this.handleClick()
    }
    window.removeEventListener('mouseup', this.handleMouseUp)
    window.removeEventListener('mousemove', this.handleMouseMove)
  }

  private handleTouchEnd = (ev: TouchEvent) => {
    ev.preventDefault()
    ev.stopPropagation()
    this.dragging = false
    if (Date.now() - this.mouseDownStartAt < 200) {
      this.handleClick()
    }
    window.removeEventListener('touchend', this.handleTouchEnd)
    window.removeEventListener('touchmove', this.handleTouchMove)
  }

  private handleMouseMove = (ev: MouseEvent) => {
    ev.stopPropagation()
    if (this.dragging) {
      const rect = this.getBoundingRect()
      const right = clamp(0, window.innerWidth - rect.right - ev.movementX, window.innerWidth - rect.width)
      const bottom = clamp(0, window.innerHeight - rect.bottom - ev.movementY, window.innerHeight - rect.height)
      this.container.style.right = `${right}px`
      this.container.style.bottom = `${bottom}px`
      this.onMove(ev.clientX, ev.clientY)
    }
  }

  private handleTouchMove = (ev: TouchEvent) => {
    ev.stopPropagation()
    if (this.dragging) {
      const movement = {
        x: ev.touches[0].clientX - this.lastTouchPosition.x,
        y: ev.touches[0].clientY - this.lastTouchPosition.y,
      }
      this.lastTouchPosition = { x: ev.touches[0].clientX, y: ev.touches[0].clientY }
      const rect = this.getBoundingRect()
      const right = clamp(0, window.innerWidth - rect.right - movement.x, window.innerWidth - rect.width)
      const bottom = clamp(0, window.innerHeight - rect.bottom - movement.y, window.innerHeight - rect.height)
      this.container.style.right = `${right}px`
      this.container.style.bottom = `${bottom}px`
      this.onMove(ev.touches[0].clientX, ev.touches[0].clientY)
    }
  }
}

export class HibitIdIframe {
  public iframe: HTMLIFrameElement
  private container: HTMLDivElement
  private _visible = false

  constructor(env: HibitEnv, urlAppendix: string = '') {
    const existed = document.getElementById(IFRAME_CONTAINER_ID)
    if (existed) {
      this.container = existed as HTMLDivElement
      this.iframe = this.container.querySelector('iframe') as HTMLIFrameElement
      return
    }
    const container = document.createElement('div')
    container.id = IFRAME_CONTAINER_ID
    const iframe = document.createElement('iframe')
    iframe.src = `${getHibitIdUrl(env)}${urlAppendix}`
    iframe.allow='clipboard-write; publickey-credentials-get *; publickey-credentials-create *'
    container.appendChild(iframe)
    document.body.appendChild(container)
    this.container = container
    this.iframe = iframe
    this.hide()
  }

  get visible() {
    return this._visible
  }

  public updateStyle = (style: Record<string, string>) => {
    Object.keys(style).forEach((key) => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      this.container.style[key] = style[key]
    })
  }

  public show = (options: {
    fullscreen: boolean,
    style: Record<string, string>
  }) => {
    if (options.fullscreen) {
      this.updateStyle({
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        bottom: 'unset',
        right: 'unset',
      })
    } else {
      this.updateStyle({
        top: 'unset',
        left: 'unset',
        ...options.style
      })
    }
    this._visible = true
  }

  public hide = () => {
    this.container.style.width = '0'
    this.container.style.height = '0'
    this._visible = false
  }

  public destroy = () => {
    this.container?.remove()
  }
}

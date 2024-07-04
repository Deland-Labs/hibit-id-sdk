import { CONTROLLER_CONTAINER_ID, IFRAME_CONTAINER_ID } from "../constants"
import { HibitEnv, HibitIdPage } from "../types"
import { getHibitIdUrl } from "../utils"
import './index.css'

export class HibitIdController {
  private container: HTMLDivElement
  private button: HTMLButtonElement
  private open = false

  constructor(onClick: () => void) {
    const existed = document.getElementById(CONTROLLER_CONTAINER_ID)
    existed?.remove()
    const container = document.createElement('div')
    container.id = CONTROLLER_CONTAINER_ID
    const button = document.createElement('button')
    button.classList.add('hidden')
    button.onclick = this.getClickHandler(onClick)
    container.appendChild(button)
    document.body.appendChild(container)
    
    this.container = container
    this.button = button
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

  private getClickHandler = (onClick: () => void) => {
    return () => {
      onClick()
      this.setOpen(!this.open)
    }
  }
}

export class HibitIdIframe {
  public iframe: HTMLIFrameElement
  private container: HTMLDivElement
  private _visible = true

  constructor(env: HibitEnv, initialPage: HibitIdPage = 'login') {
    const existed = document.getElementById(IFRAME_CONTAINER_ID)
    existed?.remove()
    const container = document.createElement('div')
    container.id = IFRAME_CONTAINER_ID
    const iframe = document.createElement('iframe')
    iframe.src = getHibitIdUrl(env, initialPage)
    iframe.allow='publickey-credentials-get *; publickey-credentials-create *'
    container.appendChild(iframe)
    document.body.appendChild(container)
    this.container = container
    this.iframe = iframe
    this.show()
  }

  get visible() {
    return this._visible
  }

  public show = () => {
    this.container.style.width = '100%'
    this.container.style.height = '100%'
    this._visible = true
  }

  public hide = () => {
    this.container.style.width = '0'
    this.container.style.height = '0'
    this._visible = false
  }

  public toggle = () => {
    if (this._visible) {
      this.hide()
    } else {
      this.show()
    }
  }

  public destroy = () => {
    this.container?.remove()
  }
}

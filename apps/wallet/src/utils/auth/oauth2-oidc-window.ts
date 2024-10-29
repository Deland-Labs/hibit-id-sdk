class OAuth2OidcWindow {
  public readonly url: string;
  public readonly redirectOrigin: string;

  private window: WindowProxy | null = null
  private promise: Promise<boolean> | null = null
  private _iid: number | null = null;

  constructor(url: string, redirectOrigin: string) {
    this.url = url;
    this.redirectOrigin = redirectOrigin;
  }

  open() {
    const { url } = this;
    this.window = window.open(url, 'oauth2-oidc', 'popup=1,width=800,height=600');
  }

  close() {
    this.cancel();
    this.window?.close();
  }

  poll() {
    this.promise = new Promise((resolve, reject) => {
      this._iid = window.setInterval(() => {
        try {
          const popup = this.window;
          if (!popup || popup.closed !== false) {
            this.close();
            reject(new Error('The popup was closed by user'));
            return;
          }
          if (popup.location.origin !== this.redirectOrigin) {
            return;
          }
          resolve(true);
          this.close();
        } catch (error) {
          /*
           * Ignore DOMException: Blocked a frame with origin from accessing a
           * cross-origin frame.
           */
        }
      }, 500);
    });
  }

  cancel() {
    if (this._iid) {
      window.clearInterval(this._iid);
      this._iid = null;
    }
  }

  then(onSuccess: () => void) {
    return this.promise?.then(onSuccess);
  }

  catch(onError: (err: Error) => void) {
    return this.promise?.catch(onError);
  }

  static open(url: string, redirectOrigin: string) {
    const popup = new OAuth2OidcWindow(url, redirectOrigin);
    popup.open();
    popup.poll();
    return popup;
  }
}

export default OAuth2OidcWindow;

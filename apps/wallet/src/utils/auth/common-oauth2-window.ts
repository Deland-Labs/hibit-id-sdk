import { queryToObj, objToQuery } from '../url';

class CommonOAuth2Window<TResult extends object> {
  public readonly id: string;
  public readonly url: string;
  public readonly featureParams: Record<string, string>;

  private window: WindowProxy | null = null
  private promise: Promise<TResult> | null = null
  private _iid: number | null = null;

  constructor(id: string, url: string, featureParams: Record<string, string> = {}) {
    this.id = id;
    this.url = url;
    this.featureParams = featureParams;
  }

  open() {
    const { url, id, featureParams } = this;
    this.window = window.open(url, id, objToQuery(featureParams, ','));
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
          if (popup.location.href === this.url || popup.location.pathname === 'blank') {
            return;
          }
          const params = queryToObj<TResult>(popup.location.search);
          resolve(params);
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

  then(onSuccess: (result: TResult) => void) {
    return this.promise?.then(onSuccess);
  }

  catch(onError: (err: Error) => void) {
    return this.promise?.catch(onError);
  }

  static open(id: string, url: string, featureParams: Record<string, string> = {}) {
    const popup = new CommonOAuth2Window(id, url, featureParams);
    popup.open();
    popup.poll();
    return popup;
  }
}

export default CommonOAuth2Window;

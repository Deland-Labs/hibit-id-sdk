import {
  ConnectEventError,
  DeviceInfo,
  DisconnectEvent,
  DisconnectRpcResponseError,
  SendTransactionRpcResponseError,
  SignDataRpcResponseError
} from '@tonconnect/protocol';

const getPlatform = (): DeviceInfo['platform'] => {
  const platform =
    (window.navigator as any)?.userAgentData?.platform ||
    window.navigator.platform;

  const userAgent = window.navigator.userAgent;

  const macosPlatforms = ['macOS', 'Macintosh', 'MacIntel', 'MacPPC', 'Mac68K'];
  const windowsPlatforms = ['Win32', 'Win64', 'Windows', 'WinCE'];
  const iphonePlatforms = ['iPhone'];
  const iosPlatforms = ['iPad', 'iPod'];

  let os: DeviceInfo['platform'] | null = null;

  if (macosPlatforms.indexOf(platform) !== -1) {
    os = 'mac';
  } else if (iphonePlatforms.indexOf(platform) !== -1) {
    os = 'iphone';
  } else if (iosPlatforms.indexOf(platform) !== -1) {
    os = 'ipad';
  } else if (windowsPlatforms.indexOf(platform) !== -1) {
    os = 'windows';
  } else if (/Android/.test(userAgent)) {
    os = 'linux';
  } else if (/Linux/.test(platform)) {
    os = 'linux';
  }

  return os!;
};

export const getDeviceInfo = (): DeviceInfo => {
  return {
    platform: getPlatform()!,
    appName: 'hibitid',
    appVersion: import.meta.env.VITE_RELEASE_VERSION,
    maxProtocolVersion: 2,
    features: [
      'SendTransaction',
      {
        name: 'SendTransaction',
        maxMessages: 4
      }
    ]
  };
};

export function* generateEventId(): Generator<number, number, number> {
  let nonce = 1;
  while (true) {
    yield nonce;
    nonce++;
  }
}

export const makeConnectErrorEvent = (
  id: number,
  code: number,
  message: string
): ConnectEventError => {
  return {
    event: 'connect_error',
    id,
    payload: {
      code,
      message
    }
  };
};

export const makeTransactionResponseError = (
  id: string,
  code: number,
  message: string
): SendTransactionRpcResponseError => {
  return {
    error: {
      code,
      message
    },
    id
  };
};

export const makeSignDataResponseError = (
  id: string,
  code: number,
  message: string
): SignDataRpcResponseError => {
  return {
    error: {
      code,
      message
    },
    id
  };
};

export const makeDisconnectResponseError = (
  id: string,
  code: number,
  message: string
): DisconnectRpcResponseError => {
  return {
    error: {
      code,
      message
    },
    id
  };
};

export const makeDisconnectEvent = (id: number): DisconnectEvent => {
  return {
    event: 'disconnect',
    id,
    payload: {}
  };
};

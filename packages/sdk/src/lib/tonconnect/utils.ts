import { DeviceInfo } from "@tonconnect/protocol";

const getPlatform = (): DeviceInfo["platform"] => {
  const platform =
    (window.navigator as any)?.userAgentData?.platform ||
    window.navigator.platform;

  const userAgent = window.navigator.userAgent;

  const macosPlatforms = ["macOS", "Macintosh", "MacIntel", "MacPPC", "Mac68K"];
  const windowsPlatforms = ["Win32", "Win64", "Windows", "WinCE"];
  const iphonePlatforms = ["iPhone"];
  const iosPlatforms = ["iPad", "iPod"];

  let os: DeviceInfo["platform"] | null = null;

  if (macosPlatforms.indexOf(platform) !== -1) {
    os = "mac";
  } else if (iphonePlatforms.indexOf(platform) !== -1) {
    os = "iphone";
  } else if (iosPlatforms.indexOf(platform) !== -1) {
    os = "ipad";
  } else if (windowsPlatforms.indexOf(platform) !== -1) {
    os = "windows";
  } else if (/Android/.test(userAgent)) {
    os = "linux";
  } else if (/Linux/.test(platform)) {
    os = "linux";
  }

  return os!;
}

export const getDeviceInfo = (): DeviceInfo => {
  return {
    platform: getPlatform()!,
    appName: "HibitID",
    appVersion: import.meta.env.VITE_RELEASE_VERSION,
    maxProtocolVersion: 2,
    features: [
      "SendTransaction",
      {
        name: "SendTransaction",
        maxMessages: 4,
      },
    ],
  };
};

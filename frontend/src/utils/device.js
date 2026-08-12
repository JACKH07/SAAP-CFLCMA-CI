export function isIOSDevice() {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export function isChromeIOS() {
  return isIOSDevice() && /CriOS/i.test(navigator.userAgent);
}

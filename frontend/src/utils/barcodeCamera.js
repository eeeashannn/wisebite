import { Html5Qrcode } from 'html5-qrcode';

/**
 * Helpers for Html5Qrcode on mobile: secure context, error copy, and rear-camera fallback.
 */

export const CAMERA_HTTPS_MESSAGE =
  'Camera needs a secure connection (HTTPS). On your phone, do not use http:// with your Wi‑Fi address—use HTTPS or enter the barcode manually below.';

/**
 * @returns {boolean} true if camera APIs should work in this context
 */
export function isCameraSecureContext() {
  if (typeof window === 'undefined') return true;
  return window.isSecureContext === true;
}

/**
 * @param {unknown} err
 * @returns {string}
 */
export function normalizeScannerError(err) {
  const msg = String(err?.message ?? err ?? '');
  if (/notallowederror|permission denied|denied|not allowed/i.test(msg)) {
    return 'Camera access was denied. Allow camera for this site in your browser settings.';
  }
  if (/notfounderror|no camera|no devices|devices? found.*0/i.test(msg)) {
    return 'No camera was found on this device.';
  }
  if (/insecure|https|secure context|getusermedia/i.test(msg)) {
    return CAMERA_HTTPS_MESSAGE;
  }
  if (/Cannot stop|not running|paused/i.test(msg)) {
    return 'Camera stopped unexpectedly. Try starting again.';
  }
  return 'Could not start the camera. Use manual entry below.';
}

function isLikelyMobileDevice() {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function startByCameraId(scanner, config, onDecoded, onScanFailure) {
  return Html5Qrcode.getCameras().then((cameras) => {
    if (!cameras || cameras.length === 0) {
      throw new Error('No camera found.');
    }
    const back = cameras.find((c) => /back|rear|environment/i.test(c.label || ''));
    const cameraId = back ? back.id : cameras[0].id;
    return scanner.start(cameraId, config, onDecoded, onScanFailure);
  });
}

function startByFacingMode(scanner, config, onDecoded, onScanFailure) {
  return scanner.start(
    { facingMode: { ideal: 'environment' } },
    config,
    onDecoded,
    onScanFailure
  );
}

/**
 * Desktop: enumerate cameras first (USB webcams rarely support facingMode).
 * Mobile: try environment camera first (labels often empty until permitted), then device ids.
 *
 * @param {import('html5-qrcode').Html5Qrcode} scanner
 * @param {object} config Html5Qrcode scan config (fps, qrbox, etc.)
 * @param {(text: string) => void} onDecoded
 * @param {() => void} onScanFailure
 * @returns {Promise<void>}
 */
export function startBarcodeScannerWithFallback(scanner, config, onDecoded, onScanFailure) {
  if (isLikelyMobileDevice()) {
    return startByFacingMode(scanner, config, onDecoded, onScanFailure).catch(() =>
      startByCameraId(scanner, config, onDecoded, onScanFailure)
    );
  }
  return startByCameraId(scanner, config, onDecoded, onScanFailure).catch(() =>
    startByFacingMode(scanner, config, onDecoded, onScanFailure)
  );
}

/**
 * Release camera and clear the mount div (needed after failed starts and React StrictMode remounts).
 * @param {import('html5-qrcode').Html5Qrcode | null | undefined} scanner
 */
export function clearHtml5ScannerMount(scanner) {
  if (!scanner) return;
  try {
    scanner.clear();
  } catch {
    /* ignore */
  }
}

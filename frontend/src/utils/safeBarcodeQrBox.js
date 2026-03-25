/**
 * Html5Qrcode qrbox callback. Stays strictly inside the viewfinder (library throws
 * if qrbox > video) and respects MIN_QR_BOX_SIZE (50). Never uses a fixed minimum
 * width that could exceed a narrow viewfinder.
 */
export function safeBarcodeQrBox(viewfinderWidth, viewfinderHeight) {
  const vw = Math.max(1, Number(viewfinderWidth) || 1);
  const vh = Math.max(1, Number(viewfinderHeight) || 1);

  // On iOS Safari the first callback can arrive with tiny dimensions (e.g. 1x1).
  // Returning an invalid/negative qrbox causes Html5Qrcode startup to fail.
  if (vw < 80 || vh < 80) {
    return { width: 50, height: 50 };
  }

  const pad = 10;
  const maxW = Math.max(50, Math.floor(vw - pad));
  const maxH = Math.max(50, Math.floor(vh - pad));

  const targetW = Math.floor(vw * 0.9);
  const targetH = Math.floor(vh * 0.58);

  const w = Math.max(50, Math.min(targetW, maxW));
  const h = Math.max(50, Math.min(targetH, maxH));

  return { width: w, height: h };
}

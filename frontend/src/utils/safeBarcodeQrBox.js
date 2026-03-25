/**
 * Html5Qrcode qrbox callback. Stays strictly inside the viewfinder (library throws
 * if qrbox > video) and respects MIN_QR_BOX_SIZE (50). Never uses a fixed minimum
 * width that could exceed a narrow viewfinder.
 */
export function safeBarcodeQrBox(viewfinderWidth, viewfinderHeight) {
  const vw = Math.max(1, viewfinderWidth);
  const vh = Math.max(1, viewfinderHeight);
  const pad = 10;
  const maxW = vw - pad;
  const maxH = vh - pad;

  let w = Math.floor(Math.min(maxW, vw * 0.9));
  let h = Math.floor(Math.min(maxH, vh * 0.58));

  w = Math.min(Math.max(50, w), maxW);
  h = Math.min(Math.max(50, h), maxH);

  return { width: w, height: h };
}

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { IconCamera } from './Icons';
import AddItemModal from './AddItemModal';
import { safeBarcodeQrBox } from '../utils/safeBarcodeQrBox';
import './ScanPage.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000';
const SCAN_MOUNT_ID = 'scan-camera-mount';
const CAMERA_HTTPS_MESSAGE =
  'Camera needs a secure connection (HTTPS). On your phone, open the app over HTTPS or use manual entry below.';

function isLikelyMobileDevice() {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function isIOSDevice() {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function normalizeScannerError(err) {
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
  if (/overconstrainederror|constraint/i.test(msg)) {
    return 'Could not use this camera orientation on the device. Try again or use manual entry below.';
  }
  if (/notreadableerror|busy|in use/i.test(msg)) {
    return 'Camera is busy or not readable. Close other camera apps and try again.';
  }
  return 'Could not start the camera. Use manual entry below.';
}

async function preflightCameraDeviceId() {
  if (!navigator?.mediaDevices?.getUserMedia) {
    throw new Error('Camera API is not available in this browser.');
  }

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false,
    });
  } catch {
    // Fallback to generic video preflight, similar to WebRTC sample behavior.
    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  }

  try {
    const track = stream.getVideoTracks?.()[0];
    const settings = track?.getSettings?.() || {};
    return settings.deviceId || null;
  } finally {
    stream?.getTracks?.().forEach((t) => t.stop());
  }
}

function ScanPage({ items, onAddItemClick, onAddItem }) {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [prefill, setPrefill] = useState(null);
  const html5QrRef = useRef(null);
  const scannerStartedRef = useRef(false);

  const handleLookup = async (e) => {
    e?.preventDefault();
    const code = barcodeInput.trim();
    if (!code) {
      setLookupError('Enter a barcode number');
      return;
    }
    setLookupError(null);
    setLookupLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/barcode/${encodeURIComponent(code)}`);
      const data = await res.json();
      if (data.found) {
        setPrefill({
          name: data.name,
          category: data.category || 'Other',
          image_url: data.image_url,
          barcode: code,
          quantity: 1,
          unit: 'Pieces',
        });
        setShowAddModal(true);
      } else {
        setLookupError(data.error || 'Product not found.');
      }
    } catch {
      setLookupError('Could not reach server.');
    } finally {
      setLookupLoading(false);
    }
  };

  const stopCamera = useCallback(() => {
    setCameraActive(false);
    setCameraError(null);
    // Let the useEffect cleanup handle stopping the scanner to avoid
    // "Cannot transition to a new state, already under transition"
  }, []);

  const safeStopScanner = useCallback(() => {
    const scanner = html5QrRef.current;
    if (!scanner) return;

    const done = () => {
      try {
        scanner.clear?.();
      } catch {
        // ignore
      }
      html5QrRef.current = null;
      scannerStartedRef.current = false;
    };

    // If start never succeeded, stop() can throw; just clear.
    if (!scannerStartedRef.current) {
      done();
      return;
    }

    try {
      Promise.resolve(scanner.stop()).then(done).catch(done);
    } catch {
      done();
    }
  }, []);

  const lookupAndOpenModal = useCallback(async (code) => {
    const trimmed = String(code).trim();
    if (!trimmed) return;
    setLookupError(null);
    setLookupLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/barcode/${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (data.found) {
        setPrefill({
          name: data.name,
          category: data.category || 'Other',
          image_url: data.image_url,
          barcode: trimmed,
          quantity: 1,
          unit: 'Pieces',
        });
        setShowAddModal(true);
        stopCamera();
      } else {
        setLookupError(data.error || 'Product not found.');
      }
    } catch {
      setLookupError('Could not reach server.');
    } finally {
      setLookupLoading(false);
    }
  }, [stopCamera]);

  useEffect(() => {
    if (!cameraActive) return;
    setCameraError(null);
    scannerStartedRef.current = false;

    // iOS Safari requires secure contexts for camera APIs.
    if (typeof window !== 'undefined' && window.isSecureContext !== true) {
      setCameraError(CAMERA_HTTPS_MESSAGE);
      return undefined;
    }

    const scanner = new Html5Qrcode(SCAN_MOUNT_ID);
    html5QrRef.current = scanner;

    return () => {
      safeStopScanner();
    };
  }, [cameraActive, lookupAndOpenModal, safeStopScanner]);

  // Start camera after mount; keep this separate so cleanup is safe.
  useEffect(() => {
    if (!cameraActive) return;
    const scanner = html5QrRef.current;
    if (!scanner) return;

    const isMobile = isLikelyMobileDevice();
    const isIOS = isIOSDevice();

    const start = async () => {
      try {
        let preflightDeviceId = null;
        if (isMobile) {
          preflightDeviceId = await preflightCameraDeviceId();
        }

        if (isMobile) {
          if (preflightDeviceId) {
            await scanner.start(
              preflightDeviceId,
              isIOS ? { fps: 5 } : { fps: 5, qrbox: safeBarcodeQrBox },
              (decodedText) => lookupAndOpenModal(decodedText),
              () => {}
            );
            scannerStartedRef.current = true;
            return;
          }

          try {
            await scanner.start(
              { facingMode: { ideal: 'environment' } },
              isIOS ? { fps: 5 } : { fps: 5, qrbox: safeBarcodeQrBox },
              (decodedText) => lookupAndOpenModal(decodedText),
              () => {}
            );
          } catch (err1) {
            // Failed facingMode start; release constraints and retry by device id list.
            try {
              scanner.clear?.();
            } catch {
              // ignore
            }
            await Html5Qrcode.getCameras().then((cameras) => {
              if (!cameras || cameras.length === 0) throw err1;
              // iOS labels can be empty; first camera is often most reliable fallback.
              const back = cameras.find((c) => /back|rear|environment/i.test(c.label || ''));
              const cameraId = isIOS ? cameras[0].id : (back ? back.id : cameras[0].id);
              return scanner.start(
                cameraId,
                isIOS ? { fps: 5 } : { fps: 5, qrbox: safeBarcodeQrBox },
                (decodedText) => lookupAndOpenModal(decodedText),
                () => {}
              );
            });
          }
        } else {
          // Desktop: prefer camera id list (more reliable than facingMode on USB webcams).
          await Html5Qrcode.getCameras().then((cameras) => {
            if (!cameras || cameras.length === 0) throw new Error('No camera found.');
            const back = cameras.find((c) => /back|rear|environment/i.test(c.label || ''));
            const cameraId = back ? back.id : cameras[0].id;
            return scanner.start(
              cameraId,
              isIOS ? { fps: 10 } : { fps: 10, qrbox: safeBarcodeQrBox },
              (decodedText) => lookupAndOpenModal(decodedText),
              () => {}
            );
          });
        }
        scannerStartedRef.current = true;
      } catch (err) {
        setCameraError(normalizeScannerError(err));
      }
    };

    start();
  }, [cameraActive, lookupAndOpenModal]);

  return (
    <div className="scan-page">
      <h1 className="scan-page-title">Barcode Scanner</h1>
      <p className="scan-page-subtitle">Scan product barcodes to quickly add items to your pantry</p>

      <div className="scan-camera-area">
        {!cameraActive ? (
          <div className="scan-camera-placeholder">
            <span className="scan-camera-icon"><IconCamera size={48} /></span>
            <p className="scan-camera-status">Ready to Scan</p>
            <p className="scan-camera-hint">Position the barcode within the camera frame</p>
            <button
              type="button"
              className="scan-start-camera-btn"
              onClick={() => setCameraActive(true)}
            >
              Start Camera
            </button>
          </div>
        ) : (
          <div className="scan-camera-wrapper">
            <div id={SCAN_MOUNT_ID} className="scan-camera-mount" />
            {cameraError && <p className="scan-camera-error">{cameraError}</p>}
            {lookupLoading && <p className="scan-camera-loading">Looking up product…</p>}
            <button
              type="button"
              className="scan-start-camera-btn secondary"
              onClick={stopCamera}
              disabled={lookupLoading}
            >
              Stop camera
            </button>
          </div>
        )}
      </div>

      <div className="scan-manual">
        <h3 className="scan-manual-title">Enter Barcode Manually</h3>
        <form onSubmit={handleLookup} className="scan-manual-form">
          <input
            type="text"
            className="scan-manual-input"
            placeholder="Enter barcode number"
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
          />
          <button type="submit" className="scan-lookup-btn" disabled={lookupLoading}>
            {lookupLoading ? 'Looking up…' : 'Lookup'}
          </button>
        </form>
        <p className="scan-manual-hint">Try: 3017620422003, 5000112637588, or 5010477310842</p>
        {lookupError && <p className="scan-manual-error">{lookupError}</p>}
      </div>

      {showAddModal && prefill && (
        <AddItemModal
          isOpen={showAddModal}
          onClose={() => { setShowAddModal(false); setPrefill(null); }}
          onAddItem={(item) => {
            onAddItem(item);
            setShowAddModal(false);
            setPrefill(null);
          }}
          initialValues={prefill}
        />
      )}
    </div>
  );
}

export default ScanPage;

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { IconCamera } from './Icons';
import AddItemModal from './AddItemModal';
import { safeBarcodeQrBox } from '../utils/safeBarcodeQrBox';
import {
  CAMERA_HTTPS_MESSAGE,
  clearHtml5ScannerMount,
  isCameraSecureContext,
  normalizeScannerError,
  startBarcodeScannerWithFallback,
} from '../utils/barcodeCamera';
import './ScanPage.css';

import { getApiBaseUrl } from '../config';
const SCAN_MOUNT_ID = 'scan-camera-mount';

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

  const safeStopScanner = useCallback(() => {
    const scanner = html5QrRef.current;
    if (!scanner) {
      scannerStartedRef.current = false;
      return;
    }
    const done = () => {
      clearHtml5ScannerMount(scanner);
      html5QrRef.current = null;
      scannerStartedRef.current = false;
    };
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
      const res = await fetch(`${getApiBaseUrl()}/barcode/${encodeURIComponent(code)}`);
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

  const lookupAndOpenModal = useCallback(async (code) => {
    const trimmed = String(code).trim();
    if (!trimmed) return;
    setLookupError(null);
    setLookupLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/barcode/${encodeURIComponent(trimmed)}`);
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

    if (!isCameraSecureContext()) {
      setCameraError(CAMERA_HTTPS_MESSAGE);
      html5QrRef.current = null;
      return undefined;
    }

    const scanner = new Html5Qrcode(SCAN_MOUNT_ID);
    html5QrRef.current = scanner;
    const config = { fps: 10, qrbox: safeBarcodeQrBox };

    startBarcodeScannerWithFallback(
      scanner,
      config,
      (decodedText) => {
        lookupAndOpenModal(decodedText);
      },
      () => {}
    )
      .then(() => {
        scannerStartedRef.current = true;
      })
      .catch((err) => {
        setCameraError(normalizeScannerError(err));
      });

    return () => {
      safeStopScanner();
    };
  }, [cameraActive, lookupAndOpenModal, safeStopScanner]);

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

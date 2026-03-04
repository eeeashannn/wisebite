import React, { useState, useRef, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { IconCamera } from './Icons';
import AddItemModal from './AddItemModal';
import './ScanPage.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000';
const SCAN_MOUNT_ID = 'scan-camera-mount';

function ScanPage({ items, onAddItemClick, onAddItem }) {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState(null);
  const [product, setProduct] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [prefill, setPrefill] = useState(null);
  const html5QrRef = useRef(null);

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

  const lookupAndOpenModal = async (code) => {
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
  };

  const stopCamera = () => {
    setCameraActive(false);
    setCameraError(null);
    // Let the useEffect cleanup handle stopping the scanner to avoid
    // "Cannot transition to a new state, already under transition"
  };

  useEffect(() => {
    if (!cameraActive) return;
    setCameraError(null);
    const scanner = new Html5Qrcode(SCAN_MOUNT_ID);
    html5QrRef.current = scanner;

    const config = { fps: 10, qrbox: { width: 260, height: 160 } };

    Html5Qrcode.getCameras()
      .then((cameras) => {
        if (!cameras || cameras.length === 0) {
          setCameraError('No camera found.');
          return;
        }
        const back = cameras.find((c) => /back|rear|environment/i.test(c.label));
        const cameraId = back ? back.id : cameras[0].id;
        return scanner.start(cameraId, config, (decodedText) => {
          lookupAndOpenModal(decodedText);
        }, () => {});
      })
      .then(() => {})
      .catch((err) => {
        setCameraError(err?.message || 'Camera access failed. Use manual entry below.');
      });

    return () => {
      if (html5QrRef.current) {
        html5QrRef.current.stop().catch(() => {});
        html5QrRef.current = null;
      }
    };
  }, [cameraActive]);

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

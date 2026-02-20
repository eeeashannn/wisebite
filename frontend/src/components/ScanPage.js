import React, { useState } from 'react';
import { IconCamera } from './Icons';
import AddItemModal from './AddItemModal';
import './ScanPage.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000';

function ScanPage({ items, onAddItemClick, onAddItem }) {
  const [cameraActive, setCameraActive] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState(null);
  const [product, setProduct] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [prefill, setPrefill] = useState(null);

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

  const handleProductFromScanner = (productData) => {
    setPrefill(productData);
    setShowAddModal(true);
  };

  return (
    <div className="scan-page">
      <h1 className="scan-page-title">Barcode Scanner</h1>
      <p className="scan-page-subtitle">Scan product barcodes to quickly add items to your pantry</p>

      <div className="scan-camera-area">
        <div className="scan-camera-placeholder">
          {!cameraActive ? (
            <>
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
            </>
          ) : (
            <>
              <p className="scan-camera-status">Camera not available in this demo</p>
              <p className="scan-camera-hint">Use manual entry below</p>
              <button
                type="button"
                className="scan-start-camera-btn secondary"
                onClick={() => setCameraActive(false)}
              >
                Back
              </button>
            </>
          )}
        </div>
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

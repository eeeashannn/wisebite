import React, { useState } from 'react';
import './BarcodeScanner.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000';

function BarcodeScanner({ onProductFound, onClose }) {
  const [barcode, setBarcode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLookup = async (e) => {
    e?.preventDefault();
    const code = barcode.trim();
    if (!code) {
      setError('Enter a barcode number');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/barcode/${encodeURIComponent(code)}`);
      const data = await res.json();
      if (data.found) {
        onProductFound({
          name: data.name,
          category: data.category || 'Other',
          image_url: data.image_url,
          barcode: code,
          quantity: 1,
          unit: 'Pieces',
        });
        onClose?.();
      } else {
        setError(data.error || 'Product not found. Try another barcode.');
      }
    } catch (err) {
      setError('Could not reach server. Check backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="barcode-scanner-box">
      <h3 className="barcode-title">Smart Barcode Scan</h3>
      <p className="barcode-desc">Enter barcode or scan to auto-fill product details (Open Food Facts).</p>
      <form onSubmit={handleLookup} className="barcode-form">
        <input
          type="text"
          className="barcode-input"
          placeholder="e.g. 3017620422003"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          autoFocus
        />
        <button type="submit" className="barcode-btn" disabled={loading}>
          {loading ? 'Looking up…' : 'Look up product'}
        </button>
      </form>
      {error && <p className="barcode-error">{error}</p>}
      <button type="button" className="barcode-cancel" onClick={onClose}>Cancel</button>
    </div>
  );
}

export default BarcodeScanner;

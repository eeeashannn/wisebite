import React, { useState, useRef } from 'react';
import './ProduceScanner.css';

import { getApiBaseUrl } from '../../config';

const DISCLAIMER = 'This feature provides AI-based estimates and may not be 100% accurate.';

function ProduceScanner() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    setFile(f);
    setResult(null);
    setError(null);
    if (f) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  };

  const handleScan = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result?.split(',')[1];
        const res = await fetch(`${getApiBaseUrl()}/produce/scan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_base64: base64 }),
        });
        const data = await res.json();
        if (data.success) {
          setResult(data);
        } else {
          setError(data.error || 'Scan failed');
        }
        setLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Could not reach server.');
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const labels = { good: 'Fresh', fair: 'Use soon', use_soon: 'Use soon' };

  return (
    <div className="produce-scanner">
      <h2 className="produce-title">AI Fresh Produce Scanner</h2>
      <div className="produce-disclaimer">
        <strong>Disclaimer:</strong> {DISCLAIMER}
      </div>

      <div className="produce-upload">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="produce-input"
        />
        {preview ? (
          <div className="produce-preview-wrap">
            <img src={preview} alt="Produce" className="produce-preview" />
            <button type="button" className="produce-scan-btn" onClick={handleScan} disabled={loading}>
              {loading ? 'Analyzing…' : 'Estimate freshness'}
            </button>
            <button type="button" className="produce-reset" onClick={reset}>Choose another image</button>
          </div>
        ) : (
          <button type="button" className="produce-choose" onClick={() => inputRef.current?.click()}>
            Upload image of produce
          </button>
        )}
      </div>

      {error && <p className="produce-error">{error}</p>}

      {result && (
        <div className="produce-result">
          <p className="produce-estimate">{labels[result.estimate] || result.estimate}</p>
          <p className="produce-message">{result.message}</p>
          <p className="produce-suggestion">{result.suggestion}</p>
        </div>
      )}
    </div>
  );
}

export default ProduceScanner;

import React, { useState, useRef } from 'react';
import { IconWarning, IconCamera, IconUpload } from './Icons';
import './ProduceAIPage.css';

import { getApiBaseUrl } from '../config';
const DISCLAIMER_TITLE = 'AI-Generated Estimate';
const DISCLAIMER_TEXT = 'This analysis is provided by AI and may not be 100% accurate. Always use your own judgment when assessing food freshness.';

function ProduceAIPage() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    setResult(null);
    setError(null);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result);
    reader.readAsDataURL(f);
  };

  const onFileChange = (e) => {
    handleFile(e.target.files?.[0]);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const onDragLeave = () => setDragOver(false);

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
    } catch {
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
    <div className="produce-page">
      <h1 className="produce-page-title">AI Fresh Produce Scanner</h1>
      <p className="produce-page-subtitle">Upload images of fresh produce to estimate ripeness</p>

      <div className="produce-disclaimer">
        <p className="produce-disclaimer-title">
          <span className="produce-disclaimer-icon"><IconWarning size={18} /></span> {DISCLAIMER_TITLE}
        </p>
        <p className="produce-disclaimer-text">{DISCLAIMER_TEXT}</p>
      </div>

      <div className="produce-upload-zone">
        <div
          className={`produce-drop-area ${dragOver ? 'drag-over' : ''} ${preview ? 'has-preview' : ''}`}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={onFileChange}
            className="produce-file-input"
          />
          {preview ? (
            <img src={preview} alt="Produce" className="produce-preview-img" />
          ) : (
            <>
              <span className="produce-upload-arrow"><IconUpload size={48} /></span>
              <p className="produce-upload-title">Upload Produce Image</p>
              <p className="produce-upload-hint">Click to browse or drag and drop an image</p>
              <p className="produce-upload-types">Supports JPG, PNG, WEBP up to 10MB</p>
            </>
          )}
        </div>
        <button
          type="button"
          className="produce-upload-btn"
          onClick={preview ? handleScan : () => inputRef.current?.click()}
          disabled={loading}
        >
          <span className="produce-upload-btn-icon"><IconCamera size={20} /></span>
          {preview ? (loading ? 'Analyzing…' : 'Estimate freshness') : 'Take Photo / Upload Image'}
        </button>
        {preview && !loading && (
          <button type="button" className="produce-reset-btn" onClick={reset}>
            Choose another image
          </button>
        )}
      </div>

      {error && <p className="produce-error">{error}</p>}

      {result && (
        <div className="produce-result">
          <p className="produce-estimate-label">{labels[result.estimate] || result.estimate}</p>
          {result.detected_produce && <p className="produce-result-message">Detected produce: {result.detected_produce}</p>}
          {typeof result.confidence === "number" && <p className="produce-result-message">Confidence: {Math.round(result.confidence * 100)}%</p>}
          {result.risk_level && <p className="produce-result-message">Risk level: {result.risk_level}</p>}
          <p className="produce-result-message">{result.message}</p>
          <p className="produce-result-suggestion">{result.suggestion}</p>
        </div>
      )}
    </div>
  );
}

export default ProduceAIPage;

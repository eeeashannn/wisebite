import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { IconClose, IconCamera, IconCalendar } from './Icons';
import { safeBarcodeQrBox } from '../utils/safeBarcodeQrBox';
import {
  CAMERA_HTTPS_MESSAGE,
  clearHtml5ScannerMount,
  isCameraSecureContext,
  normalizeScannerError,
  startBarcodeScannerWithFallback,
} from '../utils/barcodeCamera';
import './AddItemModal.css';

import { getApiBaseUrl } from '../config';
const MODAL_CAMERA_MOUNT_ID = 'add-modal-camera-mount';

const CATEGORIES = ['Other', 'Dairy', 'Meat', 'Vegetables', 'Fruits', 'Bakery', 'Pantry', 'Beverages', 'Frozen', 'Snacks'];
const UNITS = ['Pieces', 'Kilograms', 'Grams', 'Liters', 'Milliliters', 'Packages', 'Boxes', 'Bottles'];

const defaultForm = {
  name: '',
  category: 'Other',
  expiryDate: '',
  quantity: 1,
  unit: 'Pieces',
  purchaseDate: '',
  notes: '',
  image_url: '',
  barcode: '',
};

function AddItemModal({ isOpen, onClose, onAddItem, onUpdateItem, initialValues }) {
  const [formData, setFormData] = useState(defaultForm);
  const [errors, setErrors] = useState({});
  const [showBarcode, setShowBarcode] = useState(false);
  const [showOptional, setShowOptional] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const cameraRef = useRef(null);
  const scannerStartedRef = useRef(false);
  const isEdit = !!(initialValues && initialValues.id);

  const safeStopScanner = () => {
    const scanner = cameraRef.current;
    if (!scanner) {
      scannerStartedRef.current = false;
      return;
    }
    const done = () => {
      clearHtml5ScannerMount(scanner);
      cameraRef.current = null;
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
  };

  useEffect(() => {
    if (isOpen && initialValues) {
      setFormData({
        name: initialValues.name || '',
        category: initialValues.category || 'Other',
        expiryDate: initialValues.expiry || '',
        quantity: initialValues.quantity ?? 1,
        unit: initialValues.unit || 'Pieces',
        purchaseDate: initialValues.added_date || '',
        notes: (initialValues.notes || '').trim(),
        image_url: initialValues.image_url || '',
        barcode: initialValues.barcode || '',
      });
    } else if (isOpen) {
      setFormData(defaultForm);
    }
  }, [isOpen, initialValues]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'quantity') {
      if (value === '') {
        setFormData((prev) => ({ ...prev, quantity: '' }));
      } else {
        const n = Number(value);
        if (!Number.isNaN(n)) {
          setFormData((prev) => ({ ...prev, quantity: n }));
        }
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const normalizeQuantity = (q) => {
    if (q === '' || q === null || q === undefined) return 1;
    const n = Number(q);
    return Number.isFinite(n) && n > 0 ? n : 1;
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Item name is required';
    if (!formData.expiryDate) newErrors.expiryDate = 'Expiry date is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const formatDate = (dateString) => {
    if (!dateString) return null;
    if (dateString.includes('/')) {
      const [day, month, year] = dateString.split('/');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return dateString;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    const payload = {
      name: formData.name.trim(),
      category: formData.category,
      expiry: formatDate(formData.expiryDate),
      quantity: normalizeQuantity(formData.quantity),
      unit: formData.unit,
      notes: formData.notes.trim(),
      image_url: formData.image_url || undefined,
      barcode: formData.barcode || undefined,
      added_date: formatDate(formData.purchaseDate) || undefined,
    };
    if (isEdit && initialValues.id) {
      onUpdateItem?.({ ...payload, id: initialValues.id });
    } else {
      onAddItem(payload);
    }
    setFormData(defaultForm);
    setErrors({});
    setShowBarcode(false);
    onClose();
  };

  const lookupBarcodeAndFill = async (code) => {
    const trimmed = String(code).trim();
    if (!trimmed) return;
    setCameraError(null);
    setLookupLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/barcode/${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (data.found) {
        setFormData(prev => ({
          ...prev,
          name: data.name || prev.name,
          category: data.category || 'Other',
          image_url: data.image_url || prev.image_url,
          barcode: trimmed,
          quantity: data.quantity ?? prev.quantity,
          unit: data.unit || prev.unit,
        }));
        setShowBarcode(false);
      } else {
        setCameraError(data.error || 'Product not found. Try again.');
      }
    } catch {
      setCameraError('Could not reach server.');
    } finally {
      setLookupLoading(false);
    }
  };

  useEffect(() => {
    if (!showBarcode || !isOpen) return;
    setCameraError(null);
    scannerStartedRef.current = false;

    if (!isCameraSecureContext()) {
      setCameraError(CAMERA_HTTPS_MESSAGE);
      cameraRef.current = null;
      return undefined;
    }

    const scanner = new Html5Qrcode(MODAL_CAMERA_MOUNT_ID);
    cameraRef.current = scanner;
    const config = { fps: 10, qrbox: safeBarcodeQrBox };

    startBarcodeScannerWithFallback(
      scanner,
      config,
      (decodedText) => {
        lookupBarcodeAndFill(decodedText);
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
  }, [showBarcode, isOpen]);

  const handleClose = () => {
    setFormData(defaultForm);
    setErrors({});
    setShowBarcode(false);
    setShowOptional(false);
    setCameraError(null);
    setLookupLoading(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Edit Item' : 'Add New Item'}</h2>
          <button type="button" className="modal-close" onClick={handleClose} aria-label="Close"><IconClose size={24} /></button>
        </div>

        {!showBarcode ? (
          <>
            <div className="add-item-mode-bar">
              <div className="add-item-mode-switch" role="tablist" aria-label="How to add item">
                <button type="button" className="mode-segment active" aria-selected="true">
                  Manual entry
                </button>
                <button
                  type="button"
                  className="mode-segment"
                  aria-selected="false"
                  onClick={() => setShowBarcode(true)}
                >
                  <IconCamera size={18} aria-hidden /> Scan barcode
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="add-item-form add-item-form-compact">
              <div className="form-row form-row-2">
                <div className="form-group full-width">
                  <label htmlFor="name">Name <span className="required">*</span></label>
                  <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Milk" className={errors.name ? 'error' : ''} />
                  {errors.name && <span className="error-message">{errors.name}</span>}
                </div>
              </div>
              <div className="form-row form-row-2">
                <div className="form-group">
                  <label htmlFor="category">Category</label>
                  <select id="category" name="category" value={formData.category} onChange={handleChange}>
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="expiryDate">Expiry <span className="required">*</span></label>
                  <div className="date-input-wrapper">
                    <input type="date" id="expiryDate" name="expiryDate" value={formData.expiryDate} onChange={handleChange} className={errors.expiryDate ? 'error' : ''} />
                    <span className="calendar-icon"><IconCalendar size={18} /></span>
                  </div>
                  {errors.expiryDate && <span className="error-message">{errors.expiryDate}</span>}
                </div>
              </div>
              <div className="form-row form-row-2">
                <div className="form-group">
                  <label htmlFor="quantity">Quantity</label>
                  <input
                    type="number"
                    id="quantity"
                    name="quantity"
                    value={formData.quantity === '' ? '' : formData.quantity}
                    onChange={handleChange}
                    onBlur={() => {
                      setFormData((prev) => ({
                        ...prev,
                        quantity: normalizeQuantity(prev.quantity),
                      }));
                    }}
                    min="1"
                    step="any"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="unit">Unit</label>
                  <select id="unit" name="unit" value={formData.unit} onChange={handleChange}>
                    {UNITS.map(unit => <option key={unit} value={unit}>{unit}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-optional">
                <button type="button" className="form-optional-toggle" onClick={() => setShowOptional((v) => !v)} aria-expanded={showOptional}>
                  {showOptional ? 'Hide optional fields' : 'Add optional details'}
                </button>
                {showOptional && (
                  <div className="form-optional-fields">
                    <div className="form-row form-row-2">
                      <div className="form-group">
                        <label htmlFor="purchaseDate">Purchase date</label>
                        <div className="date-input-wrapper">
                          <input type="date" id="purchaseDate" name="purchaseDate" value={formData.purchaseDate} onChange={handleChange} />
                          <span className="calendar-icon"><IconCalendar size={18} /></span>
                        </div>
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group full-width">
                        <label htmlFor="notes">Notes</label>
                        <textarea id="notes" name="notes" value={formData.notes} onChange={handleChange} placeholder="Optional notes..." rows="2" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={handleClose}>Cancel</button>
                <button type="submit" className="btn-add">
                  {isEdit ? 'Save changes' : <><span className="add-icon">+</span> Add Item</>}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="add-modal-scan">
            <div className="add-modal-scan-header">
              <p className="add-modal-scan-hint">Point your camera at the barcode</p>
              <button
                type="button"
                className="add-modal-back-btn"
                onClick={() => {
                  setShowBarcode(false);
                  setCameraError(null);
                }}
              >
                Back to form
              </button>
            </div>
            <div className="add-modal-camera-wrap">
              <div id={MODAL_CAMERA_MOUNT_ID} className="add-modal-camera-mount" />
              {cameraError && <p className="add-modal-camera-error">{cameraError}</p>}
              {lookupLoading && <p className="add-modal-camera-loading">Looking up product…</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AddItemModal;

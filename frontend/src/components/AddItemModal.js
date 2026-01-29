import React, { useState } from 'react';
import './AddItemModal.css';

const CATEGORIES = [
  'Other',
  'Dairy',
  'Meat',
  'Vegetables',
  'Fruits',
  'Bakery',
  'Pantry',
  'Beverages',
  'Frozen',
  'Snacks'
];

const UNITS = [
  'Pieces',
  'Kilograms',
  'Grams',
  'Liters',
  'Milliliters',
  'Packages',
  'Boxes',
  'Bottles'
];

function AddItemModal({ isOpen, onClose, onAddItem }) {
  const [formData, setFormData] = useState({
    name: '',
    category: 'Other',
    expiryDate: '',
    quantity: 1,
    unit: 'Pieces',
    purchaseDate: '',
    notes: ''
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' ? parseInt(value) || 1 : value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Item name is required';
    }
    
    if (!formData.expiryDate) {
      newErrors.expiryDate = 'Expiry date is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Format dates to YYYY-MM-DD for backend
    const formatDate = (dateString) => {
      if (!dateString) return null;
      // If date is in DD/MM/YYYY format, convert it
      if (dateString.includes('/')) {
        const [day, month, year] = dateString.split('/');
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      return dateString;
    };

    const newItem = {
      name: formData.name.trim(),
      category: formData.category,
      expiry: formatDate(formData.expiryDate),
      quantity: formData.quantity || 1,
      unit: formData.unit,
      purchaseDate: formatDate(formData.purchaseDate),
      notes: formData.notes.trim()
    };

    onAddItem(newItem);
    
    // Reset form
    setFormData({
      name: '',
      category: 'Other',
      expiryDate: '',
      quantity: 1,
      unit: 'Pieces',
      purchaseDate: '',
      notes: ''
    });
    setErrors({});
    onClose();
  };

  const handleClose = () => {
    setFormData({
      name: '',
      category: 'Other',
      expiryDate: '',
      quantity: 1,
      unit: 'Pieces',
      purchaseDate: '',
      notes: ''
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Add New Item</h2>
          <button className="modal-close" onClick={handleClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="add-item-form">
          <div className="form-row">
            <div className="form-group full-width">
              <label htmlFor="name">
                Item Name <span className="required">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Organic Milk"
                className={errors.name ? 'error' : ''}
              />
              {errors.name && <span className="error-message">{errors.name}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="category">Category</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="expiryDate">
                Expiry Date <span className="required">*</span>
              </label>
              <div className="date-input-wrapper">
                <input
                  type="date"
                  id="expiryDate"
                  name="expiryDate"
                  value={formData.expiryDate}
                  onChange={handleChange}
                  className={errors.expiryDate ? 'error' : ''}
                />
                <span className="calendar-icon">📅</span>
              </div>
              {errors.expiryDate && <span className="error-message">{errors.expiryDate}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="quantity">Quantity</label>
              <input
                type="number"
                id="quantity"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                min="1"
              />
            </div>

            <div className="form-group">
              <label htmlFor="unit">Unit</label>
              <select
                id="unit"
                name="unit"
                value={formData.unit}
                onChange={handleChange}
              >
                {UNITS.map(unit => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="purchaseDate">Purchase Date</label>
              <div className="date-input-wrapper">
                <input
                  type="date"
                  id="purchaseDate"
                  name="purchaseDate"
                  value={formData.purchaseDate}
                  onChange={handleChange}
                />
                <span className="calendar-icon">📅</span>
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group full-width">
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Any additional notes..."
                rows="3"
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={handleClose}>
              Cancel
            </button>
            <button type="submit" className="btn-add">
              <span className="add-icon">+</span>
              Add Item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddItemModal;

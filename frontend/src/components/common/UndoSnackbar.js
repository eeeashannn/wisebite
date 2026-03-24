import React from "react";
import "./UndoSnackbar.css";

function UndoSnackbar({ visible, loading, onUndo, onClose }) {
  if (!visible) return null;
  return (
    <div className="undo-snackbar">
      <span>Action applied.</span>
      <button type="button" className="undo-btn" disabled={loading} onClick={onUndo}>
        {loading ? "Undoing..." : "Undo"}
      </button>
      <button type="button" className="undo-close-btn" onClick={onClose}>
        Dismiss
      </button>
    </div>
  );
}

export default UndoSnackbar;

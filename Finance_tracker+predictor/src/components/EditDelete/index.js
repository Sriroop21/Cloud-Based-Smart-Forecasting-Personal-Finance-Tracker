import React, { useState, useEffect, useRef } from "react";
import "./styles.css";

const EditEditDeleteModal = ({ transaction, onSave, onCancel, onDelete }) => {
  const [editedTransaction, setEditedTransaction] = useState(transaction);
  const modalRef = useRef();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditedTransaction((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = () => {
    if (
      !editedTransaction.name.trim() ||
      Number(editedTransaction.amount) <= 0
    ) {
      alert("Please enter a valid name and amount.");
      return;
    }
    onSave(editedTransaction);
  };

  const handleDelete = () => {
    onDelete(editedTransaction);
  };

  const handleClickOutside = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      onCancel();
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    const handleEscape = (e) => e.key === "Escape" && onCancel();
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div className="modal-backdrop">
      <div
        className="modal container advanced-modal"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-content">
          <h3>Edit or Delete Transaction</h3>

          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              type="text"
              name="name"
              className="custom-input"
              value={editedTransaction.name}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="amount">Amount</label>
            <input
              id="amount"
              type="number"
              name="amount"
              className="custom-input"
              value={editedTransaction.amount}
              onChange={handleChange}
            />
          </div>

          <div className="modal-buttons">
            <button className="btn btn-blue" onClick={handleSave}>
              Save
            </button>
            <button className="btn btn-warning" onClick={handleDelete}>
              Delete
            </button>
            <button className="btn btn-red" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditEditDeleteModal;

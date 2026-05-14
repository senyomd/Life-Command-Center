import React from 'react'
import Modal from '../common/Modal'

function AddTransaction({ open, onClose, onSave }) {
  return (
    <Modal open={open} onClose={onClose} title="Add Transaction">
      <p className="placeholder-text">Add Transaction form — coming in Phase B.</p>
      <div className="modal-actions">
        <button className="modal-btn modal-btn-skip" onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  )
}

export default AddTransaction

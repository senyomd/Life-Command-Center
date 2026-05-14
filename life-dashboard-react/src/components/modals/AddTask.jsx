import React from 'react'
import Modal from '../common/Modal'

function AddTask({ open, onClose, onSave, task = null }) {
  // task !== null means edit mode
  return (
    <Modal open={open} onClose={onClose} title={task ? 'Edit Task' : 'New Task'}>
      <p className="placeholder-text">Add/Edit Task form — coming in Phase B.</p>
      <div className="modal-actions">
        <button className="modal-btn modal-btn-skip" onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  )
}

export default AddTask

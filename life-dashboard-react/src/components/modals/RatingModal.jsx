import React, { useState } from 'react'
import Modal from '../common/Modal'

function RatingModal({ open, onClose, onSave }) {
  const [energy, setEnergy] = useState(null)
  const [focus,  setFocus]  = useState(null)

  function handleSave() {
    onSave?.(energy, focus)
    setEnergy(null)
    setFocus(null)
    onClose?.()
  }

  function handleSkip() {
    setEnergy(null)
    setFocus(null)
    onClose?.()
  }

  function StarRow({ label, value, onChange }) {
    return (
      <div className="rating-group">
        <div className="rating-label">{label}</div>
        <div className="rating-stars">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              className={`star-btn${value >= n ? ' active' : ''}`}
              onClick={() => onChange(n)}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <Modal open={open} onClose={handleSkip} title="Session Complete">
      <p className="modal-sub">Nice work. How did that feel?</p>
      <StarRow label="Energy Level" value={energy} onChange={setEnergy} />
      <StarRow label="Focus Quality" value={focus}  onChange={setFocus} />
      <div className="modal-actions">
        <button className="modal-btn modal-btn-skip" onClick={handleSkip}>Skip</button>
        <button className="modal-btn modal-btn-save" onClick={handleSave}>Save</button>
      </div>
    </Modal>
  )
}

export default RatingModal

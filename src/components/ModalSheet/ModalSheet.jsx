import './ModalSheet.css'

function ModalSheet({ children, onOverlayClick }) {
  return (
    <div className="modal-sheet-overlay" onClick={onOverlayClick}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

export default ModalSheet
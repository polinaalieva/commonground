import ModalSheet from './ModalSheet'
import MSheet_header from './ui/MSheet_header'
import MSheet_text from './ui/MSheet_text'
import MSheet_actions from './ui/MSheet_actions'
import MSheet_button from './ui/MSheet_button'

function FormAnswerConfirmMSheet({ onClose, onSkip, onAddNote, pageContent }) {
  return (
    <ModalSheet onOverlayClick={onClose}>
      <MSheet_header title={pageContent.confirm_title} onClose={onClose} />
      <MSheet_text>
        {pageContent.confirm_text}
      </MSheet_text>
      <MSheet_actions>
        <MSheet_button type="secondary" onClick={onSkip} loadingText={pageContent.btn_sharing}>
          {pageContent.btn_skip}
        </MSheet_button>
        <MSheet_button type="primary" onClick={onAddNote}>
          {pageContent.btn_add_note}
        </MSheet_button>
      </MSheet_actions>
    </ModalSheet>
  )
}

export default FormAnswerConfirmMSheet
import ModalSheet from './ModalSheet'
import MSheetHeader from './MSheetHeader'
import MSheetText from './MSheetText'
import MSheetActions from './MSheetActions'
import MSheetButton from './MSheetButton'

function FormAnswerConfirmMSheet({ onClose, onSkip, onAddNote, pageContent }) {
  return (
    <ModalSheet onOverlayClick={onClose}>
      <MSheetHeader title={pageContent.confirm_title} onClose={onClose} />
      <MSheetText>
        {pageContent.confirm_text}
      </MSheetText>
      <MSheetActions>
        <MSheetButton type="secondary" onClick={onSkip} loadingText={pageContent.btn_sharing}>
          {pageContent.btn_skip}
        </MSheetButton>
        <MSheetButton type="primary" onClick={onAddNote}>
          {pageContent.btn_add_note}
        </MSheetButton>
      </MSheetActions>
    </ModalSheet>
  )
}

export default FormAnswerConfirmMSheet
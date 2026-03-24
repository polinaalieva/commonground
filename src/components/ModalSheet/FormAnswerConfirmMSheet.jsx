import ModalSheet from './ModalSheet'
import MSheetHeader from './MSheetHeader'
import MSheetText from './MSheetText'
import MSheetActions from './MSheetActions'
import MSheetButton from './MSheetButton'

function FormAnswerConfirmMSheet({ onClose, onSkip, onAddNote }) {
  return (
    <ModalSheet onOverlayClick={onClose}>
      <MSheetHeader title="Add a quick note?" onClose={onClose} />
      <MSheetText>
        It helps others understand this place better
      </MSheetText>
      <MSheetActions>
        <MSheetButton type="secondary" onClick={onSkip} loadingText="Sharing...">Skip</MSheetButton>
        <MSheetButton type="primary" onClick={onAddNote}>Add note</MSheetButton>
      </MSheetActions>
    </ModalSheet>
  )
}


export default FormAnswerConfirmMSheet
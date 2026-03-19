import BottomSheet from './BottomSheet'
import SheetContent from './SheetContent'
import SheetActions from './SheetActions'
import SheetButton from './SheetButton'

function LandingSheet({ onLeaveSignal }) {
  return (
    <BottomSheet variant="landing">
      <SheetContent>
        <p className="landing-sheet__text">
            Explore signals on the map
            <br />
            or leave your signal
            </p>
      </SheetContent>
      <SheetActions>
        <SheetButton onClick={onLeaveSignal}>Leave your signal</SheetButton>
      </SheetActions>
    </BottomSheet>
  )
}

export default LandingSheet
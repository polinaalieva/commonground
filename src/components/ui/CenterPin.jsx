import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import './CenterPin.css'

export const CenterPin = forwardRef(function CenterPin({ mapRef, mode }, ref) {
  const pinRef = useRef(null)
  const modeRef = useRef(mode)

  useImperativeHandle(ref, () => pinRef.current)

  useEffect(() => { modeRef.current = mode }, [mode])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const onMoveStart = () => {
      if (modeRef.current === 'select') pinRef.current?.classList.add('is-dragging')
    }
    const onMoveEnd = () => {
      pinRef.current?.classList.remove('is-dragging')
    }

    map.on('movestart', onMoveStart)
    map.on('moveend', onMoveEnd)

    return () => {
      map.off('movestart', onMoveStart)
      map.off('moveend', onMoveEnd)
    }
  }, [mapRef])

  if (mode !== 'select') return null

  return (
    <div className="cg-center-pin" ref={pinRef}>
      <div className="cg-center-pin-circle" />
      <div className="cg-center-pin-stem" />
      <div className="cg-center-pin-shadow" />
    </div>
  )
})

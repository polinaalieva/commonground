function EmptyZoneTooltip({ text, cta, onClick }) {
  return (
    <div className="cg-empty-tooltip" onClick={onClick}>
      <div className="cg-empty-tooltip__card">
        <span className="cg-empty-tooltip__text">{text}</span>
        <span className="cg-empty-tooltip__cta">{cta}</span>
      </div>
      <div className="cg-empty-tooltip__dot" />
    </div>
  )
}
 
export default EmptyZoneTooltip
 
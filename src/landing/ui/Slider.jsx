import './Slider.css'

const Slider = ({ label, min, max, value, onChange, minLabel }) => {
  return (
    <div className="slider-wrap">
      <div className="slider-header">
        <span className="h3">{label}</span>
        <span className="h3">
          {value >= max ? `${max - 1}+` : value}
        </span>
      </div>
      <input
        type="range"
        className="slider-input"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="slider-ends">
        <span className="text-grey">{minLabel || min}</span>
        <span className="text-grey">{`${max - 1}+`}</span>
      </div>
    </div>
  )
}

export default Slider
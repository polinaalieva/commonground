import './RatingChart.css'

const RATING_COLORS = {
  1: '#ED4B9E', 2: '#DF5BA6', 3: '#C46DB4',
  4: '#A47EC0', 5: '#8490C8', 6: '#64A0C8',
  7: '#44B0BE', 8: '#34C4B4', 9: '#31CEAC', 10: '#31D0AA',
}

export function RatingChart({ ratings }) {
  const counts = Array.from({ length: 10 }, (_, i) =>
    ratings.filter(r => Math.round(r) === i + 1).length
  )
  const max = Math.max(...counts, 1)

  return (
    <div className="rc-wrap">
      <div className="rc-bars">
        {counts.map((count, i) => (
          <div key={i} className="rc-bar-col">
            <div
              className="rc-bar"
              style={{
                height: count > 0 ? `${Math.max((count / max) * 100, 12)}%` : '0%',
                background: RATING_COLORS[i + 1],
              }}
            />
          </div>
        ))}
      </div>
      <div className="rc-labels">
        <span>Negative</span>
        <span>Positive</span>
      </div>
    </div>
  )
}

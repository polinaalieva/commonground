import './Wuf13Dashboard.css'

function StatCard({ label, value, delta, deltaLabel }) {
  return (
    <div className="wuf-dash__card">
      <span className="wuf-dash__card-label">{label}</span>
      <span className="wuf-dash__card-value">{value}</span>
      {delta > 0 && (
        <span className="wuf-dash__card-delta">
          +{delta} {deltaLabel}
        </span>
      )}
    </div>
  )
}

export function Wuf13Dashboard({ stats, layout = 'vertical' }) {
  // layout: 'vertical' (left column) | 'horizontal' (bottom row)
  return (
    <div className={`wuf-dash wuf-dash--${layout}`}>
      <div className="wuf-dash__header">
        <span className="wuf-dash__brand">Common Ground</span>
      </div>
      <div className="wuf-dash__cards">
        <StatCard
          label="Countries represented"
          value={stats.countries}
          delta={stats.todayCountries}
          deltaLabel="new today"
        />
        <StatCard
          label="Cities shared"
          value={stats.cities}
          delta={stats.todayCities}
          deltaLabel="new today"
        />
        <StatCard
          label="Experiences shared"
          value={stats.total}
          delta={stats.todayTotal}
          deltaLabel="new today"
        />
      </div>
    </div>
  )
}

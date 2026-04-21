import './Wuf13Dashboard.css'

function StatCard({ label, value, delta }) {
  return (
    <div className="wuf-dash__card">
      <span className="wuf-dash__card-label">{label}</span>
      <span className="wuf-dash__card-value">{value}</span>
      {delta > 0 && (
        <span className="wuf-dash__card-delta">+{delta} new today</span>
      )}
    </div>
  )
}

export function Wuf13Dashboard({ stats, layout = 'vertical' }) {
  return (
    <div className={`wuf-dash wuf-dash--${layout}`}>
      <div className="wuf-dash__cards">
        <StatCard label="Countries" value={stats.countries} delta={stats.todayCountries} />
        <StatCard label="Cities" value={stats.cities} delta={stats.todayCities} />
        <StatCard label="Experiences" value={stats.total} delta={stats.todayTotal} />
      </div>
    </div>
  )
}
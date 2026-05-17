import './Wuf13MapMenu.css'

function Wuf13MapMenu({ onClose, onAboutOpen, pinFilter, onPinFilterChange }) {
  function toggle() {
    onPinFilterChange(pinFilter === 'wuf13' ? 'all' : 'wuf13')
  }

  return (
    <div className="wuf13-map-menu">

      <div className="wuf13-map-menu__row wuf13-map-menu__row--home">
        <button className="wuf13-map-menu__home-btn" onClick={() => { onClose(); onAboutOpen() }}>
          About the project
        </button>
      </div>

      <div className="wuf13-map-menu__divider" />

      <div className="wuf13-map-menu__row wuf13-map-menu__row--home">
        <a
          className="wuf13-map-menu__home-btn"
          href="/wuf13dashboard"
          target="_blank"
          rel="noreferrer"
          onClick={onClose}
        >
          WUF13 Dashboard
        </a>
      </div>

      <div className="wuf13-map-menu__row">
        <span className="wuf13-map-menu__label">Explore the map</span>
        <div className="wuf13-map-menu__switcher" onClick={toggle}>
          <button className={`wuf13-map-menu__option ${pinFilter === 'wuf13' ? 'wuf13-map-menu__option--active' : ''}`}>
            WUF13
          </button>
          <button className={`wuf13-map-menu__option ${pinFilter === 'all' ? 'wuf13-map-menu__option--active' : ''}`}>
            World
          </button>
        </div>
      </div>

    </div>
  )
}

export default Wuf13MapMenu

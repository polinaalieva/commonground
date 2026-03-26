import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import Header from '../../components/Header'
import CgButton from '../../components/ui/Buttons/CgButton'
import './QRPage.css'

import QR_en_map_living from '../../assets/QR_en_map_living_personal.svg'
import QR_en_map_belonging from '../../assets/QR_en_map_belonging_personal.svg'
import QR_ru_map_living from '../../assets/QR_ru_mos_living_personal.svg'
import QR_ru_map_belonging from '../../assets/QR_ru_mos_belonging_personal.svg'

const QR_CODES = {
  en: {
    living: QR_en_map_living,
    belonging: QR_en_map_belonging,
  },
  ru: {
    living: QR_ru_map_living,
    belonging: QR_ru_map_belonging,
  },
}

function QRPage() {
  const [variant, setVariant] = useState('living')
  const { pathname } = useLocation()
  const lang = pathname.startsWith('/ru') ? 'ru' : 'en'

  const qrSrc = QR_CODES[lang][variant]

  return (
    <div className='qr-page'>
      <Header />
      <div className='qr-page__content'>
        <img
          src={qrSrc}
          alt={`QR Code — ${lang} ${variant}`}
          className='qr-page__image'
        />
        <div className='qr-page__buttons'>
          <CgButton onClick={() => setVariant('living')} className={variant === 'living' ? 'cg-btn--active' : ''}>
            Living
          </CgButton>
          <CgButton onClick={() => setVariant('belonging')} className={variant === 'belonging' ? 'cg-btn--active' : ''}>
            Belonging
          </CgButton>
        </div>
      </div>
    </div>
  )
}

export default QRPage
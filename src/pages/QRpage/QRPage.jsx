import Header from '../../components/Header'
import qrCode from '../../assets/QR_map.svg'
import './QRPage.css'

function QRPage() {
  return (
    <div className='qr-page'>
      <Header />
      <div className='qr-page__content'>
        <img src={qrCode} alt='QR Code' className='qr-page__image' />
        <span className='qr-page__link'>LINK COMMONGROUND.PAGE/MAP</span>
      </div>
    </div>
  )
}

export default QRPage
import { useParams, useLocation, useSearchParams } from 'react-router-dom'
import { DEFAULT_CITY } from '../config/cities'

export function usePageParams() {
  const { city } = useParams()
  const { pathname } = useLocation()
  const [searchParams] = useSearchParams()
  

  const lang = pathname.startsWith('/ru/') || pathname === '/ru' ? 'ru' : 'en'
  const resolvedCity = city ?? DEFAULT_CITY    // ← если нет параметра (на /), используем 'map'
  const variant = searchParams.get('v') ?? 'living'
  const source = searchParams.get('utm_source') ?? 'direct'

  return { city: resolvedCity, lang, variant, source }
}
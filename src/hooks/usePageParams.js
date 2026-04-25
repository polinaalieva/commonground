import { useParams, useLocation, useSearchParams } from 'react-router-dom'

export function usePageParams() {
  const { city } = useParams()
  const { pathname } = useLocation()
  const [searchParams] = useSearchParams()

  const lang = pathname.startsWith('/ru/') ? 'ru' : 'en'
  const variant = searchParams.get('v') ?? 'living'
  const source = searchParams.get('utm_source') ?? 'direct'

  return { city, lang, variant, source }
}
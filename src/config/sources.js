import { EVENTS, LEGACY_EVENT_IDS } from './events'

export const SOCIAL_PREFIXES = {
  reddit: 'Reddit',
  telegram: 'Telegram',
  facebook: 'Facebook',
  vkontakte: 'VKontakte',
  discord: 'Discord',
  't-j': 'T-J',
}

export function getSourceLabel(source) {
  if (!source) return null
  const lower = source.toLowerCase()
  for (const [prefix, label] of Object.entries(SOCIAL_PREFIXES)) {
    if (lower.startsWith(prefix)) return label
  }
  return null
}

// eventId — отзыв с карты события; city — отзыв со страницы события на карте мира
// (например /wuf13): там в city лежит старый код события
export function getEventParticipantLabel(eventId, city) {
  const shortName = EVENTS[eventId ?? LEGACY_EVENT_IDS[city]]?.shortName
  return shortName ? `${shortName} participant` : null
}

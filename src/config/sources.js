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

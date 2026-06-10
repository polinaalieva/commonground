export const EVENTS = {
  wuf13: {
    name: 'World Urban Forum 13',
    location: 'Baku, Azerbaijan',
    dates: ['2026-11-01', '2026-11-07'],
    bbox: [[49.910, 40.425], [49.930, 40.438]],
    center: [49.920, 40.431],
    zoom: 15,
    zoneColors: {
      'Area A': '#4A90E2',
      'Urban Expo': '#F5A623',
      'Area B': '#7ED321',
    }
  }
}

export function buildZoneColorExpression(zoneColors, fallback = '#cccccc') {
  const pairs = Object.entries(zoneColors).flat()
  return ['match', ['get', 'zone'], ...pairs, fallback]
}
export const EVENTS = {
  wuf13: {
    name: 'World Urban Forum 13',
    location: 'Baku, Azerbaijan',
    dates: ['2026-11-01', '2026-11-07'],
    bbox: [[49.910, 40.425], [49.930, 40.438]],
    center: [49.920, 40.431],
    zoom: 15,
  minZoom: 14,
  maxBounds: [[49.900, 40.420], [49.940, 40.445]],
    zoneColors: {
      'Area A': '#4A90E2',
      'Urban Expo': '#F5A623',
      'Area B': '#7ED321',
    },
    serviceColor: '#6B7280',
  floorplan: {
  url: '/floorplans/wuf13.png',
  coordinates: [
     [
      49.9132684627823,
      40.43552013735072
    ],
    [
      49.92636387727458,
      40.43552013735072
    ],
    [
      49.92636387727458,
      40.42642799916686
    ],
    [
      49.9132684627823,
      40.42642799916686
    ]
  ]
}
  }
}

export function buildZoneColorExpression(zoneColors, fallback = '#cccccc') {
  const pairs = Object.entries(zoneColors).flat()
  return ['match', ['get', 'zone'], ...pairs, fallback]
}
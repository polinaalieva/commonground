export const EVENTS = {
  wuf13: {
    name: 'World Urban Forum 13',
    shortName: 'WUF13',
    markerImage: '/events/wuf13.png',
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
    
  floorplan: {url: '/floorplans/wuf13-v2.png',
      coordinates: [
        [49.91300582305555, 40.43617368340293],
        [49.92681429980005, 40.43617368340293],
        [49.92681429980005, 40.4253899164859],
        [49.91300582305555, 40.4253899164859],
      ]
    }
  },
  uis27: {
    name: 'Urban Intelligence Summit 2027',
    shortName: 'UIS27',
    markerImage: '/events/uis27.png',
    location: 'Barcelona, Spain',
    dates: ['2027-09-13', '2027-09-15'],
    center: [2.142519076132203, 41.379661064465864],
    zoom: 20,
    bearing: 45,
    bbox: [[2.1418, 41.3790], [2.1433, 41.3803]],
    minZoom: 17,
    maxBounds: [
      [2.1418, 41.3790],
      [2.1433, 41.3803],
    ],
    zoneColors: {
      'Zone A': '#4A90E2',
      'Expo Area': '#F5A623',
    },
    serviceColor: '#6B7280',
    floorplan: {
      url: '/floorplans/uis27_planv.png',
      coordinates: [
        [2.1422313456499102, 41.379862061414904],
        [2.1427886690649496, 41.379862061414904],
        [2.1427886690649496, 41.37943883449626],
        [2.1422313456499102, 41.37943883449626],
      ]
    }
  }
}

export function buildZoneColorExpression(zoneColors, fallback = '#cccccc') {
  const pairs = Object.entries(zoneColors).flat()
  return ['match', ['get', 'zone'], ...pairs, fallback]
}
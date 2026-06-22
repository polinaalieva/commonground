import 'maplibre-gl/dist/maplibre-gl.css'
export { default as maplibregl } from 'maplibre-gl'

export const MAP_STYLE = `https://api.maptiler.com/maps/streets-v2-light/style.json?key=${import.meta.env.VITE_MAPTILER_KEY}`
export const MAP_STYLE_EVENT = `https://api.maptiler.com/maps/dataviz-light/style.json?key=${import.meta.env.VITE_MAPTILER_KEY}`
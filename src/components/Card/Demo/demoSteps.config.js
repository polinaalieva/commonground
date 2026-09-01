/**
 * Demo "How it works" steps for the EventCG variant.
 * Generic content — not tied to any specific event's data.
 *
 * `animation` is the file name in public/demo-animations/.
 *
 * The common Common Ground map will get its own config with different steps;
 * that's why Demo_card takes steps as a prop rather than importing this.
 */
export const EVENT_DEMO_STEPS = [
  { key: 'find',      label: 'Find anything',    animation: 'find-anything.html' },
  { key: 'locations', label: 'Share locations',  animation: 'share-locations.html' },
  { key: 'insights',  label: 'Share insights',   animation: 'share-insights.html' },
]

export default EVENT_DEMO_STEPS

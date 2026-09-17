// Copies the hashed bundle tags Vite puts into dist/index.html over to
// dist/about.html, so /about ships real HTML for clients that don't run JS
// while still booting the SPA in a browser. Runs after `vite build`.
import { readFileSync, writeFileSync } from 'node:fs'

const INDEX = 'dist/index.html'
const ABOUT = 'dist/about.html'

const index = readFileSync(INDEX, 'utf8')

const assetTags = index.match(
  /<script\b[^>]*type="module"[^>]*>[\s\S]*?<\/script>|<link\b[^>]*rel="(?:stylesheet|modulepreload)"[^>]*>/g
) ?? []

if (!assetTags.length) {
  throw new Error(`No bundle tags found in ${INDEX} — did the build layout change?`)
}

const about = readFileSync(ABOUT, 'utf8')

if (!about.includes('</head>')) {
  throw new Error(`No </head> in ${ABOUT}`)
}

const injected = about.replace(
  '</head>',
  `${assetTags.map(tag => `    ${tag}\n`).join('')}  </head>`
)

writeFileSync(ABOUT, injected)
console.log(`Injected ${assetTags.length} bundle tag(s) into ${ABOUT}`)

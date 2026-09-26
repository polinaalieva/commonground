// src/planlab/svgPath.js
// Атрибут d у <path> → ломаные. Без DOM, поэтому работает и в браузере, и в node.
// Кривые и дуги режем на отрезки длиной ~step (в единицах самого path).

const NUM = /[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/y
const IS_CMD = /[MmLlHhVvCcSsQqTtAaZz]/

// → [{ pts: [[x, y], ...], closed }]
export function flattenPath(d, step = 1) {
  const subs = []
  let i = 0
  const n = d.length
  let x = 0, y = 0, sx = 0, sy = 0
  let cur = null
  let cmd = null
  let prevCtrl = null // последняя контрольная точка для S/T
  let prevType = ''

  const ws = () => { while (i < n && (d[i] === ' ' || d[i] === ',' || d[i] === '\n' || d[i] === '\t' || d[i] === '\r')) i++ }
  const hasNum = () => { ws(); return i < n && /[-+.\d]/.test(d[i]) }
  const num = () => {
    ws()
    NUM.lastIndex = i
    const m = NUM.exec(d)
    if (!m) throw new Error(`path: ожидалось число в позиции ${i}`)
    i += m[0].length
    return +m[0]
  }
  // флаги дуги бывают слипшимися: "a4 4 0 014 4"
  const flag = () => {
    ws()
    const c = d[i++]
    if (c !== '0' && c !== '1') throw new Error(`path: плохой флаг дуги в позиции ${i - 1}`)
    return c === '1'
  }

  const flush = () => { if (cur && cur.pts.length > 1) subs.push(cur); cur = null }
  const ensure = () => { if (!cur) cur = { pts: [[x, y]], closed: false } }
  const lineTo = (nx, ny) => { ensure(); cur.pts.push([nx, ny]); x = nx; y = ny }

  const segs = len => Math.max(2, Math.min(64, Math.ceil(len / step)))
  const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay)

  const cubic = (x1, y1, x2, y2, ex, ey) => {
    ensure()
    const x0 = x, y0 = y
    const k = segs(dist(x0, y0, x1, y1) + dist(x1, y1, x2, y2) + dist(x2, y2, ex, ey))
    for (let j = 1; j <= k; j++) {
      const t = j / k, u = 1 - t
      const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, e = t * t * t
      cur.pts.push([a * x0 + b * x1 + c * x2 + e * ex, a * y0 + b * y1 + c * y2 + e * ey])
    }
    x = ex; y = ey
  }

  const quad = (x1, y1, ex, ey) => {
    ensure()
    const x0 = x, y0 = y
    const k = segs(dist(x0, y0, x1, y1) + dist(x1, y1, ex, ey))
    for (let j = 1; j <= k; j++) {
      const t = j / k, u = 1 - t
      cur.pts.push([u * u * x0 + 2 * u * t * x1 + t * t * ex, u * u * y0 + 2 * u * t * y1 + t * t * ey])
    }
    x = ex; y = ey
  }

  // SVG spec, F.6.5: концы дуги → центр и углы
  const arc = (rx, ry, phiDeg, large, sweep, ex, ey) => {
    ensure()
    if (rx === 0 || ry === 0 || (ex === x && ey === y)) { lineTo(ex, ey); return }
    rx = Math.abs(rx); ry = Math.abs(ry)
    const phi = phiDeg * Math.PI / 180
    const c = Math.cos(phi), s = Math.sin(phi)
    const dx = (x - ex) / 2, dy = (y - ey) / 2
    const x1p = c * dx + s * dy, y1p = -s * dx + c * dy
    const lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry)
    if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam) }
    const numr = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p
    const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p
    let co = Math.sqrt(Math.max(0, numr / den))
    if (large === sweep) co = -co
    const cxp = co * rx * y1p / ry, cyp = -co * ry * x1p / rx
    const cx = c * cxp - s * cyp + (x + ex) / 2
    const cy = s * cxp + c * cyp + (y + ey) / 2
    const ang = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy)
    const t1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry)
    let dt = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry)
    if (!sweep && dt > 0) dt -= 2 * Math.PI
    else if (sweep && dt < 0) dt += 2 * Math.PI
    const k = Math.max(2, Math.min(90, Math.ceil(Math.abs(dt) * Math.max(rx, ry) / step)))
    for (let j = 1; j < k; j++) {
      const t = t1 + dt * j / k
      const px = rx * Math.cos(t), py = ry * Math.sin(t)
      cur.pts.push([c * px - s * py + cx, s * px + c * py + cy])
    }
    cur.pts.push([ex, ey]) // конец — точно, без накопленной ошибки
    x = ex; y = ey
  }

  while (true) {
    ws()
    if (i >= n) break
    if (IS_CMD.test(d[i])) cmd = d[i++]
    else if (!cmd) throw new Error('path: не начинается с команды')

    const rel = cmd === cmd.toLowerCase()
    const C = cmd.toUpperCase()
    const ox = () => (rel ? x : 0)
    const oy = () => (rel ? y : 0)

    if (C === 'Z') {
      if (cur) { cur.closed = true; flush() }
      x = sx; y = sy
      prevType = 'Z'
      continue
    }

    let first = true
    do {
      switch (C) {
        case 'M': {
          if (first) {
            const nx = num() + ox(), ny = num() + oy()
            flush()
            x = sx = nx; y = sy = ny
            cur = { pts: [[x, y]], closed: false }
          } else {
            // пары после M — это lineto
            const nx = num() + ox(), ny = num() + oy()
            lineTo(nx, ny)
          }
          break
        }
        case 'L': { const nx = num() + ox(), ny = num() + oy(); lineTo(nx, ny); break }
        case 'H': { lineTo(num() + ox(), y); break }
        case 'V': { lineTo(x, num() + oy()); break }
        case 'C': {
          const b = ox(), c = oy()
          const x1 = num() + b, y1 = num() + c, x2 = num() + b, y2 = num() + c, ex = num() + b, ey = num() + c
          cubic(x1, y1, x2, y2, ex, ey)
          prevCtrl = [x2, y2]
          break
        }
        case 'S': {
          const b = ox(), c = oy()
          const x2 = num() + b, y2 = num() + c, ex = num() + b, ey = num() + c
          const [x1, y1] = (prevType === 'C' || prevType === 'S') && prevCtrl ? [2 * x - prevCtrl[0], 2 * y - prevCtrl[1]] : [x, y]
          cubic(x1, y1, x2, y2, ex, ey)
          prevCtrl = [x2, y2]
          break
        }
        case 'Q': {
          const b = ox(), c = oy()
          const x1 = num() + b, y1 = num() + c, ex = num() + b, ey = num() + c
          quad(x1, y1, ex, ey)
          prevCtrl = [x1, y1]
          break
        }
        case 'T': {
          const b = ox(), c = oy()
          const ex = num() + b, ey = num() + c
          const [x1, y1] = (prevType === 'Q' || prevType === 'T') && prevCtrl ? [2 * x - prevCtrl[0], 2 * y - prevCtrl[1]] : [x, y]
          quad(x1, y1, ex, ey)
          prevCtrl = [x1, y1]
          break
        }
        case 'A': {
          const rx = num(), ry = num(), rot = num(), large = flag(), sweep = flag()
          const ex = num() + ox(), ey = num() + oy()
          arc(rx, ry, rot, large, sweep, ex, ey)
          break
        }
        default:
          throw new Error(`path: неизвестная команда ${cmd}`)
      }
      prevType = C
      first = false
    } while (hasNum())
    if (C === 'M') cmd = rel ? 'l' : 'L'
  }
  flush()
  return subs
}

// Дуглас—Пекер; для замкнутых колец концы совпадают — это ок
export function simplify(pts, tol) {
  if (tol <= 0 || pts.length < 3) return pts
  const keep = new Uint8Array(pts.length)
  keep[0] = keep[pts.length - 1] = 1
  const stack = [[0, pts.length - 1]]
  const t2 = tol * tol
  while (stack.length) {
    const [a, b] = stack.pop()
    const [ax, ay] = pts[a], [bx, by] = pts[b]
    const dx = bx - ax, dy = by - ay
    const len2 = dx * dx + dy * dy
    let maxD = -1, idx = -1
    for (let k = a + 1; k < b; k++) {
      const [px, py] = pts[k]
      let d2
      if (len2 === 0) d2 = (px - ax) ** 2 + (py - ay) ** 2
      else {
        const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2))
        d2 = (px - ax - t * dx) ** 2 + (py - ay - t * dy) ** 2
      }
      if (d2 > maxD) { maxD = d2; idx = k }
    }
    if (maxD > t2) { keep[idx] = 1; stack.push([a, idx], [idx, b]) }
  }
  return pts.filter((_, k) => keep[k])
}

export function ringArea(pts) {
  let s = 0
  for (let k = 0, j = pts.length - 1; k < pts.length; j = k++) s += (pts[j][0] - pts[k][0]) * (pts[j][1] + pts[k][1])
  return s / 2
}

export function pointInRing([x, y], ring) {
  let inside = false
  for (let k = 0, j = ring.length - 1; k < ring.length; j = k++) {
    const [xi, yi] = ring[k], [xj, yj] = ring[j]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

export function lineLength(pts) {
  let s = 0
  for (let k = 1; k < pts.length; k++) s += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1])
  return s
}

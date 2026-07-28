import { getWalkMask, getMainMask, MASK_W, MASK_H } from '../data/walkmask.js'

// Tìm đường đi bộ trên mặt nạ lối đi (A* 8 hướng) rồi rút gọn bằng line-of-sight.
// Toàn bộ làm việc trong hệ tọa độ ảnh (u,v ∈ [0,1]).

const cellIndex = (cx, cy) => cy * MASK_W + cx
const toCell = (u, v) => ({
  cx: Math.min(MASK_W - 1, Math.max(0, Math.round(u * MASK_W - 0.5))),
  cy: Math.min(MASK_H - 1, Math.max(0, Math.round(v * MASK_H - 0.5))),
})
const toUV = (cx, cy) => ({ u: (cx + 0.5) / MASK_W, v: (cy + 0.5) / MASK_H })

// Đi bộ ngoài lối đi (băng qua cỏ/sân) đắt hơn đi trên lối đi.
const OFFPATH_PENALTY = 1.4
// Khi đã ra khỏi lối đi thì xét thêm các cửa ra trong vòng bán kính này
const ALTERNATIVE_MARGIN = 14

// Tập "cửa ra/vào lối đi" quanh một điểm, kèm chi phí đi bộ ngoài lối đi.
// Không chỉ lấy ô gần nhất: nếu điểm nằm trong tòa nhà, ô gần nhất có thể ở
// sai phía, nên trả về nhiều ứng viên để thuật toán tự chọn tổng đường ngắn nhất.
function accessPoints(mask, cx, cy, maxRadius = 120) {
  if (cx >= 0 && cx < MASK_W && cy >= 0 && cy < MASK_H && mask[cellIndex(cx, cy)]) {
    return [{ cx, cy, cost: 0 }]
  }
  let firstHit = -1
  const out = []
  for (let r = 1; r <= maxRadius; r++) {
    if (firstHit >= 0 && r > firstHit + ALTERNATIVE_MARGIN) break
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue
        const nx = cx + dx, ny = cy + dy
        if (nx < 0 || nx >= MASK_W || ny < 0 || ny >= MASK_H) continue
        if (!mask[cellIndex(nx, ny)]) continue
        if (firstHit < 0) firstHit = r
        out.push({ cx: nx, cy: ny, cost: Math.hypot(dx, dy) * OFFPATH_PENALTY })
      }
    }
  }
  return out
}

// Đường thẳng giữa 2 ô có hoàn toàn nằm trên lối đi không?
function lineOfSight(mask, a, b) {
  const dx = b.cx - a.cx, dy = b.cy - a.cy
  const steps = Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)))
  if (steps === 0) return true
  for (let i = 1; i < steps; i++) {
    const x = Math.round(a.cx + (dx * i) / steps)
    const y = Math.round(a.cy + (dy * i) / steps)
    if (!mask[cellIndex(x, y)]) return false
  }
  return true
}

const NEIGHBORS = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2],
]

// A* đa nguồn / đa đích: tìm cặp (cửa vào, cửa ra) cho tổng quãng đường nhỏ nhất,
// gồm cả đoạn đi ngoài lối đi ở hai đầu.
function astar(mask, starts, goals, goalAim, edgeMul) {
  const N = MASK_W * MASK_H
  const gScore = new Float32Array(N).fill(Infinity)
  const cameFrom = new Int32Array(N).fill(-1)
  const closed = new Uint8Array(N)

  const goalCost = new Map()
  for (const g of goals) goalCost.set(cellIndex(g.cx, g.cy), g.cost)

  const h = (i) => {
    const x = i % MASK_W, y = (i / MASK_W) | 0
    return Math.hypot(x - goalAim.cx, y - goalAim.cy)
  }
  // Binary heap
  const heap = []
  const push = (node) => {
    heap.push(node)
    let c = heap.length - 1
    while (c > 0) {
      const p = (c - 1) >> 1
      if (heap[p].f <= heap[c].f) break
      ;[heap[p], heap[c]] = [heap[c], heap[p]]
      c = p
    }
  }
  const pop = () => {
    const top = heap[0]
    const last = heap.pop()
    if (heap.length) {
      heap[0] = last
      let p = 0
      for (;;) {
        const l = 2 * p + 1, r = l + 1
        let s = p
        if (l < heap.length && heap[l].f < heap[s].f) s = l
        if (r < heap.length && heap[r].f < heap[s].f) s = r
        if (s === p) break
        ;[heap[p], heap[s]] = [heap[s], heap[p]]
        p = s
      }
    }
    return top
  }

  for (const s of starts) {
    const i = cellIndex(s.cx, s.cy)
    if (s.cost < gScore[i]) {
      gScore[i] = s.cost
      push({ i, f: s.cost + h(i) })
    }
  }

  let best = Infinity
  let bestI = -1

  while (heap.length) {
    const cur = pop()
    if (closed[cur.i]) continue
    // Không còn khả năng tìm được tuyến tốt hơn
    if (cur.f >= best) break
    closed[cur.i] = 1
    const exit = goalCost.get(cur.i)
    if (exit !== undefined) {
      const total = gScore[cur.i] + exit
      if (total < best) { best = total; bestI = cur.i }
    }
    const cx = cur.i % MASK_W, cy = (cur.i / MASK_W) | 0
    for (const [dx, dy, cost] of NEIGHBORS) {
      const nx = cx + dx, ny = cy + dy
      if (nx < 0 || nx >= MASK_W || ny < 0 || ny >= MASK_H) continue
      const ni = cellIndex(nx, ny)
      if (!mask[ni] || closed[ni]) continue
      // đi chéo phải có cả 2 ô kề trống, tránh "cắt góc" xuyên tường
      if (dx && dy && (!mask[cellIndex(cx + dx, cy)] || !mask[cellIndex(cx, cy + dy)])) continue
      const g = gScore[cur.i] + cost * (edgeMul ? edgeMul(ni) : 1)
      if (g < gScore[ni]) {
        gScore[ni] = g
        cameFrom[ni] = cur.i
        push({ i: ni, f: g + h(ni) })
      }
    }
  }

  if (bestI < 0) return null
  const path = []
  for (let i = bestI; i !== -1; i = cameFrom[i]) {
    path.push({ cx: i % MASK_W, cy: (i / MASK_W) | 0 })
  }
  return path.reverse()
}

// Rút gọn: bỏ điểm giữa nếu nhìn thẳng được từ điểm neo trước tới điểm sau.
function simplify(mask, path) {
  if (path.length <= 2) return path
  const out = [path[0]]
  let anchor = 0
  for (let i = 2; i < path.length; i++) {
    if (!lineOfSight(mask, path[anchor], path[i])) {
      out.push(path[i - 1])
      anchor = i - 1
    }
  }
  out.push(path[path.length - 1])
  return out
}

/**
 * Tìm đường từ start đến goal (đều là {u, v}).
 * Trả { path: [{u,v}...], snappedStart: bool, snappedGoal: bool } hoặc null nếu bế tắc.
 * Điểm đầu/cuối thật luôn được giữ nguyên; phần lệch khỏi lối đi nối bằng đoạn thẳng.
 */
export function findRoute(start, goal, { mainPenalty = 1 } = {}) {
  const mask = getWalkMask()
  // mainPenalty > 1: đi vào ô KHÔNG phải đường chính đắt hơn -> ưu tiên đường chính.
  const main = mainPenalty > 1 ? getMainMask() : null
  const edgeMul = main ? (ni) => (main[ni] ? 1 : mainPenalty) : null
  const s0 = toCell(start.u, start.v)
  const g0 = toCell(goal.u, goal.v)
  const starts = accessPoints(mask, s0.cx, s0.cy)
  const goals = accessPoints(mask, g0.cx, g0.cy)
  if (!starts.length || !goals.length) return null

  const cells = astar(mask, starts, goals, g0, edgeMul)
  if (!cells) return null

  const pts = simplify(mask, cells).map((c) => toUV(c.cx, c.cy))
  // Nối lại điểm thật ở hai đầu
  const path = [{ u: start.u, v: start.v }, ...pts, { u: goal.u, v: goal.v }]
  return {
    path,
    snappedStart: starts[0].cost > 0,
    snappedGoal: goals[0].cost > 0,
  }
}

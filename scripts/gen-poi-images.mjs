// Convert ảnh minh họa (JPG/PNG/HEIC; bỏ DNG raw) -> webp cho web, gán vào từng POI.
// Chạy: node scripts/gen-poi-images.mjs
import sharp from 'sharp'
import { readdirSync, statSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

const ASSETS = 'G:/MAPS LAVANG/assets-src'
const SRC_ROOT = join(ASSETS, readdirSync(ASSETS).find((d) => {
  try { return statSync(join(ASSETS, d)).isDirectory() && !d.toLowerCase().startsWith('map') } catch { return false }
}))
const OUT_DIR = 'G:/MAPS LAVANG/public/img/poi'
console.log('nguồn:', SRC_ROOT)
const norm = (s) => s.normalize('NFC')
const has = (s, k) => norm(s).toLowerCase().includes(norm(k).toLowerCase())

// leaf folder (kèm tên cha) -> { ids: [poiId...], slug }.
// Vài chỗ dùng CHUNG ảnh (sạc, vệ sinh, xin lễ, phát nước) -> nhiều id, 1 slug.
// LƯU Ý số Cổng phụ / Nhà tiền chế trong thư mục NGƯỢC với bản đồ -> gán theo VỊ TRÍ.
function resolve(parent, leaf) {
  const n = leaf
  if (has(n, 'Giếng')) return { ids: ['gieng-duc-me'], slug: 'gieng-duc-me' }
  if (has(n, 'Tử Đạo')) return { ids: ['khu-tu-dao'], slug: 'khu-tu-dao' }
  if (has(n, 'Giải Tội')) return { ids: ['khu-giai-toi'], slug: 'khu-giai-toi' }
  if (has(n, 'Linh Đài')) return { ids: ['linh-dai'], slug: 'linh-dai' }
  if (has(n, 'Chầu')) return { ids: ['nha-chau-thanh-the'], slug: 'nha-chau-thanh-the' }
  if (has(n, 'Nhà Nguyện')) return { ids: ['nha-nguyen'], slug: 'nha-nguyen' }
  if (has(n, 'Tháp Cổ')) return { ids: ['thap-co'], slug: 'thap-co' }
  if (has(n, 'Vương Cung')) return { ids: ['vuong-cung-thanh-duong'], slug: 'vuong-cung-thanh-duong' }
  if (has(n, 'Giới Trẻ')) return { ids: ['dao-gioi-tre'], slug: 'dao-gioi-tre' }
  if (has(n, 'Ban Ơn')) return { ids: ['duc-me-ban-on'], slug: 'duc-me-ban-on' }
  if (has(n, 'Đức Mẹ Suối')) return { ids: ['duc-me-suoi'], slug: 'duc-me-suoi' }
  if (has(n, 'Hành Hương')) return { ids: ['nha-hanh-huong'], slug: 'nha-hanh-huong' }
  if (has(n, 'Tiền Chế 1')) return { ids: ['nha-tien-che-2'], slug: 'nha-tien-che-2' } // "bên trái" = tiền chế 2 trên bản đồ
  if (has(n, 'Tiền Chế 2')) return { ids: ['nha-tien-che-1'], slug: 'nha-tien-che-1' } // "bên phải" = tiền chế 1 trên bản đồ
  if (has(n, 'Nhà Trung Tâm')) return { ids: ['nha-trung-tam'], slug: 'nha-trung-tam' }
  if (has(n, 'Trật Tự')) return { ids: ['trai-trat-tu'], slug: 'trai-trat-tu' }
  if (has(n, 'Y Tế')) return { ids: ['trai-y-te'], slug: 'trai-y-te' }
  if (has(n, 'Cổng Chính')) return { ids: ['cong-chinh'], slug: 'cong-chinh' }
  if (has(n, 'Cổng Phụ 1')) return { ids: ['cong-phu-1'], slug: 'cong-phu-1' } // dưới trái
  if (has(n, 'Cổng Phụ 2')) return { ids: ['cong-phu-2'], slug: 'cong-phu-2' }
  if (has(n, 'Cổng Phụ 3')) return { ids: ['cong-phu-3'], slug: 'cong-phu-3' } // trên phải
  if (has(n, 'Cổng Phụ 4')) return { ids: ['cong-phu-4'], slug: 'cong-phu-4' }
  if (has(n, 'phát nước và thực') || has(n, 'thực')) return { ids: ['diem-thuc-pham-4'], slug: 'thuc-pham' }
  if (has(parent, 'sạc') || has(n, 'sạc')) return { ids: ['sac-1', 'sac-2', 'sac-3', 'sac-4', 'sac-5', 'sac-6', 'sac-7'], slug: 'sac' }
  if (has(parent, 'phát nước') || has(n, 'phát nước')) return { ids: ['phat-nuoc-1', 'phat-nuoc-2', 'phat-nuoc-3'], slug: 'phat-nuoc' }
  if (has(parent, 'vệ sinh') || has(n, 'vệ sinh')) return { ids: ['nha-ve-sinh-1', 'nha-ve-sinh-2', 'nha-ve-sinh-3', 'nha-ve-sinh-4', 'nha-ve-sinh-5', 'nha-ve-sinh-6'], slug: 'nha-ve-sinh' }
  if (has(parent, 'xin lễ') || has(n, 'xin lễ') || has(n, 'dâng cúng')) return { ids: ['xin-le-1', 'xin-le-2', 'xin-le-3', 'xin-le-4'], slug: 'xin-le' }
  if (has(parent, 'lưu niệm') || has(n, 'lưu niệm')) return { ids: ['quay-luu-niem-1', 'quay-luu-niem-2'], slug: 'quay-luu-niem' }
  if (has(parent, 'kèn') || has(n, 'kèn')) return { ids: ['ban-ken-trong'], slug: 'ban-ken-trong' }
  if (has(parent, 'TNTT') || has(n, 'TNTT')) return { ids: ['trai-tntt'], slug: 'tntt' }
  return null
}

const IMG_EXT = ['.jpg', '.jpeg', '.png', '.heic']
const rank = (f) => { const e = f.toLowerCase().slice(f.lastIndexOf('.')); return e === '.heic' ? 1 : 0 } // jpg/png trước, heic sau

// Tìm mọi thư mục có file ảnh
function walk(dir, out = []) {
  const entries = readdirSync(dir)
  const files = entries.filter((e) => { try { return statSync(join(dir, e)).isFile() } catch { return false } })
  const imgs = files.filter((f) => IMG_EXT.includes(f.toLowerCase().slice(f.lastIndexOf('.'))))
  if (imgs.length) out.push({ dir, imgs })
  for (const e of entries) { const p = join(dir, e); try { if (statSync(p).isDirectory()) walk(p, out) } catch {} }
  return out
}

if (existsSync(OUT_DIR)) rmSync(OUT_DIR, { recursive: true, force: true })
mkdirSync(OUT_DIR, { recursive: true })

const leaves = walk(SRC_ROOT)
const POI_IMAGES = {}
const doneSlug = new Set()

for (const { dir, imgs } of leaves) {
  const parent = dir.split(/[\\/]/).slice(-2, -1)[0] || ''
  const leaf = dir.split(/[\\/]/).pop()
  const m = resolve(parent, leaf)
  if (!m) { console.warn('KHÔNG map được:', leaf); continue }
  if (doneSlug.has(m.slug)) { for (const id of m.ids) POI_IMAGES[id] = urlsFor(m.slug); continue }
  doneSlug.add(m.slug)

  const chosen = imgs.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b)).slice(0, 3)
  const outSub = join(OUT_DIR, m.slug)
  mkdirSync(outSub, { recursive: true })
  const urls = []
  let n = 0
  for (const f of chosen) {
    n++
    const outName = `${n}.webp`
    const outPath = join(outSub, outName)
    const isHeic = f.toLowerCase().endsWith('.heic')
    try {
      if (isHeic) {
        // sharp/libheif chặn HEIC iPhone (iref>16); HEIC nhiều luồng nên ffmpeg -vf lỗi.
        // -> ffmpeg decode luồng chính ra PNG tạm rồi sharp resize sang webp.
        const tmp = join(OUT_DIR, `_tmp_${n}.png`)
        // KHÔNG -map: để ffmpeg tự chọn luồng ảnh chính (độ phân giải cao nhất),
        // tránh lấy nhầm luồng gain-map/thumbnail nhỏ.
        execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', join(dir, f), '-frames:v', '1', tmp], { stdio: 'pipe' })
        await sharp(tmp).rotate().resize({ width: 1100, height: 1100, fit: 'inside', withoutEnlargement: true }).webp({ quality: 76 }).toFile(outPath)
        rmSync(tmp, { force: true })
      } else {
        await sharp(join(dir, f), { failOn: 'none' })
          .rotate()
          .resize({ width: 1100, height: 1100, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 76 })
          .toFile(outPath)
      }
      urls.push(`/img/poi/${m.slug}/${outName}`)
    } catch (e) { console.warn('  lỗi convert', f, (e.message || '').slice(0, 80)); n-- }
  }
  const finalUrls = urls
  for (const id of m.ids) POI_IMAGES[id] = finalUrls
  console.log(`${m.slug}: ${finalUrls.length} ảnh -> ${m.ids.join(', ')}`)

  function urlsFor(slug) {
    return [1, 2, 3].map((i) => `/img/poi/${slug}/${i}.webp`).filter((u) => existsSync('G:/MAPS LAVANG/public' + u))
  }
}

writeFileSync('G:/MAPS LAVANG/src/data/poi-images.js',
`// TỰ SINH bởi scripts/gen-poi-images.mjs — đừng sửa tay.
// Ảnh minh họa từng điểm (đã convert HEIC/JPG/PNG -> webp). DetailPopup dùng khi mở popup.
export const POI_IMAGES = ${JSON.stringify(POI_IMAGES, null, 1)}
`)
const total = Object.values(POI_IMAGES).reduce((s, a) => s + a.length, 0)
console.log(`\nđã ghi poi-images.js — ${Object.keys(POI_IMAGES).length} POI, ${new Set(Object.values(POI_IMAGES).flat()).size} ảnh`)

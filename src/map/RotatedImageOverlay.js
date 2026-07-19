import L from 'leaflet'

// ImageOverlay neo bằng 3 góc (trên-trái, trên-phải, dưới-trái) — cho phép ảnh xoay/nghiêng.
// Dựa trên ý tưởng của plugin Leaflet.ImageOverlay.Rotated, viết gọn lại.
export const RotatedImageOverlay = L.Layer.extend({
  options: {
    opacity: 1,
    interactive: false,
    zIndex: 1,
  },

  initialize(url, topleft, topright, bottomleft, options) {
    this._url = url
    this.setCorners(topleft, topright, bottomleft)
    L.setOptions(this, options)
  },

  setCorners(topleft, topright, bottomleft) {
    this._topleft = L.latLng(topleft)
    this._topright = L.latLng(topright)
    this._bottomleft = L.latLng(bottomleft)
    if (this._map) this._reset()
    return this
  },

  setOpacity(opacity) {
    this.options.opacity = opacity
    if (this._image) this._image.style.opacity = opacity
    return this
  },

  onAdd(map) {
    this._map = map
    if (!this._image) this._initImage()
    this.getPane().appendChild(this._image)
    this._reset()
    return this
  },

  onRemove() {
    if (this._image) L.DomUtil.remove(this._image)
    return this
  },

  getEvents() {
    return { zoom: this._reset, viewreset: this._reset, zoomanim: this._animateZoom }
  },

  _initImage() {
    const img = (this._image = L.DomUtil.create('img', 'leaflet-image-layer'))
    img.src = this._url
    img.alt = ''
    img.style.opacity = this.options.opacity
    img.style.transformOrigin = '0 0'
    img.style.willChange = 'transform'
    img.style.zIndex = this.options.zIndex
    img.onload = () => this._reset()
  },

  _reset() {
    const img = this._image
    if (!img || !img.naturalWidth) return
    this._applyTransform(
      this._map.latLngToLayerPoint(this._topleft),
      this._map.latLngToLayerPoint(this._topright),
      this._map.latLngToLayerPoint(this._bottomleft)
    )
  },

  _animateZoom(e) {
    const img = this._image
    if (!img || !img.naturalWidth) return
    const p = (ll) => this._map._latLngToNewLayerPoint(ll, e.zoom, e.center)
    this._applyTransform(p(this._topleft), p(this._topright), p(this._bottomleft))
  },

  _applyTransform(tl, tr, bl) {
    const img = this._image
    const w = img.naturalWidth
    const h = img.naturalHeight
    // Ma trận affine đưa pixel ảnh (0..w, 0..h) về layer points
    const a = (tr.x - tl.x) / w
    const b = (tr.y - tl.y) / w
    const c = (bl.x - tl.x) / h
    const d = (bl.y - tl.y) / h
    img.style.transform = `matrix(${a}, ${b}, ${c}, ${d}, ${tl.x}, ${tl.y})`
  },
})

export function rotatedImageOverlay(url, topleft, topright, bottomleft, options) {
  return new RotatedImageOverlay(url, topleft, topright, bottomleft, options)
}

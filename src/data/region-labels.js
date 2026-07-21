// TỰ SINH bởi scripts/render-basemap.mjs — đừng sửa tay.
// Nhãn vẽ bằng DOM (không nướng vào ảnh) để chữ luôn sắc nét ở mọi mức zoom.
// Nguồn địa danh/đường: © OpenStreetMap contributors (ODbL).
export const REGION_BOUNDS = {
  topleft: [16.78, 107.14],
  topright: [16.78, 107.26],
  bottomleft: [16.655, 107.14],
}

export const OSM_LABELS = [
 {
  "text": "Hải Phú",
  "kind": "village",
  "lat": 16.713988,
  "lng": 107.196594,
  "minZoom": 14.75
 },
 {
  "text": "Duân Kinh",
  "kind": "village",
  "lat": 16.760961,
  "lng": 107.253117,
  "minZoom": 14.75
 },
 {
  "text": "Khóm 1",
  "kind": "village",
  "lat": 16.702536,
  "lng": 107.25553,
  "minZoom": 14.75
 },
 {
  "text": "Khóm 2",
  "kind": "village",
  "lat": 16.700286,
  "lng": 107.252884,
  "minZoom": 14.75
 },
 {
  "text": "Khóm 3",
  "kind": "village",
  "lat": 16.692681,
  "lng": 107.24533,
  "minZoom": 14.75
 },
 {
  "text": "Khóm 4",
  "kind": "village",
  "lat": 16.693722,
  "lng": 107.238326,
  "minZoom": 14.75
 },
 {
  "text": "Khóm 5",
  "kind": "village",
  "lat": 16.688233,
  "lng": 107.246964,
  "minZoom": 14.75
 },
 {
  "text": "Khóm 6",
  "kind": "village",
  "lat": 16.684725,
  "lng": 107.251648,
  "minZoom": 14.75
 },
 {
  "text": "La Duy",
  "kind": "village",
  "lat": 16.764609,
  "lng": 107.25488,
  "minZoom": 14.75
 },
 {
  "text": "Long Hưng",
  "kind": "village",
  "lat": 16.734466,
  "lng": 107.192957,
  "minZoom": 14.75
 },
 {
  "text": "Mai Đàn",
  "kind": "village",
  "lat": 16.700162,
  "lng": 107.232631,
  "minZoom": 14.75
 },
 {
  "text": "Phú Hưng",
  "kind": "village",
  "lat": 16.719399,
  "lng": 107.19255,
  "minZoom": 14.75
 },
 {
  "text": "Phú Xuân A",
  "kind": "village",
  "lat": 16.753226,
  "lng": 107.233603,
  "minZoom": 14.75
 },
 {
  "text": "Quy Thiện",
  "kind": "village",
  "lat": 16.763787,
  "lng": 107.214037,
  "minZoom": 14.75
 },
 {
  "text": "Thượng Nguyên",
  "kind": "village",
  "lat": 16.678242,
  "lng": 107.210375,
  "minZoom": 14.75
 },
 {
  "text": "Thượng Xá",
  "kind": "village",
  "lat": 16.71217,
  "lng": 107.220755,
  "minZoom": 14.75
 },
 {
  "text": "Trà Lộc",
  "kind": "village",
  "lat": 16.759879,
  "lng": 107.242351,
  "minZoom": 14.75
 },
 {
  "text": "Trà Trì",
  "kind": "village",
  "lat": 16.761228,
  "lng": 107.220277,
  "minZoom": 14.75
 },
 {
  "text": "Trâm Lý",
  "kind": "village",
  "lat": 16.752629,
  "lng": 107.21467,
  "minZoom": 14.75
 },
 {
  "text": "Trường Phước",
  "kind": "village",
  "lat": 16.683525,
  "lng": 107.238554,
  "minZoom": 14.75
 },
 {
  "text": "Tân Chính",
  "kind": "village",
  "lat": 16.678149,
  "lng": 107.23107,
  "minZoom": 14.75
 },
 {
  "text": "Tân Phước",
  "kind": "village",
  "lat": 16.670503,
  "lng": 107.236862,
  "minZoom": 14.75
 },
 {
  "text": "Văn Vận",
  "kind": "village",
  "lat": 16.747692,
  "lng": 107.232943,
  "minZoom": 14.75
 },
 {
  "text": "Xuân Lâm",
  "kind": "village",
  "lat": 16.689318,
  "lng": 107.225319,
  "minZoom": 14.75
 },
 {
  "text": "Đại An Khê",
  "kind": "village",
  "lat": 16.714444,
  "lng": 107.213423,
  "minZoom": 14.75
 },
 {
  "text": "Mỹ Khê",
  "kind": "village",
  "lat": 16.772886,
  "lng": 107.249082,
  "minZoom": 14.75
 },
 {
  "text": "Hải Lệ",
  "kind": "village",
  "lat": 16.704643,
  "lng": 107.162833,
  "minZoom": 14.75
 },
 {
  "text": "Phường 2",
  "kind": "village",
  "lat": 16.754701,
  "lng": 107.192616,
  "minZoom": 14.75
 },
 {
  "text": "Quảng Trị",
  "kind": "town",
  "lat": 16.753852,
  "lng": 107.185947,
  "minZoom": 0
 },
 {
  "text": "Triệu Phong",
  "kind": "town",
  "lat": 16.769308,
  "lng": 107.165076,
  "minZoom": 13.5
 },
 {
  "text": "Hải Lăng",
  "kind": "town",
  "lat": 16.722924,
  "lng": 107.205562,
  "minZoom": 13.5
 },
 {
  "text": "Đ. LÊ LỢI",
  "kind": "road",
  "lat": 16.736469,
  "lng": 107.191052,
  "minZoom": 14
 },
 {
  "text": "Đ. LÊ LỢI",
  "kind": "road",
  "lat": 16.721458,
  "lng": 107.192689,
  "minZoom": 14
 },
 {
  "text": "Đ. LIÊN XÃ",
  "kind": "road",
  "lat": 16.712472,
  "lng": 107.201116,
  "minZoom": 14
 },
 {
  "text": "Đ. LÊ DUẨN",
  "kind": "road",
  "lat": 16.740396,
  "lng": 107.185282,
  "minZoom": 14
 },
 {
  "text": "QL 1A",
  "kind": "shield",
  "lat": 16.692592,
  "lng": 107.239647,
  "minZoom": 13.5
 },
 {
  "text": "QL 1A",
  "kind": "shield",
  "lat": 16.733127,
  "lng": 107.202926,
  "minZoom": 13.5
 },
 {
  "text": "QL 1A",
  "kind": "shield",
  "lat": 16.756242,
  "lng": 107.177205,
  "minZoom": 13.5
 },
 {
  "text": "ĐƯỜNG MỘT CHIỀU",
  "kind": "oneway",
  "lat": 16.733353,
  "lng": 107.190881,
  "minZoom": 14.25
 },
 {
  "text": "ĐƯỜNG MỘT CHIỀU",
  "kind": "oneway",
  "lat": 16.712874,
  "lng": 107.202141,
  "minZoom": 14.25
 },
 {
  "text": "SÔNG THẠCH HÃN",
  "kind": "river",
  "lat": 16.732043,
  "lng": 107.179171,
  "minZoom": 13.5
 },
 {
  "text": "CẦU TRẮNG",
  "kind": "place",
  "lat": 16.740095,
  "lng": 107.192115,
  "minZoom": 13.5
 },
 {
  "text": "ĐIỂM ĐÓN TRẢ KHÁCH",
  "kind": "place",
  "lat": 16.710181,
  "lng": 107.194709,
  "minZoom": 14.5
 },
 {
  "text": "BÃI ĐỖ XE KHÁCH",
  "kind": "place",
  "lat": 16.712665,
  "lng": 107.206108,
  "minZoom": 14
 }
]

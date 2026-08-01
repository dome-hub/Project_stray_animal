// mapMarker.js — หมุดหยดน้ำสีต่างๆ สำหรับแผนที่ Leaflet
//
// ใช้ร่วมกันสองที่ที่ลงสีหมุดคนละเกณฑ์กัน:
//   - VolunteerPage — สีตามประเภทเหตุ (ดุร้าย/บาดเจ็บ/พลัดหลง) เจ้าหน้าที่สนใจว่าเคสไหนเร่งด่วน
//   - AdminPage หน้าพื้นที่ — สีตามสถานะเคส แอดมินสนใจว่าโซนไหนมีงานค้าง
// รูปหมุดเป็นอันเดียวกัน ต่างแค่สีที่ส่งเข้ามา จึงแยกมาไว้ที่เดียวกันไม่ให้หลุดกัน

import L from 'leaflet'

// cache ตามสี เพื่อไม่สร้าง divIcon ใหม่ทุก render
const _หมุดCache = {}

export function หมุดสี(color) {
  if (_หมุดCache[color]) return _หมุดCache[color]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="38" viewBox="0 0 26 38">
    <path d="M13 0C5.8 0 0 5.8 0 13c0 9.2 13 25 13 25s13-15.8 13-25C26 5.8 20.2 0 13 0z" fill="${color}" stroke="white" stroke-width="2"/>
    <circle cx="13" cy="13" r="5" fill="white"/>
  </svg>`
  const icon = L.divIcon({
    html: svg,
    className: '',
    iconSize: [26, 38],
    iconAnchor: [13, 38],
    popupAnchor: [0, -34],
  })
  _หมุดCache[color] = icon
  return icon
}

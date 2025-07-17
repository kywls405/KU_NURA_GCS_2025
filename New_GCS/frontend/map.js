// frontend/map.js

let map;
let rocketMarker = null;

// 지도 초기화 함수
export function initMap() {
  map = L.map('map').setView([37.5665, 126.9780], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  const markerOptions = {
    radius: 8,
    fillColor: "#ff0000",
    color: "#fff",
    weight: 1,
    opacity: 1,
    fillOpacity: 0.9
  };

  rocketMarker = L.circleMarker([37.5665, 126.9780], markerOptions).addTo(map);
}

// 실시간 데이터 수신 시 마커와 중심 이동
export function updateMapCenter(lat, lon) {
  if (!map || !rocketMarker) return;

  const newLatLng = [lat, lon];
  rocketMarker.setLatLng(newLatLng);
  map.panTo(newLatLng);
}

// ❌ 파일 맨 아래에 있던 initMap() 호출은 반드시 삭제해야 합니다.
// 초기화는 main.js가 담당합니다.
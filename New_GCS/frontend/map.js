// map.js

let map;
let marker;

function initMap() {
  map = L.map('map').setView([37.5665, 126.9780], 14); // 초기 위치는 서울

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map);

  marker = L.marker([37.5665, 126.9780]).addTo(map);
}

function updateMap(lat, lon) {
  if (marker) {
    marker.setLatLng([lat, lon]);
  } else {
    marker = L.marker([lat, lon]).addTo(map);
  }
  map.setView([lat, lon], map.getZoom());

  // 🟠 HTML 텍스트도 업데이트
  const lonText = document.getElementById('lon');
  const latText = document.getElementById('lat');

  if (lonText) lonText.textContent = `${lon.toFixed(5)}° E`;
  if (latText) latText.textContent = `${lat.toFixed(5)}° N`;
}

// 초기화
if (typeof window !== 'undefined') {
  document.addEventListener("DOMContentLoaded", () => {
    initMap();

    setInterval(() => {
      const randomLat = 37.5665 + Math.random() * 0.01;
      const randomLon = 126.9780 + Math.random() * 0.01;
      updateMap(randomLat, randomLon);
    }, 3000);
  });
  // 다른 JS에서 접근 가능하도록 export
  window.updateMap = updateMap;
}


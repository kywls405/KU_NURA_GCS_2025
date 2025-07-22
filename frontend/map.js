// frontend/map.js

let map;
let rocketMarker = null;
let flightPath = null; // [추가] 비행 궤적을 저장할 변수

// 지도 초기화 함수
export function initMap() {
  // 지도를 서울을 중심으로 초기화
  map = L.map('map').setView([37.5665, 126.9780], 13);

  // OpenStreetMap 타일 레이어 추가
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // 현재 로켓 위치를 나타내는 메인 마커 설정
  const markerOptions = {
    radius: 8,
    fillColor: "#f03", // 눈에 잘 띄는 빨간색
    color: "#fff",
    weight: 2,
    opacity: 1,
    fillOpacity: 0.9
  };
  rocketMarker = L.circleMarker([37.5665, 126.9780], markerOptions).addTo(map);

  // [추가] 비행 궤적을 그릴 Polyline 초기화
  flightPath = L.polyline([], {
    color: '#007bff', // 파란색 궤적
    weight: 3
  }).addTo(map);
}

/**
 * [수정] 실시간 데이터로 마커, 궤적, 지도 중심을 업데이트하는 함수
 * @param {number} lat - 위도
 * @param {number} lon - 경도
 * @param {string} formattedTime - "T+ HH:MM:SS" 형식의 비행 시간 문자열
 */
export function updateMap(lat, lon, formattedTime) {
  if (!map || !rocketMarker || !flightPath) return;

  const newLatLng = [lat, lon];

  // 1. 메인 마커의 위치를 업데이트
  rocketMarker.setLatLng(newLatLng);

  // 2. 비행 궤적(Polyline)에 새로운 좌표를 추가
  flightPath.addLatLng(newLatLng);

  // 3. [추가] 궤적 위에 보이지 않는 작은 마커를 추가하여 툴팁을 생성
  // 이렇게 하면 선 위에 마우스를 올렸을 때 시간 정보가 나타납니다.
  L.circleMarker(newLatLng, {
    radius: 4,
    stroke: false, // 테두리 숨김
    fill: false    // 채우기 숨김
  }).addTo(map).bindTooltip(formattedTime, {
    permanent: false, // 마우스를 올렸을 때만 표시
    direction: 'top'
  });

  // 4. 지도의 중심을 로켓의 현재 위치로 부드럽게 이동
  map.panTo(newLatLng);
}

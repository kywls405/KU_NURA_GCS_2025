// frontend/main.js

import { initNavball, updateNavball } from './navball.js';
import { initMap, updateMapCenter } from './map.js';

document.addEventListener('DOMContentLoaded', () => {

  // 페이지가 준비되면 지도와 Navball을 초기화
  initMap();
  initNavball();

  // [수정] UI 요소에 시간 및 속도 추가
  const uiElements = {
    // Time
    time: document.getElementById('time'),
    flightTime: document.getElementById('flight-time'),
    // Attitude
    roll: document.getElementById('roll'),
    pitch: document.getElementById('pitch'),
    yaw: document.getElementById('yaw'),
    // Altitude
    p_alt: document.getElementById('p_alt'),
    alt: document.getElementById('alt'),
    // Acceleration
    ax: document.getElementById('ax'),
    ay: document.getElementById('ay'),
    az: document.getElementById('az'),
    // Position
    lat: document.getElementById('lat'),
    lon: document.getElementById('lon'),
    // Velocity
    vel_n: document.getElementById('vel_n'),
    vel_e: document.getElementById('vel_e'),
    vel_d: document.getElementById('vel_d'),
    // Environment
    temp: document.getElementById('temp'),
    pressure: document.getElementById('pressure'),
    // Status
    ejection: document.getElementById('ejection'),
  };

  // [추가] 로컬 시간을 1초마다 업데이트하는 함수
  function updateLocalTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    uiElements.time.textContent = `${hours}:${minutes}:${seconds}`;
  }
  // 1초마다 로컬 시간 업데이트 시작
  setInterval(updateLocalTime, 1000);
  updateLocalTime(); // 페이지 로드 시 즉시 실행

  // [추가] 밀리초를 T+ HH:MM:SS 형식으로 변환하는 함수
  function formatFlightTime(ms) {
    if (typeof ms !== 'number' || ms < 0) {
      return 'T+ 00:00:00';
    }
    const totalSeconds = Math.floor(ms / 1000);
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `T+ ${hours}:${minutes}:${seconds}`;
  }

  // [추가] 사출 상태에 따라 텍스트와 스타일을 업데이트하는 함수
  function updateEjectionStatus(status) {
    const elem = uiElements.ejection;
    let text = 'UNKNOWN';
    let className = 'status-danger'; // 기본값은 위험(빨강)

    switch (status) {
      case 0:
        text = 'SAFE';
        className = 'status-safe'; // 안전(초록)
        break;
      case 1:
        text = 'ATTITUDE EJECT';
        className = 'status-warn'; // 경고(주황)
        break;
      case 2:
        text = 'ALTITUDE EJECT';
        className = 'status-warn';
        break;
      case 3:
        text = 'TIMER EJECT';
        className = 'status-warn';
        break;
    }
    elem.textContent = text;
    // 기존 클래스를 모두 제거한 후, 상태에 맞는 새 클래스 적용
    elem.className = 'value telemetry-font'; 
    elem.classList.add(className);
  }

  // [수정] 대시보드 업데이트 함수
  function updateDashboard(data) {
    if (!data) return;

    // 텍스트 데이터 업데이트
    uiElements.roll.textContent = `${data.roll}°`;
    uiElements.pitch.textContent = `${data.pitch}°`;
    uiElements.yaw.textContent = `${data.yaw}°`;

    uiElements.p_alt.textContent = `${data.p_alt} m`;
    uiElements.alt.textContent = `${data.alt} m`;
    
    uiElements.ax.textContent = `${data.ax} m/s²`;
    uiElements.ay.textContent = `${data.ay} m/s²`;
    uiElements.az.textContent = `${data.az} m/s²`;
    
    // [수정] lon의 접미사를 'E'로 변경
    uiElements.lat.textContent = `${data.lat.toFixed(7)}° N`;
    uiElements.lon.textContent = `${data.lon.toFixed(7)}° E`;
    
    // [추가] 속도 데이터 업데이트
    uiElements.vel_n.textContent = `${data.vel_n} m/s`;
    uiElements.vel_e.textContent = `${data.vel_e} m/s`;
    uiElements.vel_d.textContent = `${data.vel_d} m/s`;

    uiElements.temp.textContent = `${data.temp} °C`;
    uiElements.pressure.textContent = `${data.pressure} hPa`;
    
    // [수정] 비행 시간 및 사출 상태 업데이트
    uiElements.flightTime.textContent = formatFlightTime(data.timestamp);
    updateEjectionStatus(data.ejection);

    // Navball 회전 함수 호출
    updateNavball(data.roll, data.pitch, data.yaw);
    
    // 지도 마커 업데이트 함수 호출
    updateMapCenter(data.lat, data.lon);
  }
  
  const socket = io();

  socket.on('rocketData', data => {
    updateDashboard(data);
  });
});

// frontend/main.js

import { initNavball, updateNavball } from './navball.js';
import { initMap, updateMapCenter } from './map.js';

document.addEventListener('DOMContentLoaded', () => {

  // 페이지가 준비되면 지도와 Navball을 초기화
  initMap();
  initNavball();

  const uiElements = {
    roll: document.getElementById('roll'),
    pitch: document.getElementById('pitch'),
    yaw: document.getElementById('yaw'),
    p_alt: document.getElementById('p_alt'),
    alt: document.getElementById('alt'),
    ax: document.getElementById('ax'),
    ay: document.getElementById('ay'),
    az: document.getElementById('az'),
    lat: document.getElementById('lat'),
    lon: document.getElementById('lon'),
    temp: document.getElementById('temp'),
    pressure: document.getElementById('pressure'),
    ejection: document.getElementById('ejection'),
  };

  function updateDashboard(data) {
    if (!data) return;

    // 텍스트 데이터 업데이트
    uiElements.roll.textContent = `${data.roll}°`;
    uiElements.pitch.textContent = `${data.pitch}°`;
    uiElements.yaw.textContent = `${data.yaw}°`;

    uiElements.p_alt.textContent = `${data.p_alt}m`;
    uiElements.alt.textContent = `${data.alt}m`;
    
    uiElements.ax.textContent = `${data.ax}m/s²`;
    uiElements.ay.textContent = `${data.ay}m/s²`;
    uiElements.az.textContent = `${data.az}m/s²`;
    
    uiElements.lat.textContent = `${data.lat.toFixed(7)}° N`;
    uiElements.lon.textContent = `${data.lon.toFixed(7)}° N`;
    
    uiElements.temp.textContent = `${data.temp} °C`;
    uiElements.pressure.textContent = `${data.pressure} hPa`;
    
    uiElements.ejection.textContent = `Ejection: ${data.ejection}`;

    // ✅ Navball 회전 함수 호출
    updateNavball(data.roll, data.pitch, data.yaw);
    
    // 지도 마커 업데이트 함수 호출
    updateMapCenter(data.lat, data.lon);
  }
  
  const socket = io();

  socket.on('rocketData', data => {
    updateDashboard(data);
  });
});
// frontend/main.js

import { initNavball, updateNavball } from './navball.js';
import { initMap, updateMapCenter } from './map.js';
import { initCharts, updateCharts } from './charts.js';

document.addEventListener('DOMContentLoaded', () => {

  initMap();
  initNavball();
  initCharts();

  const uiElements = {
    time: document.getElementById('time'),
    flightTime: document.getElementById('flight-time'),
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
    vel_n: document.getElementById('vel_n'),
    vel_e: document.getElementById('vel_e'),
    vel_d: document.getElementById('vel_d'),
    temp: document.getElementById('temp'),
    pressure: document.getElementById('pressure'),
    ejection: document.getElementById('ejection'),
  };

  function updateLocalTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    uiElements.time.textContent = `${hours}:${minutes}:${seconds}`;
  }
  setInterval(updateLocalTime, 1000);
  updateLocalTime();

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

  function updateEjectionStatus(status) {
    const elem = uiElements.ejection;
    let text = 'UNKNOWN';
    let className = 'status-danger';

    switch (status) {
      case 0: text = 'SAFE'; className = 'status-safe'; break;
      case 1: text = 'ATTITUDE EJECT'; className = 'status-warn'; break;
      case 2: text = 'ALTITUDE EJECT'; className = 'status-warn'; break;
      case 3: text = 'TIMER EJECT'; className = 'status-warn'; break;
    }
    elem.textContent = text;
    elem.className = 'value telemetry-font'; 
    elem.classList.add(className);
  }

  function updateDashboard(data) {
    if (!data) return;

    uiElements.roll.textContent = `${data.roll}°`;
    uiElements.pitch.textContent = `${data.pitch}°`;
    uiElements.yaw.textContent = `${data.yaw}°`;

    uiElements.p_alt.textContent = `${data.P_alt} m`;
    uiElements.alt.textContent = `${data.Alt} m`;
    
    uiElements.ax.textContent = `${data.ax} m/s²`;
    uiElements.ay.textContent = `${data.ay} m/s²`;
    uiElements.az.textContent = `${data.az} m/s²`;
    
    uiElements.lat.textContent = `${data.lat.toFixed(7)}° N`;
    uiElements.lon.textContent = `${data.lon.toFixed(7)}° E`;
    
    uiElements.vel_n.textContent = `${data.vel_n} m/s`;
    uiElements.vel_e.textContent = `${data.vel_e} m/s`;
    uiElements.vel_d.textContent = `${data.vel_d} m/s`;

    uiElements.temp.textContent = `${data.temp} °C`;
    uiElements.pressure.textContent = `${data.pressure} hPa`;
    
    // [수정] 서버에서 받은 timestamp(초)에 1000을 곱해 ms 단위로 변환
    uiElements.flightTime.textContent = formatFlightTime(data.timestamp * 1000);
    updateEjectionStatus(data.ejection);

    updateNavball(parseFloat(data.roll), parseFloat(data.pitch), parseFloat(data.yaw));
    updateMapCenter(data.lat, data.lon);
    updateCharts(data);
  }
  
  const socket = io();
  socket.on('rocketData', data => {
    updateDashboard(data);
  });
});

import { initNavball, updateNavball } from './navball.js';
import { initMap, updateMap } from './map.js';
import { initCharts, updateCharts } from './charts.js';
import { initRocketAttitude, updateRocketAttitude } from './rocket_attitude.js';

document.addEventListener('DOMContentLoaded', () => {

  initMap();
  initNavball();
  initCharts();
  initRocketAttitude();

  const uiElements = {
    time: document.getElementById('time'),
    flightTime: document.getElementById('flight-time'),
    roll: document.getElementById('roll'),
    pitch: document.getElementById('pitch'),
    yaw: document.getElementById('yaw'),
    p_alt: document.getElementById('p_alt'),
    alt: document.getElementById('alt'),
    max_alt: document.getElementById('max_alt'),
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

  let maxAltitude = 0;

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
      case 1: text = 'ATTITUDE EJECTED'; className = 'status-attitude'; break;
      case 2: text = 'ALTITUDE EJECTED'; className = 'status-altitude'; break;
      case 3: text = 'TIMER EJECTED'; className = 'status-timer'; break;
    }

    // ▼▼▼ 이 부분이 수정되었습니다 ▼▼▼
    // 1. 잔상 글씨용 데이터에 '숫자' 형태를 모두 저장합니다.
    elem.dataset.text = `${status}`;
    
    // 2. 실제 색상이 적용될 주 텍스트는 '문자열'만 설정합니다.
    elem.innerHTML = `<span class="main-text">${text}</span>`;

    // 부모 태그에 클래스 적용
    elem.className = 'value telemetry-font'; 
    elem.classList.add(className);
  }

  function updateDashboard(data) {
    if (!data) return;

    const flightTimeMs = data.timestamp * 1000;
    const formattedFlightTime = formatFlightTime(flightTimeMs);

    uiElements.roll.textContent = `${data.roll}°`;
    uiElements.pitch.textContent = `${data.pitch}°`;
    uiElements.yaw.textContent = `${data.yaw}°`;

    uiElements.p_alt.textContent = `${data.P_alt} m`;
    uiElements.alt.textContent = `${data.Alt} m`;
    
    const currentAltitude = parseFloat(data.Alt);
    if (!isNaN(currentAltitude) && currentAltitude > maxAltitude) {
      maxAltitude = currentAltitude;
    }
    uiElements.max_alt.textContent = `${maxAltitude.toFixed(2)} m`;
    
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
    
    uiElements.flightTime.textContent = formattedFlightTime;
    updateEjectionStatus(data.ejection);

    updateNavball(parseFloat(data.roll), parseFloat(data.pitch), parseFloat(data.yaw));
    
    updateRocketAttitude(parseFloat(data.pitch), parseFloat(data.yaw));

    updateMap(data.lat, data.lon, formattedFlightTime);
    
    updateCharts(data);
  }
  
  const socket = io();
  socket.on('rocketData', data => {
    updateDashboard(data);
  });
});
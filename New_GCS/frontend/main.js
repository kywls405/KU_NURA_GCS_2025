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
    time:       document.getElementById('time'),
    flightTime: document.getElementById('flight-time'),
    roll:       document.getElementById('roll'),
    pitch:      document.getElementById('pitch'),
    yaw:        document.getElementById('yaw'),
    p_alt:      document.getElementById('p_alt'),
    alt:        document.getElementById('alt'),
    max_alt:    document.getElementById('max_alt'),
    ax:         document.getElementById('ax'),
    ay:         document.getElementById('ay'),
    az:         document.getElementById('az'),
    lat:        document.getElementById('lat'),
    lon:        document.getElementById('lon'),
    vel_n:      document.getElementById('vel_n'),
    vel_e:      document.getElementById('vel_e'),
    vel_d:      document.getElementById('vel_d'),
    temp:       document.getElementById('temp'),
    pressure:   document.getElementById('pressure'),
    ejection:   document.getElementById('ejection'),
  };

  let maxAltitude = 0;
  let clientFlightStartTime = null;
  let clientEjectionStatus = 0;

  // 초기 ejection 상태 설정
  uiElements.ejection.dataset.text = '0';
  uiElements.ejection.innerHTML = `<span class="main-text">SAFE</span>`;
  uiElements.ejection.className = 'value telemetry-font status-safe';

  function updateLocalTime() {
    const now = new Date();
    uiElements.time.textContent =
      `${String(now.getHours()).padStart(2, '0')}:` +
      `${String(now.getMinutes()).padStart(2, '0')}:` +
      `${String(now.getSeconds()).padStart(2, '0')}`;
  }
  setInterval(updateLocalTime, 1000);
  updateLocalTime();

  function formatFlightTime(ms) {
    if (typeof ms !== 'number' || ms < 0) {
      return 'T+ 00:00:00';
    }
    const totalSeconds = Math.floor(ms / 1000);
    const hours   = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `T+ ${hours}:${minutes}:${seconds}`;
  }

  function updateEjectionStatus(status) {
    const elem = uiElements.ejection;
    let text = 'UNKNOWN';
    let className = 'status-danger';
    switch (status) {
      case 0: text = 'SAFE';             className = 'status-safe';     break;
      case 1: text = 'ATTITUDE CAUTION'; className = 'status-attitude'; break;
      case 2: text = 'ALTITUDE CAUTION'; className = 'status-altitude'; break;
      case 3: text = 'TIME CAUTION';     className = 'status-timer';    break;
    }
    elem.dataset.text = `${status}`;
    elem.innerHTML = `<span class="main-text">${text}</span>`;
    elem.className = 'value telemetry-font';
    elem.classList.add(className);
  }

  // [수정] 함수의 역할을 명확히 하도록 이름 변경 (calculatePlanarAngle -> calculateTiltMagnitude)
  function calculateTiltMagnitude(pitch, roll) {
    // 로켓의 수직 자세로부터의 기울기 크기를 계산
    const tiltDeg = Math.sqrt(Math.pow(roll, 2) + Math.pow(pitch, 2));
    return tiltDeg;
  }

  function updateDashboard(data) {
    if (!data) return;

    // 1) 비행 시간 계산 & ejection 상태 고정
    const serverTs = Number(data.timestamp);
    if (clientFlightStartTime === null && !isNaN(serverTs)) {
      clientFlightStartTime = serverTs;
    }
    const flightSeconds = serverTs - clientFlightStartTime;
    const flightMs = flightSeconds > 0 ? flightSeconds * 1000 : 0;
    uiElements.flightTime.textContent = formatFlightTime(flightMs);

    if (clientEjectionStatus === 0) {
      const altNum    = Number(data.Alt);
      // [수정] 변경된 함수 이름 사용
      const tiltAngle = calculateTiltMagnitude(data.pitch, data.roll);
      
      if (tiltAngle > 70)      clientEjectionStatus = 1; // 자세 경고
      if (altNum > 400)        clientEjectionStatus = 2; // 고도 경고
      if (flightSeconds > 60)  clientEjectionStatus = 3; // 시간 경고
    }
    updateEjectionStatus(clientEjectionStatus);

    // 2) UI 필드 업데이트
    // [수정] .toFixed()를 사용하여 모든 숫자 데이터의 표시 형식을 통일
    uiElements.roll.textContent      = `${Number(data.roll).toFixed(2)}°`;
    uiElements.pitch.textContent     = `${Number(data.pitch).toFixed(2)}°`;
    uiElements.yaw.textContent       = `${Number(data.yaw).toFixed(2)}°`;
    uiElements.p_alt.textContent     = `${Number(data.P_alt).toFixed(2)} m`;
    uiElements.alt.textContent       = `${Number(data.Alt).toFixed(2)} m`;

    const altNum = Number(data.Alt);
    if (!isNaN(altNum) && altNum > maxAltitude) {
      maxAltitude = altNum;
    }
    uiElements.max_alt.textContent   = `${maxAltitude.toFixed(2)} m`;

    uiElements.ax.textContent        = `${Number(data.ax).toFixed(2)} m/s²`;
    uiElements.ay.textContent        = `${Number(data.ay).toFixed(2)} m/s²`;
    uiElements.az.textContent        = `${Number(data.az).toFixed(2)} m/s²`;
    uiElements.lat.textContent       = `${Number(data.lat).toFixed(7)}° N`;
    uiElements.lon.textContent       = `${Number(data.lon).toFixed(7)}° E`;
    uiElements.vel_n.textContent     = `${Number(data.vel_n).toFixed(2)} m/s`;
    uiElements.vel_e.textContent     = `${Number(data.vel_e).toFixed(2)} m/s`;
    uiElements.vel_d.textContent     = `${Number(data.vel_d).toFixed(2)} m/s`;
    uiElements.temp.textContent      = `${Number(data.temp).toFixed(2)} °C`;
    uiElements.pressure.textContent  = `${Number(data.pressure).toFixed(2)} hPa`;

    // 3) 컴포넌트 업데이트
    // [수정] 데이터가 이미 숫자 타입이므로 불필요한 parseFloat 제거
    updateNavball(data.roll, data.pitch, data.yaw);
    updateRocketAttitude(data.pitch, data.roll);
    updateMap(data.lat, data.lon, uiElements.flightTime.textContent);
    updateCharts(data);
  }

  const socket = io();
  socket.on('rocketData', updateDashboard);
});
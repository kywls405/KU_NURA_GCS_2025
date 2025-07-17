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
      `${String(now.getHours()).padStart(2,'0')}:` +
      `${String(now.getMinutes()).padStart(2,'0')}:` +
      `${String(now.getSeconds()).padStart(2,'0')}`;
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
      case 3: text = 'TIME CAUTION';    className = 'status-timer';    break;
    }
    elem.dataset.text = `${status}`;
    elem.innerHTML = `<span class="main-text">${text}</span>`;
    elem.className = 'value telemetry-font';
    elem.classList.add(className);
  }

  function calculatePlanarAngle(pitchDeg, yawDeg) {
    const p = pitchDeg * Math.PI/180;
    const y = yawDeg   * Math.PI/180;
    const x = Math.cos(p)*Math.sin(y);
    const vY = Math.cos(p)*Math.cos(y);
    const mag = Math.hypot(x, vY);
    const cosφ = mag > 0 ? vY/mag : 1;
    return Math.acos(Math.max(-1, Math.min(1, cosφ))) * 180/Math.PI;
  }

  function updateDashboard(data) {
    if (!data) return;

    // 1) 비행 시간 계산 & ejection 상태 고정
    const serverTs = parseFloat(data.timestamp);
    if (clientFlightStartTime === null && !isNaN(serverTs)) {
      clientFlightStartTime = serverTs;
    }
    const flightSeconds = serverTs - clientFlightStartTime;
    const flightMs = flightSeconds > 0 ? flightSeconds * 1000 : 0;
    uiElements.flightTime.textContent = formatFlightTime(flightMs);

    if (clientEjectionStatus === 0) {
      const altNum    = parseFloat(data.Alt);
      const angle2d   = calculatePlanarAngle(
                          parseFloat(data.pitch),
                          parseFloat(data.yaw)
                        );
      if (angle2d > 70)   clientEjectionStatus = 1;
      if (altNum > 400)   clientEjectionStatus = 2;
      if (flightSeconds > 60) clientEjectionStatus = 3;
    }
    updateEjectionStatus(clientEjectionStatus);

    // 2) UI 필드 업데이트
    uiElements.roll.textContent    = `${data.roll}°`;
    uiElements.pitch.textContent   = `${data.pitch}°`;
    uiElements.yaw.textContent     = `${data.yaw}°`;
    uiElements.p_alt.textContent   = `${data.P_alt} m`;
    uiElements.alt.textContent     = `${data.Alt} m`;

    const altNum = parseFloat(data.Alt);
    if (!isNaN(altNum) && altNum > maxAltitude) {
      maxAltitude = altNum;
    }
    uiElements.max_alt.textContent = `${maxAltitude.toFixed(2)} m`;

    uiElements.ax.textContent      = `${data.ax} m/s²`;
    uiElements.ay.textContent      = `${data.ay} m/s²`;
    uiElements.az.textContent      = `${data.az} m/s²`;
    uiElements.lat.textContent     = `${data.lat.toFixed(7)}° N`;
    uiElements.lon.textContent     = `${data.lon.toFixed(7)}° E`;
    uiElements.vel_n.textContent   = `${data.vel_n} m/s`;
    uiElements.vel_e.textContent   = `${data.vel_e} m/s`;
    uiElements.vel_d.textContent   = `${data.vel_d} m/s`;
    uiElements.temp.textContent    = `${data.temp} °C`;
    uiElements.pressure.textContent= `${data.pressure} hPa`;

    // 3) 컴포넌트 업데이트
    updateNavball(
      parseFloat(data.roll),
      parseFloat(data.pitch),
      parseFloat(data.yaw)
    );
    updateRocketAttitude(
      parseFloat(data.pitch),
      parseFloat(data.yaw)
    );
    updateMap(data.lat, data.lon, uiElements.flightTime.textContent);
    updateCharts(data);
  }

  const socket = io();
  socket.on('rocketData', updateDashboard);
});

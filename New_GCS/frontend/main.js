// frontend/main.js

import { initNavball, updateNavball } from './navball.js';
import { initMap, updateMap } from './map.js';
import { initCharts, updateCharts } from './charts.js';
import { initRocketAttitude, updateRocketAttitude } from './rocket_attitude.js';

document.addEventListener('DOMContentLoaded', () => {
  // --- 초기화 ---
  initMap();
  initNavball();
  initCharts();
  initRocketAttitude();

  // --- UI 요소 전체 관리 ---
  const uiElements = {
    time:             document.getElementById('time'),
    flightTime:       document.getElementById('flight-time'),
    connectedTime:    document.getElementById('connected-time'),
    connectionStatus: document.getElementById('connection-status'),
    statusDisplay:    document.getElementById('status-display'),
    connectButton:    document.getElementById('connect-btn'),
    disconnectButton: document.getElementById('disconnect-btn'),
    portSelect:       document.getElementById('port-select'),
    refreshPortsBtn:  document.getElementById('refresh-ports-btn'),
    baudInput:        document.getElementById('baud-input'),
    roll:             document.getElementById('roll'),
    pitch:            document.getElementById('pitch'),
    yaw:              document.getElementById('yaw'),
    p_alt:            document.getElementById('p_alt'),
    alt:              document.getElementById('alt'),
    max_alt:          document.getElementById('max_alt'),
    ax:               document.getElementById('ax'),
    ay:               document.getElementById('ay'),
    az:               document.getElementById('az'),
    lat:              document.getElementById('lat'),
    lon:              document.getElementById('lon'),
    vel_n:            document.getElementById('vel_n'),
    vel_e:            document.getElementById('vel_e'),
    vel_d:            document.getElementById('vel_d'),
    temp:             document.getElementById('temp'),
    pressure:         document.getElementById('pressure'),
    ejection:         document.getElementById('ejection'),
    // [수정] 새로운 ID로 변경
    launchIndicator:  document.getElementById('launch-status-indicator'),
    ejectedOverlay:   document.getElementById('ejected-overlay'),
  };

  // --- 전역 변수 ---
  let maxAltitude = 0;
  let clientEjectionCautionStatus = 0;
  let isEjected = false;
  let lastChartUpdateTime = 0;

  const socket = io();

  // --- 함수 정의 ---

  function updateLocalTime() {
    const now = new Date();
    uiElements.time.textContent =
      `${String(now.getHours()).padStart(2, '0')}:` +
      `${String(now.getMinutes()).padStart(2, '0')}:` +
      `${String(now.getSeconds()).padStart(2, '0')}`;
  }

  function formatTime(secondsValue) {
    if (typeof secondsValue !== 'number' || secondsValue < 0) {
      return '00:00:00';
    }
    const totalSeconds = Math.floor(secondsValue);
    const hours   = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }
  
  function updateSerialStatus(status, message) {
    if (uiElements.statusDisplay) {
      uiElements.statusDisplay.textContent = message;
      uiElements.statusDisplay.className = `status-${status}`;
    }
    if (uiElements.connectionStatus) {
      uiElements.connectionStatus.classList.remove('connected', 'connecting');
      switch (status) {
        case 'success':
          uiElements.connectionStatus.classList.add('connected');
          break;
        case 'info':
          uiElements.connectionStatus.classList.add('connecting');
          break;
        case 'error':
        default:
          break;
      }
    }
  }

  function resetDashboard() {
    maxAltitude = 0;
    clientEjectionCautionStatus = 0;
    isEjected = false;
    lastChartUpdateTime = 0;
    uiElements.flightTime.textContent = 'T+ 00:00:00';
    uiElements.connectedTime.textContent = '00:00:00';
    uiElements.max_alt.textContent = '0.00 m';
    updateEjectionStatus(0);
    updateLaunchStatus(0);
    
    const overlay = uiElements.ejectedOverlay;
    overlay.classList.remove('blinking');
    overlay.classList.add('hidden');

    initCharts();

    console.log("Dashboard has been reset.");
  }
  
  function updateEjectionStatus(status) {
    const elem = uiElements.ejection;
    let text = 'UNKNOWN';
    let className = 'status-danger';
    switch (status) {
      case 0: text = 'SAFE';               className = 'status-safe';     break;
      case 1: text = 'ATTITUDE CAUTION';   className = 'status-attitude'; break;
      case 2: text = 'ALTITUDE CAUTION';   className = 'status-altitude'; break;
      case 3: text = 'TIME CAUTION';       className = 'status-timer';    break;
    }
    elem.dataset.text = `${status}`;
    elem.innerHTML = `<span class="main-text">${text}</span>`;
    elem.className = 'value telemetry-font';
    elem.classList.add(className);
  }

  // [수정] updateLaunchStatus 함수 수정
  function updateLaunchStatus(status) {
    const elem = uiElements.launchIndicator;
    if (!elem) return; // 요소가 없으면 종료

    elem.classList.remove('safe', 'launched'); // 기존 상태 클래스 제거

    if (status === 1) {
      elem.classList.add('launched');
    } else {
      elem.classList.add('safe');
    }
  }
  
  function calculateTiltMagnitude(pitch, roll) {
    const tiltDeg = Math.sqrt(Math.pow(roll, 2) + Math.pow(pitch, 2));
    return tiltDeg;
  }
  
  function updateDashboard(data) {
    if (!data) return;

    uiElements.flightTime.textContent = `T+ ${formatTime(data.flight_timestamp)}`;
    uiElements.connectedTime.textContent = formatTime(data.connect_timestamp);

    updateLaunchStatus(data.launch);

    if (data.ejection > 0 && !isEjected) {
      isEjected = true;
      updateEjectionStatus(data.ejection);

      const overlay = uiElements.ejectedOverlay;
      
      overlay.classList.remove('hidden');
      overlay.classList.add('blinking');

      setTimeout(() => {
          overlay.classList.remove('blinking');
      }, 1500);

    } else if (!isEjected) {
      if (clientEjectionCautionStatus === 0) {
        const altNum    = Number(data.Alt);
        const tiltAngle = calculateTiltMagnitude(data.pitch, data.roll);
        const flightSeconds = data.flight_timestamp;
        
        if (flightSeconds > 0 && tiltAngle > 70) clientEjectionCautionStatus = 1;
        if (altNum > 400)                        clientEjectionCautionStatus = 2;
        if (flightSeconds > 60)                  clientEjectionCautionStatus = 3;
      }
      updateEjectionStatus(clientEjectionCautionStatus);
    }
    
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

    updateNavball(data.roll, data.pitch, data.yaw);
    updateRocketAttitude(data.pitch, data.roll);
    updateMap(data.lat, data.lon, `T+ ${formatTime(data.flight_timestamp)}`);

    const now = Date.now();
    const CHART_UPDATE_INTERVAL = 250;
    if (now - lastChartUpdateTime > CHART_UPDATE_INTERVAL) {
      updateCharts(data);
      lastChartUpdateTime = now;
    }
  }

  // --- 이벤트 핸들러 (UI -> 서버) ---
  uiElements.connectButton.addEventListener('click', () => {
    const port = uiElements.portSelect.value;
    const baud = uiElements.baudInput.value;
    if (!port || port === '사용 가능한 포트 없음') {
      alert('포트 목록을 조회하고 선택해주세요.');
      return;
    }
    if (!baud) {
      alert('Baudrate를 입력하세요.');
      return;
    }
    resetDashboard();
    socket.emit('connect-serial', { port, baud });
  });

  uiElements.disconnectButton.addEventListener('click', () => {
    socket.emit('disconnect-serial');
    resetDashboard();
  });
  
  uiElements.refreshPortsBtn.addEventListener('click', () => {
    const select = uiElements.portSelect;
    select.innerHTML = '<option>조회 중...</option>';
    socket.emit('request-serial-ports');
  });

  // --- 소켓 이벤트 리스너 (서버 -> UI) ---
  socket.on('rocketData', (payload) => {
    if (payload) {
      updateDashboard(payload);
    }
  });

  socket.on('serial-status-update', (data) => {
    updateSerialStatus(data.status, data.message);
  });
  
  socket.on('serial-ports-list', (ports) => {
    const select = uiElements.portSelect;
    select.innerHTML = '';
    if (ports && ports.length > 0) {
      ports.forEach(port => {
        const option = document.createElement('option');
        option.value = port.device;
        option.textContent = `${port.device} (${port.description})`;
        select.appendChild(option);
      });
    } else {
      const option = document.createElement('option');
      option.textContent = '사용 가능한 포트 없음';
      option.disabled = true;
      select.appendChild(option);
    }
  });
  
  socket.on('disconnect', () => {
    updateSerialStatus('error', '서버와 연결이 끊겼습니다.');
  });
  
  // --- 초기화 및 주기적 실행 ---
  setInterval(updateLocalTime, 1000);
  updateLocalTime();
  updateEjectionStatus(0);
  updateLaunchStatus(0);
  updateSerialStatus('error', '연결되지 않음');
  
  socket.emit('request-serial-ports');
});

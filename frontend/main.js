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
    launchIndicator:  document.getElementById('launch-status-indicator'),
    ejectedOverlay:   document.getElementById('ejected-overlay'),
    eventLog:         document.getElementById('event-log'),
  };

  // --- 전역 변수 ---
  let maxAltitude = 0;
  let clientEjectionCautionStatus = 0;
  let isEjected = false;
  let lastChartUpdateTime = 0;
  let apogeeLogged = false;
  let isConnected = false;
  let launchSignalReceived = false;
  let altitudeBuffer = []; // [추가] 고도 평균 계산을 위한 버퍼
  let max_avg_alt = 0; // [추가] 최고 평균 고도를 저장하는 변수

  const socket = io();

  // --- 함수 정의 ---

  function addLogMessage(message, type = 'info', showIndicator = false) {
    if (!uiElements.eventLog) return;

    const now = new Date();
    const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const logEntry = document.createElement('p');
    
    const timeSpan = document.createElement('span');
    timeSpan.className = 'log-time';
    timeSpan.textContent = timeString;
    logEntry.appendChild(timeSpan);

    if (showIndicator) {
        const indicatorSpan = document.createElement('span');
        indicatorSpan.className = 'log-indicator-dot';
        if (type === 'success') {
            indicatorSpan.classList.add('connected');
        } else if (type === 'info') {
            indicatorSpan.classList.add('connecting');
        } else if (type === 'error') {
            indicatorSpan.classList.add('error');
        }
        logEntry.appendChild(indicatorSpan);
    }

    const typeSpan = document.createElement('span');
    let typeText = '[INFO]';
    let typeClass = 'log-info';

    switch (type) {
        case 'success':
            typeText = '[SUCCESS]';
            typeClass = 'log-success';
            break;
        case 'error':
            typeText = '[ERROR]';
            typeClass = 'log-error';
            break;
        case 'system':
            typeText = '[SYSTEM]';
            typeClass = 'log-system';
            break;
        case 'caution':
            typeText = '[CAUTION]';
            typeClass = 'log-caution';
            break;
        default: // 'info'
            typeText = '[INFO]';
            typeClass = 'log-info';
            break;
    }
    typeSpan.className = typeClass;
    typeSpan.textContent = typeText;

    logEntry.appendChild(typeSpan);
    logEntry.append(` ${message}`);

    uiElements.eventLog.appendChild(logEntry);
    uiElements.eventLog.scrollTop = uiElements.eventLog.scrollHeight;
  }

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
            if (!isConnected) {
                addLogMessage('🟢시리얼 포트에 연결되었습니다.', 'success');
            }
            isConnected = true;
            uiElements.connectionStatus.classList.add('connected');
            break;
        case 'info':
          if (!isConnected) {
            uiElements.connectionStatus.classList.add('connecting');
            addLogMessage('🟡시리얼 포트에 연결 중입니다.', 'system');
          }
          break;
        case 'error':
        default:
          isConnected = false;
          break;
      }
    }
  }

  function resetDashboard() {
    maxAltitude = 0;
    clientEjectionCautionStatus = 0;
    isEjected = false;
    lastChartUpdateTime = 0;
    apogeeLogged = false;
    isConnected = false;
    launchSignalReceived = false;
    altitudeBuffer = []; // [추가]
    max_avg_alt = 0; // [추가]

    uiElements.flightTime.textContent = 'T+ 00:00:00';
    uiElements.connectedTime.textContent = '00:00:00';
    uiElements.max_alt.textContent = '0.00 m';
    updateEjectionStatus(0);
    updateLaunchStatus(0);
    
    const overlay = uiElements.ejectedOverlay;
    overlay.classList.remove('blinking', 'ejected-background');
    overlay.classList.add('hidden');

    initCharts();

    if(uiElements.eventLog) uiElements.eventLog.innerHTML = '';
    addLogMessage('서버가 실행되었습니다.', 'system');

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

  function updateLaunchStatus(status) {
    const elem = uiElements.launchIndicator;
    if (!elem) return;
    elem.classList.remove('safe', 'launched');
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

    if (data.launch === 1 && !launchSignalReceived) {
        launchSignalReceived = true;
        clientEjectionCautionStatus = 0;
        addLogMessage('🚀발사되었습니다.', 'success');
    }

    if (data.ejection > 0 && !isEjected && data.launch === 1) {
      isEjected = true;
      updateEjectionStatus(data.ejection); 
      
      if (data.ejection === 1) {addLogMessage('🪂사출 명령(자세1)이 수신되었습니다.', 'success');}
      else if (data.ejection === 2) {addLogMessage('🪂사출 명령(고도2)이 수신되었습니다.', 'success');}
      else if (data.ejection === 3) {addLogMessage('🪂사출 명령(시간3)이 수신되었습니다.', 'success');} 

      const overlay = uiElements.ejectedOverlay;
      overlay.classList.remove('hidden');
      overlay.classList.add('blinking');

      setTimeout(() => {
          overlay.classList.remove('blinking');
          overlay.classList.add('ejected-background');
      }, 1500);

    } else if (!isEjected) {
        const altNum = Number(data.Alt);

        // [개선] 고도 버퍼 업데이트
        altitudeBuffer.push(altNum);
        if (altitudeBuffer.length > 50) {
            altitudeBuffer.shift();
        }

        if (clientEjectionCautionStatus === 0) {
            const tiltAngle = calculateTiltMagnitude(data.pitch, data.roll);
            const flightSeconds = data.flight_timestamp;

            const angle_caution = tiltAngle > 70;
            let alt_caution = false; // [개선] 기본값은 false
            const time_caution = flightSeconds > 9;

            // [개선] 고도 경고 로직 수정
            if (altitudeBuffer.length === 50) {
                const avg_alt = altitudeBuffer.reduce((a, b) => a + b, 0) / 50;
                if (avg_alt > max_avg_alt) {
                    max_avg_alt = avg_alt;
                }
                if (max_avg_alt - avg_alt > 3) {
                    alt_caution = true;
                }
            }

            if (angle_caution) {addLogMessage('⚠️자세 경고(1)가 발생했습니다.', 'caution'); clientEjectionCautionStatus = 1;}
            else if (alt_caution) {addLogMessage('⚠️고도 경고(2)가 발생했습니다.', 'caution'); clientEjectionCautionStatus = 2;}
            else if (time_caution) {addLogMessage('⚠️시간 경고(3)가 발생했습니다.', 'caution'); clientEjectionCautionStatus = 3;}
        }
        updateEjectionStatus(clientEjectionCautionStatus);
    }
    
    uiElements.roll.textContent      = `${Number(data.roll).toFixed(2)}°`;
    uiElements.pitch.textContent     = `${Number(data.pitch).toFixed(2)}°`;
    uiElements.yaw.textContent       = `${Number(data.yaw).toFixed(2)}°`;
    uiElements.p_alt.textContent     = `${Number(data.P_alt).toFixed(2)} m`;
    uiElements.alt.textContent       = `${Number(data.Alt).toFixed(2)} m`;

    const altNum = Number(data.Alt);
    const isDescending = data.vel_d > 0;

    if (!isNaN(altNum) && altNum > maxAltitude) {
      maxAltitude = altNum;
    } else if (isDescending && maxAltitude > 10 && !apogeeLogged) {
      addLogMessage(`MAX Altitude: ${maxAltitude.toFixed(2)}m`, 'system');
      apogeeLogged = true;
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
    const CHART_UPDATE_INTERVAL = 100;
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
    
    const connectMessage = `${port}@${baud}로 연결 시도 중...`;
    updateSerialStatus('info', '연결 중...');
    addLogMessage(connectMessage, 'info', true);
    
    socket.emit('connect-serial', { port, baud });
  });

  uiElements.disconnectButton.addEventListener('click', () => {
    socket.emit('disconnect-serial');
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
    const isConnectionLog = /연결|종료|중지/.test(data.message);
    addLogMessage(data.message, data.status, isConnectionLog);
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
    addLogMessage('서버와의 연결이 끊겼습니다.🔴', 'error', true);
  });
  
  // --- 초기화 및 주기적 실행 ---
  setInterval(updateLocalTime, 1000);
  updateLocalTime();
  updateEjectionStatus(0);
  updateLaunchStatus(0);
  updateSerialStatus('error', '연결되지 않음');
  
  if(uiElements.eventLog) uiElements.eventLog.innerHTML = '';
  addLogMessage('GCS가 초기화되었습니다.', 'system');
  addLogMessage('원격 측정 데이터 수신 대기 중...', 'info');
  
  socket.emit('request-serial-ports');
});

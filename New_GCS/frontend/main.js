// frontend/main.js

const socket = io();

// 패킷 수신 시 처리
socket.on('rocketData', data => {
  console.log('📡 Received:', data);

  // attitude
  document.getElementById('roll').textContent = `${data.roll}°`;
  document.getElementById('pitch').textContent = `${data.pitch}°`;
  document.getElementById('yaw').textContent = `${data.yaw}°`;

  // altitudes
  document.getElementById('p_alt').textContent = `${data.p_alt} m`;
  document.getElementById('alt').textContent = `${data.alt} m`;

  // acceleration
  document.getElementById('ax').textContent = `${data.ax} m/s²`;
  document.getElementById('ay').textContent = `${data.ay} m/s²`;
  document.getElementById('az').textContent = `${data.az} m/s²`;

  // GPS
  document.getElementById('lat').textContent = `${data.lat.toFixed(6)}° N`;
  document.getElementById('lon').textContent = `${data.lon.toFixed(6)}° E`;

  // temp & pressure
  document.getElementById('temp').textContent = `${data.temp} °C`;
  document.getElementById('pressure').textContent = `${data.pressure} hPa`;

  // ejection status (단순 출력)
  document.getElementById('ejection').textContent = `ejection: ${data.ejection}`;
});

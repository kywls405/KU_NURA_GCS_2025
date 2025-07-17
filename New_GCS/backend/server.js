// backend/server.js (ES module 스타일)

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import net from 'net';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

const TCP_PORT = 9000;
const tcpServer = net.createServer(socket => {
  console.log('🟢 Python connected to TCP server');

  let buffer = '';

  socket.on('data', data => {
    buffer += data.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      try {
        const json = JSON.parse(line);
        io.emit('rocketData', json);
      } catch (err) {
        console.error('❌ JSON parse error:', err.message);
      }
    }
  });

  socket.on('close', () => {
    console.log('🔌 Python TCP connection closed');
  });

  socket.on('error', err => {
    console.error('⚠️ TCP socket error:', err.message);
  });
});

tcpServer.listen(TCP_PORT, () => {
  console.log(`🚀 TCP server listening on port ${TCP_PORT}`);
});

io.on('connection', socket => {
  console.log('🌐 Web client connected');
});

const WEB_PORT = 3000;
server.listen(WEB_PORT, () => {
  console.log(`🌍 GCS Dashboard available at http://localhost:${WEB_PORT}`);
});

const telemetryState = {
  timestamp: 0,
  roll: 0, pitch: 0, yaw: 0,
  P_alt: 0, Alt: 0,
  ax: 0, ay: 0, az: 0,
  lat: 37.5408, lon: 127.0794,
  vel_n: 0, vel_e: 0, vel_d: 0,
  temp: 25, pressure: 1013,
  ejection: 0
};

const simulatorDirection = {
  roll: 1,
  pitch: 1,
  yaw: 1
};

let flightStartTime;

/**
 * XY 평면상에서 초기(0,1) 벡터 기준 0~180° 회전량 계산
 */
function getPlanarAngleFromPitchYaw(pitchDeg, yawDeg) {
  const pitchRad = pitchDeg * Math.PI / 180;
  const yawRad   = yawDeg   * Math.PI / 180;

  // 3D 방향벡터의 XY 성분
  const x = Math.cos(pitchRad) * Math.sin(yawRad);
  const y = Math.cos(pitchRad) * Math.cos(yawRad);

  // 크기와 단위벡터 Y 성분
  const mag = Math.hypot(x, y);
  const vY  = mag > 0 ? y / mag : 1;

  // acos 입력값 클램프 후 0~π 라디안 → 0~180도
  const clamped = Math.max(-1, Math.min(1, vY));
  return Math.acos(clamped) * 180 / Math.PI;
}

function startFastEmitter(io) {
  setInterval(() => {
    telemetryState.roll  += simulatorDirection.roll;
    telemetryState.pitch += simulatorDirection.pitch;
    telemetryState.yaw   += simulatorDirection.yaw;

    if (telemetryState.roll  >= 180 || telemetryState.roll  <= -180) simulatorDirection.roll  *= -1;
    if (telemetryState.pitch >=  90 || telemetryState.pitch <=  -90) simulatorDirection.pitch *= -1;
    if (telemetryState.yaw   >= 360 || telemetryState.yaw   <=    0) simulatorDirection.yaw   *= -1;

    if (flightStartTime) {
      telemetryState.timestamp = (Date.now() - flightStartTime) / 1000;
    }

    const angleInDegrees = getPlanarAngleFromPitchYaw(
      telemetryState.pitch,
      telemetryState.yaw
    );

    const dataToSend = {
      ...telemetryState,
      roll:      telemetryState.roll.toFixed(2),
      pitch:     telemetryState.pitch.toFixed(2),
      yaw:       telemetryState.yaw.toFixed(2),
      P_alt:     telemetryState.P_alt.toFixed(2),
      Alt:       telemetryState.Alt.toFixed(2),
      ax:        telemetryState.ax.toFixed(2),
      ay:        telemetryState.ay.toFixed(2),
      az:        telemetryState.az.toFixed(2),
      vel_n:     telemetryState.vel_n.toFixed(2),
      vel_e:     telemetryState.vel_e.toFixed(2),
      vel_d:     telemetryState.vel_d.toFixed(2),
      temp:      telemetryState.temp.toFixed(2),
      pressure:  telemetryState.pressure.toFixed(2),
      angle:     angleInDegrees.toFixed(2)
    };

    io.emit('rocketData', dataToSend);
  }, 20);
}

function startSlowUpdater() {
  const update = () => {
    let baseAltitude = telemetryState.Alt + Math.random() * 10;
    if (baseAltitude > 400) baseAltitude = 0;
    telemetryState.Alt   = baseAltitude + 80;
    telemetryState.P_alt = baseAltitude + (Math.random() - 0.5) * 10;

    telemetryState.lat   += (Math.random() - 0.5) * 0.00005;
    telemetryState.lon   += (Math.random() - 0.5) * 0.00005;

    telemetryState.ax   = Math.random() * 2;
    telemetryState.ay   = Math.random() * 2;
    telemetryState.az   = Math.random() * 20 + 5;
    telemetryState.vel_n = Math.random() * 5 - 2.5;
    telemetryState.vel_e = Math.random() * 5 - 2.5;
    telemetryState.vel_d = baseAltitude > 10 ? -Math.random() * 20 : Math.random();
    telemetryState.temp = Math.random() * 15 + 15;
    telemetryState.pressure = 1013 - baseAltitude / 8.3;

    const angleInDegrees = getPlanarAngleFromPitchYaw(
      telemetryState.pitch,
      telemetryState.yaw
    );
    const randomDelay = 600 + Math.random() * 200;
    setTimeout(update, randomDelay);
  };
  update();
}

function startRandomDataEmitter(io) {
  console.log('✅ 데이터 전송 시뮬레이터를 10초 후에 시작합니다.');
  setTimeout(() => {
    console.log('✅ [수정] 실제와 유사한 데이터 전송 시뮬레이터를 시작합니다.');
    flightStartTime = Date.now();
    startFastEmitter(io);
    startSlowUpdater();
  }, 10000);
}

startRandomDataEmitter(io);

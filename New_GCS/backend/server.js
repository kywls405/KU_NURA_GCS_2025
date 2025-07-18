// backend/server.js

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import net from 'net';
import path from 'path';
import { fileURLToPath } from 'url';

/*
 * =================================================================
 * [수정] 실행 모드 설정
 * - 시뮬레이션 모드: const isSimulateMode = true;
 * - 실제 데이터 모드: const isSimulateMode = false;
 * =================================================================
 */
const isSimulateMode = true; // <-- 이 값을 true/false로 변경하세요.

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

// --- 실제 데이터용 TCP 서버 (시뮬레이션 모드가 아닐 때만 사용) ---
if (!isSimulateMode) {
  const TCP_PORT = 9000;
  const tcpServer = net.createServer(socket => {
    console.log('🟢 Python connected to TCP server');
    let buffer = '';

    socket.on('data', data => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (line) {
          try {
            const json = JSON.parse(line);
            io.emit('rocketData', json);
          } catch (err) {
            console.error('❌ JSON parse error:', err.message);
          }
        }
      }
    });

    socket.on('close', () => console.log('🔌 Python TCP connection closed'));
    socket.on('error', err => console.error('⚠️ TCP socket error:', err.message));
  });

  tcpServer.listen(TCP_PORT, () => {
    console.log(`🚀 TCP server listening on port ${TCP_PORT}. Waiting for Python client...`);
  });
}

io.on('connection', socket => {
  console.log('🌐 Web client connected');
});

const WEB_PORT = 3000;
server.listen(WEB_PORT, () => {
  console.log(`🌍 GCS Dashboard available at http://localhost:${WEB_PORT}`);
});


// --- 데이터 시뮬레이터 (시뮬레이션 모드일 때만 사용) ---
if (isSimulateMode) {
  const telemetryState = {
    timestamp: 0,
    roll: 0, pitch: 45, yaw: 0,
    P_alt: 0, Alt: 0,
    ax: 0, ay: 0, az: 0,
    lat: 37.5408, lon: 127.0794,
    vel_n: 0, vel_e: 0, vel_d: 0,
    temp: 25, pressure: 1013,
    ejection: 0
  };

  const simulatorDirection = { roll: 1, pitch: 1, yaw: 1 };
  let flightStartTime;

  function startFastEmitter(io) {
    setInterval(() => {
      telemetryState.roll += simulatorDirection.roll;
      if (telemetryState.roll > 180) telemetryState.roll -= 360;
      else if (telemetryState.roll < -180) telemetryState.roll += 360;

      telemetryState.pitch += simulatorDirection.pitch;
      if (telemetryState.pitch > 90 || telemetryState.pitch < -90) {
        simulatorDirection.pitch *= -1;
        telemetryState.pitch = Math.max(-90, Math.min(90, telemetryState.pitch));
      }

      telemetryState.yaw += simulatorDirection.yaw;
      if (telemetryState.yaw > 180) telemetryState.yaw -= 360;
      else if (telemetryState.yaw < -180) telemetryState.yaw += 360;

      if (flightStartTime) {
        telemetryState.timestamp = (Date.now() - flightStartTime) / 1000;
      }

      io.emit('rocketData', { ...telemetryState });
    }, 200);
  }

  function startSlowUpdater() {
    const update = () => {
      let baseAltitude = telemetryState.Alt + Math.random() * 10;
      if (baseAltitude > 400) baseAltitude = 0;
      telemetryState.Alt = baseAltitude + 80;
      telemetryState.P_alt = baseAltitude + (Math.random() - 0.5) * 10;
      telemetryState.lat += (Math.random() - 0.5) * 0.00005;
      telemetryState.lon += (Math.random() - 0.5) * 0.00005;
      telemetryState.ax = Math.random() * 2;
      telemetryState.ay = Math.random() * 2;
      telemetryState.az = Math.random() * 20 + 5;
      telemetryState.vel_n = Math.random() * 5 - 2.5;
      telemetryState.vel_e = Math.random() * 5 - 2.5;
      telemetryState.vel_d = baseAltitude > 10 ? -Math.random() * 20 : Math.random();
      telemetryState.temp = Math.random() * 15 + 15;
      telemetryState.pressure = 1013 - baseAltitude / 8.3;

      setTimeout(update, 600 + Math.random() * 200);
    };
    update();
  }

  function startRandomDataEmitter(io) {
    console.log('✅ Simulation mode activated. Starting data emitter in 5 seconds...');
    setTimeout(() => {
      console.log('✅ Starting realistic data simulation.');
      flightStartTime = Date.now();
      startFastEmitter(io);
      startSlowUpdater();
    }, 5000);
  }

  startRandomDataEmitter(io);
}
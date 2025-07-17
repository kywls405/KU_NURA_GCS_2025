// backend/server.js (ES module 스타일)

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import net from 'net';
import path from 'path';
import { fileURLToPath } from 'url';

// 👉 __dirname 대체 (ESM용)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Express + Socket.io 설정
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // 필요 시 특정 도메인으로 제한 가능
    methods: ["GET", "POST"]
  }
});

// 👉 정적 파일 제공 (frontend/index.html, main.js 등)
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// [1] Python 디코더로부터 TCP 수신
const TCP_PORT = 9000;
const tcpServer = net.createServer(socket => {
  console.log('🟢 Python connected to TCP server');

  let buffer = '';

  socket.on('data', data => {
    buffer += data.toString();

    const lines = buffer.split('\n');
    buffer = lines.pop(); // 마지막에 들어온 데이터는 완성되지 않았을 수 있으므로 버퍼에 남김

    for (const line of lines) {
      try {
        const json = JSON.parse(line);
        // console.log('📡 Received from Python:', json); // 로그가 너무 많으면 주석 처리
        io.emit('rocketData', json); // socket.io로 브라우저에 전송
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

// [2] 웹 클라이언트 연결
io.on('connection', socket => {
  console.log('🌐 Web client connected');
});

// [3] Express 웹 대시보드 실행
const WEB_PORT = 3000;
server.listen(WEB_PORT, () => {
  console.log(`🌍 GCS Dashboard available at http://localhost:${WEB_PORT}`);
});

// =======================================================================
// ▼▼▼ [수정] 랜덤 데이터 생성 시뮬레이터 (전송 주기 분리) ▼▼▼
// =======================================================================
// 실제 Python 클라이언트와 연동할 때는 아래 startRandomDataEmitter() 호출부를 주석 처리하세요.

// --- 시뮬레이터 상태를 저장할 단일 객체 ---
const telemetryState = {
    timestamp: 0,
    roll: 0, pitch: 0, yaw: 0,
    p_alt: 0, alt: 0,
    ax: 0, ay: 0, az: 0,
    lat: 37.5408, lon: 127.0794,
    vel_n: 0, vel_e: 0, vel_d: 0,
    temp: 25, pressure: 1013,
    ejection: 0
};

let flightStartTime = Date.now();

/**
 * 0.02초마다 자세 데이터(Roll, Pitch, Yaw)를 업데이트하고 전체 데이터를 전송합니다.
 * @param {Server} io - Socket.IO 서버 인스턴스
 */
function startFastEmitter(io) {
    setInterval(() => {
        // Roll, Pitch, Yaw 값을 1씩 수정
        telemetryState.roll += 1;
        telemetryState.pitch += 1;
        telemetryState.yaw += 1;

        // 각도 범위 처리
        if (telemetryState.roll >= 180) telemetryState.roll = -180;
        if (telemetryState.pitch > 90) telemetryState.pitch = -90;
        if (telemetryState.yaw >= 360) telemetryState.yaw = 0;

        // 비행 시간 업데이트
        telemetryState.timestamp = Date.now() - flightStartTime;

        // 최신 상태를 모든 클라이언트에 전송
        // toFixed()를 적용하여 문자열로 변환 후 전송
        const dataToSend = {
            ...telemetryState,
            roll: telemetryState.roll.toFixed(2),
            pitch: telemetryState.pitch.toFixed(2),
            yaw: telemetryState.yaw.toFixed(2),
            p_alt: telemetryState.p_alt.toFixed(2),
            alt: telemetryState.alt.toFixed(2),
            ax: telemetryState.ax.toFixed(3),
            ay: telemetryState.ay.toFixed(3),
            az: telemetryState.az.toFixed(3),
            vel_n: telemetryState.vel_n.toFixed(2),
            vel_e: telemetryState.vel_e.toFixed(2),
            vel_d: telemetryState.vel_d.toFixed(2),
            temp: telemetryState.temp.toFixed(2),
            pressure: telemetryState.pressure.toFixed(2),
        };
        io.emit('rocketData', dataToSend);
    }, 20); // 20ms = 0.02초
}

/**
 * 1초마다 자세를 제외한 나머지 데이터를 업데이트합니다.
 * (데이터를 직접 보내지 않고, telemetryState 객체의 값만 수정합니다)
 */
function startSlowUpdater() {
    setInterval(() => {
        // 고도 업데이트
        let baseAltitude = telemetryState.alt + Math.random() * 100; // 변화량 증가
        if (baseAltitude > 5000) baseAltitude = 0;
        telemetryState.alt = baseAltitude;
        telemetryState.p_alt = (baseAltitude + (Math.random() - 0.5) * 10);

        // GPS 좌표 업데이트
        telemetryState.lat += (Math.random() - 0.5) * 0.00005;
        telemetryState.lon += (Math.random() - 0.5) * 0.00005;

        // 가속도, 속도, 환경 데이터 업데이트
        telemetryState.ax = (Math.random() * 2);
        telemetryState.ay = (Math.random() * 2);
        telemetryState.az = (Math.random() * 20 + 5);
        telemetryState.vel_n = (Math.random() * 5 - 2.5);
        telemetryState.vel_e = (Math.random() * 5 - 2.5);
        telemetryState.vel_d = (baseAltitude > 10 ? -Math.random() * 20 : Math.random());
        telemetryState.temp = (Math.random() * 15 + 15);
        telemetryState.pressure = (1013 - baseAltitude / 8.3);

        // 사출 상태 업데이트
        let ejectionStatus = 0;
        if (baseAltitude > 4500) ejectionStatus = 2;
        else if (baseAltitude > 3000) ejectionStatus = 1;
        telemetryState.ejection = ejectionStatus;

    }, 1000); // 1000ms = 1초
}

/**
 * 데이터 전송 시뮬레이터를 시작하는 메인 함수
 * @param {Server} io - Socket.IO 서버 인스턴스
 */
function startRandomDataEmitter(io) {
    console.log('✅ [수정] 데이터 전송 시뮬레이터를 시작합니다 (자세: 20ms, 기타: 1000ms).');
    flightStartTime = Date.now();
    startFastEmitter(io); // 빠른 전송기 시작
    startSlowUpdater();   // 느린 업데이트 시작
}

// [실행] 테스트를 위해 랜덤 데이터 전송 시작
startRandomDataEmitter(io);
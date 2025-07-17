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
    buffer = lines.pop(); // 나중 줄은 아직 완성 안 된 JSON

    for (const line of lines) {
      try {
        const json = JSON.parse(line);
        console.log('📡 Received from Python:', json);
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

//////////////////////////////////////////////////////////////////////////////////////
// =======================================================================
// ▼▼▼ 랜덤 데이터 생성 시뮬레이터 (개발 및 테스트용) ▼▼▼
// =======================================================================
// 실제 Python 클라이언트와 연동할 때는 아래 startRandomDataEmitter() 호출부를 주석 처리하세요.

// --- 시뮬레이터 상태 변수 ---
let baseAltitude = 0;
let baseLat = 37.5408; // 건국대학교 위도
let baseLon = 127.0794; // 건국대학교 경도

// Roll, Pitch, Yaw 값을 저장하고 점진적으로 변경하기 위한 변수
let currentRoll = 0;
let currentPitch = 0;
let currentYaw = 0;


/**
 * 요청에 맞게 수정된 랜덤 원격 측정(Telemetry) 데이터를 생성하는 함수
 */
function generateRandomData() {
    // 고도와 GPS는 기존 로직을 유지하되, 호출 주기가 짧아졌으므로 증가량을 줄입니다.
    baseAltitude += Math.random() * 10; 
    if (baseAltitude > 5000) baseAltitude = 0;

    baseLat += (Math.random() - 0.5) * 0.00005;
    baseLon += (Math.random() - 0.5) * 0.00005;

    // [수정] Roll, Pitch, Yaw 값을 10씩 증가시킵니다.
    currentRoll += 10;
    currentPitch += 10;
    currentYaw += 10;

    // [수정] 각도가 일반적인 범위를 벗어나지 않도록 처리합니다.
    if (currentRoll >= 360) currentRoll = -180; // -180 ~ 180 범위
    if (currentPitch > 90) currentPitch = -90;  // -90 ~ 90 범위
    if (currentYaw >= 360) currentYaw = 0;      // 0 ~ 360 범위

    const data = {
        roll: currentRoll.toFixed(2),
        pitch: currentPitch.toFixed(2),
        yaw: currentYaw.toFixed(2),
        p_alt: (baseAltitude + (Math.random() - 0.5) * 10).toFixed(2),
        alt: baseAltitude.toFixed(2),
        ax: (Math.random() * 2).toFixed(3),
        ay: (Math.random() * 2).toFixed(3),
        az: (Math.random() * 20 + 5).toFixed(3),
        lat: baseLat,
        lon: baseLon,
        temp: (Math.random() * 15 + 15).toFixed(2),
        pressure: (1013 - baseAltitude / 8.3).toFixed(2),
        ejection: baseAltitude > 4000 ? 'EJECTED' : 'SAFE'
    };
    return data;
}


/**
 * 0.2초마다 랜덤 데이터를 생성하여 모든 웹 클라이언트에 전송합니다.
 * @param {Server} io - Socket.IO 서버 인스턴스
 */
function startRandomDataEmitter(io) {
    console.log('✅ [수정] 0.2초 간격으로 자세 데이터 전송을 시작합니다.');
    
    // [수정] 간격을 1000ms -> 200ms로 변경합니다.
    setInterval(() => {
        const fakeData = generateRandomData();
        io.emit('rocketData', fakeData);
        // console.log(`🛰️  Emitting fake data (Roll: ${fakeData.roll}, Pitch: ${fakeData.pitch}, Yaw: ${fakeData.yaw})`);
    }, 200); // 200ms = 0.2초
}


// [실행] 테스트를 위해 랜덤 데이터 전송 시작
// 실제 운영 시에는 아래 한 줄을 주석 처리하세요.
startRandomDataEmitter(io);
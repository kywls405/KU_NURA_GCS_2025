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
// ▼▼▼ [수정] 랜덤 데이터 생성 시뮬레이터 (실제와 유사한 전송 간격) ▼▼▼
// =======================================================================
// 실제 Python 클라이언트와 연동할 때는 아래 startRandomDataEmitter() 호출부를 주석 처리하세요.

// --- 시뮬레이터 상태를 저장할 단일 객체 ---
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

// ▼▼▼ 이 객체가 누락되어 있었습니다. 여기에 추가합니다. ▼▼▼
const simulatorDirection = {
    roll: 1,  // 1은 증가, -1은 감소
    pitch: 1,
    yaw: 1
};

let flightStartTime; // 초기화 시점을 제어하기 위해 선언만 함

/**
 * 0.02초마다 자세 데이터(Roll, Pitch, Yaw)를 업데이트하고 전체 데이터를 전송합니다.
 */
function startFastEmitter(io) {
    setInterval(() => {
        // 1. 저장된 방향에 따라 값을 증감시킵니다.
        telemetryState.roll += simulatorDirection.roll;
        telemetryState.pitch += simulatorDirection.pitch;
        telemetryState.yaw += simulatorDirection.yaw;

        // 2. 경계에 닿으면 방향을 뒤집습니다. (곱하기 -1)
        if (telemetryState.roll >= 180 || telemetryState.roll <= -180) {
            simulatorDirection.roll *= -1;
        }
        if (telemetryState.pitch >= 90 || telemetryState.pitch <= -90) {
            simulatorDirection.pitch *= -1;
        }
        if (telemetryState.yaw >= 360 || telemetryState.yaw <= 0) {
            simulatorDirection.yaw *= -1;
        }

        // 비행 시간을 '초' 단위로 계산
        // (flightStartTime이 설정된 후에만 유효)
        if (flightStartTime) {
            telemetryState.timestamp = (Date.now() - flightStartTime) / 1000;
        }

        const dataToSend = {
            ...telemetryState,
            roll: telemetryState.roll.toFixed(2),
            pitch: telemetryState.pitch.toFixed(2),
            yaw: telemetryState.yaw.toFixed(2),
            P_alt: telemetryState.P_alt.toFixed(2),
            Alt: telemetryState.Alt.toFixed(2),
            ax: telemetryState.ax.toFixed(2),
            ay: telemetryState.ay.toFixed(2),
            az: telemetryState.az.toFixed(2),
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
 * [수정] 불규칙한 간격으로 나머지 데이터를 업데이트합니다.
 */
function startSlowUpdater() {
    const update = () => {
        // 고도 업데이트
        let baseAltitude = telemetryState.Alt + Math.random() * 10;
        if (baseAltitude > 400) baseAltitude = 0;
        telemetryState.Alt = baseAltitude + 80;
        telemetryState.P_alt = (baseAltitude + (Math.random() - 0.5) * 10);

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

        // ▼▼▼ [수정된 부분] 사출 상태 업데이트 ▼▼▼
        // 1. 각도 계산 (pitch와 yaw로부터 라디안 값을 구하고 도로 변환)
        const angleInRadians = Math.atan2(telemetryState.pitch, telemetryState.yaw);
        const angleInDegrees = Math.abs(angleInRadians * (180 / Math.PI));

        // 2. 사출 상태 결정 (나중에 오는 조건이 우선 적용됨)
        let ejectionStatus = 0; // 기본 상태: SAFE (0)

        if (telemetryState.Alt > 400) {
            ejectionStatus = 2; // 고도가 400을 넘으면: ALTITUDE EJECT (2)
        }
        if (angleInDegrees > 70) {
            ejectionStatus = 1; // 기울기 각도가 70도를 넘으면: ATTITUDE EJECT (1)
        }
        if (telemetryState.timestamp > 60) {
            ejectionStatus = 3; // 비행 시간이 20초를 넘으면: TIMER EJECT (3)
        }
        telemetryState.ejection = ejectionStatus;
        // ▲▲▲ 여기까지 수정 ▲▲▲

        // 다음 업데이트를 200ms ~ 600ms 사이의 무작위 시간 후에 예약합니다.
        const randomDelay = 600 + Math.random() * 200;
        setTimeout(update, randomDelay);
    };
    
    update(); // 첫 업데이트를 즉시 시작
}

/**
 * [수정된 함수] 데이터 전송 시뮬레이터를 10초 후에 시작하는 메인 함수
 */
function startRandomDataEmitter(io) {
    console.log('✅ 데이터 전송 시뮬레이터를 10초 후에 시작합니다.');

    // 10초(10000ms) 후에 내부 로직을 실행
    setTimeout(() => {
        console.log('✅ [수정] 실제와 유사한 데이터 전송 시뮬레이터를 시작합니다.');
        
        // 10초가 지난 현재 시점을 비행 시작 시간으로 설정
        flightStartTime = Date.now();
        
        startFastEmitter(io); // 빠른 전송기 시작
        startSlowUpdater();   // 느린 업데이트 시작
    }, 10000); 
}

// [실행] 테스트를 위해 랜덤 데이터 전송 시작
startRandomDataEmitter(io);
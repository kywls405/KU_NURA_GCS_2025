// backend/server.js

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import net from 'net';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const isSimulateMode = true; // (true 시뮬레이터, false 실제 하드웨어 연결)

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

let pythonProcess = null;

let startSimulator = (io) => { console.error("Simulator is not initialized."); };
let stopSimulator = () => { console.error("Simulator is not initialized."); };

if (isSimulateMode) {
  let telemetryState = {};
  const initialTelemetryState = {
    flight_timestamp: 0, connect_timestamp: 0,
    roll: 0, pitch: 0, yaw: 0,
    P_alt: 0, Alt: 0,
    ax: 0, ay: 0, az: 0,
    lat: 34.609169, lon: 127.205438,
    vel_n: 0, vel_e: 0, vel_d: 0,
    temp: 25, pressure: 1013.25,
    ejection: 0, launch: 0
  };
  telemetryState = { ...initialTelemetryState };

  const simulatorDirection = { roll: 1, pitch: 1, yaw: 1 };
  
  let flightStartTime = null;
  let connectStartTime = null;
  
  let fastEmitterInterval = null;
  let slowUpdaterTimeout = null;
  let launchDetectTimeout = null;

  // [개선] 자세 시뮬레이션 및 사출 조건 확인 로직
  function updateAttitudeAndCheckEjection() {
    if (!flightStartTime) { // 발사 전에는 안정적으로 유지
        telemetryState.roll *= 0.95;
        telemetryState.pitch *= 0.95;
        return;
    }
    
    // 자연스러운 흔들림 추가
    telemetryState.roll += (Math.random() - 0.5) * 0.5;
    telemetryState.pitch += (Math.random() - 0.5) * 0.5;
    telemetryState.yaw = (telemetryState.yaw + simulatorDirection.yaw * 0.1 + 360) % 360;

    // 낮은 확률로 큰 충격 발생
    if (Math.random() < 0.002) {
        console.log('💥 SIMULATING: High G-Force Event!');
        telemetryState.roll += (Math.random() - 0.5) * 200;
        telemetryState.pitch += (Math.random() - 0.5) * 200;
    }

    // 자세 안정화 경향
    telemetryState.roll *= 0.99;
    telemetryState.pitch *= 0.99;

    // 기울기 계산
    const tiltAngle = Math.sqrt(telemetryState.roll**2 + telemetryState.pitch**2);

    // 사출 조건 1: 기울기 70도 초과
    if (tiltAngle > 70 && telemetryState.ejection === 0) {
        console.log(`🚀 EJECTION TRIGGER (Attitude): Tilt ${tiltAngle.toFixed(2)}°`);
        telemetryState.ejection = 1;
    }
  }

  function startFastEmitter(io) {
    fastEmitterInterval = setInterval(() => {
      // [개선] 자세 계산 로직을 별도 함수로 분리
      updateAttitudeAndCheckEjection();

      if (connectStartTime) {
        telemetryState.connect_timestamp = (Date.now() - connectStartTime) / 1000;
      }
      if (flightStartTime) {
        telemetryState.flight_timestamp = (Date.now() - flightStartTime) / 1000;
      }

      io.emit('rocketData', { ...telemetryState });
    }, 20);
  }

  function startSlowUpdater() {
    const update = () => {
      // 사출이 발생하면 더 이상 상승하지 않음
      if (telemetryState.ejection > 0) {
        // 사출 후 하강 로직
        telemetryState.vel_d = 20 + Math.random() * 5;
        telemetryState.Alt -= telemetryState.vel_d;
      } else {
        // 정상 상승 로직
        telemetryState.Alt += (Math.random() * 5 + 5);
      }
      
      let baseAltitude = telemetryState.Alt;

      // 사출 조건 2: 고도 400m 초과
      if (baseAltitude > 400 && telemetryState.ejection === 0) {
          console.log(`🚀 EJECTION TRIGGER (Altitude): ${baseAltitude.toFixed(2)}m`);
          telemetryState.ejection = 2;
      }

      // 사출 조건 3: 비행 시간 60초 초과
      if (telemetryState.flight_timestamp > 60 && telemetryState.ejection === 0) {
          console.log(`🚀 EJECTION TRIGGER (Time): ${telemetryState.flight_timestamp.toFixed(2)}s`);
          telemetryState.ejection = 3;
      }
      
      if (flightStartTime && baseAltitude <= 0) {
          console.log('🛬 Flight simulation finished (Landed).');
          io.emit('serial-status-update', { status: 'success', message: '비행 종료 (착륙)' });
          stopSimulator();
          return;
      }

      telemetryState.P_alt = baseAltitude + (Math.random() - 0.5) * 2;
      telemetryState.lat += (Math.random() - 0.5) * 0.00005;
      telemetryState.lon += (Math.random() - 0.5) * 0.00005;
      telemetryState.ax = Math.random() * 2;
      telemetryState.ay = Math.random() * 2;
      telemetryState.az = telemetryState.ejection > 0 ? Math.random() * 2 : Math.random() * 20 + 5;
      telemetryState.vel_n = Math.random() * 5 - 2.5;
      telemetryState.vel_e = Math.random() * 5 - 2.5;
      telemetryState.vel_d = telemetryState.ejection > 0 ? telemetryState.vel_d : -Math.random() * 20;
      telemetryState.temp = 25 - baseAltitude / 150;
      telemetryState.pressure = 1013.25 - baseAltitude / 8.3;
      slowUpdaterTimeout = setTimeout(update, 600 + Math.random() * 200);
    };
    update();
  }
  
  startSimulator = function(io) {
    console.log('✅ Connection successful. Simulation will start randomly between 5-10 seconds.');
    io.emit('serial-status-update', { status: 'success', message: '연결 성공. 5~10초 후 랜덤으로 비행 시작' });
    
    connectStartTime = Date.now();
    startFastEmitter(io);
    
    const randomLaunchDelay = Math.random() * 5000 + 5000;
    console.log(`🚀 Launching in ${(randomLaunchDelay / 1000).toFixed(2)} seconds...`);

    launchDetectTimeout = setTimeout(() => {
      console.log('🚀 Launch detected!');
      io.emit('serial-status-update', { status: 'success', message: '발사 감지됨' });
      telemetryState.launch = 1;
      flightStartTime = Date.now();
      startSlowUpdater();
    }, randomLaunchDelay);
  }

  stopSimulator = function() {
    if (launchDetectTimeout) clearTimeout(launchDetectTimeout);
    if (fastEmitterInterval) clearInterval(fastEmitterInterval);
    if (slowUpdaterTimeout) clearTimeout(slowUpdaterTimeout);
    
    launchDetectTimeout = null;
    fastEmitterInterval = null;
    slowUpdaterTimeout = null;
    flightStartTime = null;
    connectStartTime = null;

    telemetryState = { ...initialTelemetryState };

    io.emit('serial-status-update', { status: 'error', message: '시뮬레이션이 중지/초기화되었습니다.' });
    console.log('✅ Simulation stopped and states reset.');
  }
}

// --- Socket.IO 연결 관리 ---
io.on('connection', socket => {
  console.log('🌐 Web client connected');
  
  socket.on('connect-serial', (config) => {
    if (isSimulateMode) {
      stopSimulator();
      startSimulator(io);
      return;
    }

    if (pythonProcess) {
      pythonProcess.kill();
    }
    console.log(`🚀 Spawning python_bridge with config:`, config);
    pythonProcess = spawn('python', ['-u', '../python_bridge/decoder_main.py', '--port', config.port, '--baud', config.baud, '--host', '127.0.0.1', '--tcp_port', '9000']);
    pythonProcess.stdout.on('data', (data) => console.log(`[Python STDOUT]: ${data}`));
    pythonProcess.stderr.on('data', (data) => console.error(`[Python STDERR]: ${data}`));
    pythonProcess.on('close', (code) => {
      console.log(`Python process exited with code ${code}`);
      io.emit('serial-status-update', { status: 'error', message: '파이썬 브릿지 연결이 종료되었습니다.' });
      pythonProcess = null;
    });
  });

  socket.on('disconnect-serial', () => {
    console.log('🔪 Received disconnect-serial command.');
    if (isSimulateMode) {
      stopSimulator();
      return;
    }
    
    if (pythonProcess) {
      console.log('🔪 Killing python process.');
      pythonProcess.kill();
      pythonProcess = null;
    }
  });

  socket.on('request-serial-ports', () => {
    if (isSimulateMode) {
      const fakePorts = [{ device: 'SIMULATOR', description: 'GCS Internal Simulator' }];
      socket.emit('serial-ports-list', fakePorts);
      return;
    }
    const portLister = spawn('python', ['../python_bridge/list_ports.py']);
    let portData = '';
    portLister.stdout.on('data', (data) => { portData += data.toString(); });
    portLister.stderr.on('data', (data) => { console.error(`[PortLister STDERR]: ${data}`); });
    portLister.on('close', (code) => {
      if (code === 0) {
        try {
          const ports = JSON.parse(portData);
          socket.emit('serial-ports-list', ports);
        } catch (e) {
          console.error('Error parsing port list JSON:', e);
        }
      }
    });
  });

  socket.on('disconnect', () => {
    console.log('🔌 Web client disconnected');
    if (isSimulateMode) {
        stopSimulator();
    }
    if (pythonProcess) {
        pythonProcess.kill();
        pythonProcess = null;
    }
  });
});

// --- Python 브릿지로부터 데이터를 수신하는 TCP 서버 ---
const tcpServer = net.createServer(clientSocket => {
    console.log('🟢 Python bridge connected to TCP server');
    
    let buffer = '';
    clientSocket.on('data', data => {
        buffer += data.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
            if (line) {
                try {
                    const packet = JSON.parse(line);
                    if (packet.type === 'telemetry') {
                        io.emit('rocketData', packet.payload);
                    } else if (packet.type === 'status') {
                        io.emit('serial-status-update', packet);
                    }
                } catch (err) {
                    console.error('❌ JSON parse error:', err.message, 'Raw:', line);
                }
            }
        }
    });

    clientSocket.on('close', () => console.log('🔌 Python TCP connection closed'));
    clientSocket.on('error', err => console.error('⚠️ TCP socket error:', err.message));
});

tcpServer.listen(9000, '127.0.0.1', () => {
    console.log(`🚀 TCP server listening on port 9000 for Python bridge.`);
});


const WEB_PORT = 3000;
server.listen(WEB_PORT, () => {
  console.log(`🌍 GCS Dashboard available at http://localhost:${WEB_PORT}`);
});

// backend/server.js

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import net from 'net';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const isSimulateMode = false; // (true 시뮬레이터, false 실제 하드웨어 연결)

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
  
  // [추가] 새로운 고도 사출 로직을 위한 변수
  let altitudeBuffer = [];
  let max_avg_alt = 0;

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

    const tiltAngle = Math.sqrt(telemetryState.roll**2 + telemetryState.pitch**2);

    // 사출 조건 1: 기울기 70도 초과 (변경 없음)
    if (tiltAngle > 70 && telemetryState.ejection === 0) {
        const message = `사출 명령 (자세): 기울기 ${tiltAngle.toFixed(2)}°`;
        console.log(`🚀 ${message}`);
        io.emit('serial-status-update', { status: 'error', message: message });
        telemetryState.ejection = 1;
    }
  }

  function startFastEmitter(io) {
    fastEmitterInterval = setInterval(() => {
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
      if (telemetryState.ejection > 0) {
        telemetryState.vel_d = 20 + Math.random() * 5;
        telemetryState.Alt -= telemetryState.vel_d;
      } else {
        telemetryState.Alt += (Math.random() * 5 + 5);
      }
      
      let baseAltitude = telemetryState.Alt;

      // --- [개선] 새로운 고도 사출 로직 ---
      altitudeBuffer.push(baseAltitude);
      if(altitudeBuffer.length > 50) {
          altitudeBuffer.shift();
      }
      
      if (altitudeBuffer.length === 50 && telemetryState.ejection === 0) {
          const avg_alt = altitudeBuffer.reduce((a, b) => a + b, 0) / 50;
          if (avg_alt > max_avg_alt) {
              max_avg_alt = avg_alt;
          }

          if (max_avg_alt - avg_alt > 3) {
              const message = `사출 명령 (고도): 최고 평균 ${max_avg_alt.toFixed(2)}m 대비 3m 이상 하강 감지`;
              console.log(`🚀 ${message}`);
              io.emit('serial-status-update', { status: 'error', message: message });
              telemetryState.ejection = 2;
          }
      }
      // --- 로직 끝 ---

      // 사출 조건 3: 비행 시간 9초 초과 (변경 없음)
      if (telemetryState.flight_timestamp >= 9 && telemetryState.ejection === 0) {
          const message = `사출 명령 (시간): ${telemetryState.flight_timestamp.toFixed(2)}초`;
          console.log(`🚀 ${message}`);
          io.emit('serial-status-update', { status: 'error', message: message });
          telemetryState.ejection = 3;
      }
      
      if (flightStartTime && baseAltitude <= 0) {
          console.log('🛬 Flight simulation finished (Landed).');
          io.emit('serial-status-update', { status: 'success', message: '착륙. 비행이 종료되었습니다.' });
          if (slowUpdaterTimeout) clearTimeout(slowUpdaterTimeout);
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
    io.emit('serial-status-update', { status: 'success', message: '연결 성공. 5~10초 후 비행이 시작됩니다.' });
    
    connectStartTime = Date.now();
    startFastEmitter(io);
    
    const randomLaunchDelay = Math.random() * 5000 + 5000;
    io.emit('serial-status-update', { status: 'info', message: `발사 시퀀스 시작. T-${(randomLaunchDelay / 1000).toFixed(2)}초` });

    launchDetectTimeout = setTimeout(() => {
      io.emit('serial-status-update', { status: 'success', message: '발사 감지! 비행 타이머를 시작합니다.' });
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
    altitudeBuffer = [];
    max_avg_alt = 0;

    telemetryState = { ...initialTelemetryState };

    io.emit('serial-status-update', { status: 'error', message: '시뮬레이션이 중지 및 초기화되었습니다.' });
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
      const fakePorts = [{ device: 'SIMULATOR', description: 'GCS 내부 시뮬레이터' }];
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

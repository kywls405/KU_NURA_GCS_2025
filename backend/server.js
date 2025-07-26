import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import net from 'net';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import fs from 'fs';
import csv from 'csv-parser';

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

let csvReplayTimeout = null; 
const CSV_FILE_PATH = path.join(__dirname, 'output_014.csv');

const startCsvReplay = (io) => {
  if (!fs.existsSync(CSV_FILE_PATH)) {
    const errorMessage = `오류: CSV 파일을 찾을 수 없습니다. (${CSV_FILE_PATH})`;
    console.error(`❌ ${errorMessage}`);
    io.emit('serial-status-update', { status: 'error', message: errorMessage });
    return;
  }

  const logData = [];
  fs.createReadStream(CSV_FILE_PATH)
    .pipe(csv({ skipLines: 4 }))
    .on('data', (row) => logData.push(row))
    .on('end', () => {
      console.log('✅ CSV file successfully processed.');

      // [수정] 컬럼명의 대소문자를 CSV 파일과 일치시킴 (row.Launch)
      const launchIndex = logData.findIndex(row => parseInt(row.Launch, 10) === 1);

      if (launchIndex === -1) {
        const errorMessage = `오류: 로그 파일에서 발사(Launch=1) 지점을 찾을 수 없습니다.`;
        console.error(`❌ ${errorMessage}`);
        io.emit('serial-status-update', { status: 'error', message: errorMessage });
        return;
      }
      
      console.log(`🚀 Launch event found at index ${launchIndex}. Starting replay...`);
      io.emit('serial-status-update', { status: 'success', message: `로그 파일에서 발사 감지! 재생을 시작합니다.` });

      let currentIndex = launchIndex;

      const replayStep = () => {
        if (currentIndex >= logData.length) {
          console.log('🏁 CSV replay finished.');
          io.emit('serial-status-update', { status: 'success', message: '로그 파일 재생이 완료되었습니다.' });
          return;
        }

        const currentRow = logData[currentIndex];
        
        // [수정] packet의 모든 키를 CSV 파일의 대소문자에 맞게 수정
        const packet = {
          roll: parseFloat(currentRow.Roll) || 0,
          pitch: parseFloat(currentRow.Pitch) || 0,
          yaw: parseFloat(currentRow.Yaw) || 0,
          Alt: parseFloat(currentRow.Alt) || 0,
          ax: parseFloat(currentRow.ax) || 0,
          ay: parseFloat(currentRow.ay) || 0,
          az: parseFloat(currentRow.az) || 0,
          lat: parseFloat(currentRow.Lat) || 0,
          lon: parseFloat(currentRow.Lon) || 0,
          ejection: parseInt(currentRow.Chute, 10) || 0, // 'ejection'에 해당하는 'Chute' 컬럼 사용
          launch: parseInt(currentRow.Launch, 10) || 0,
          flight_timestamp: (parseInt(currentRow.TimeStamp, 10) - parseInt(logData[launchIndex].TimeStamp, 10)) / 1000,
          
          P_alt: parseFloat(currentRow.P_alt) || 0,
          vel_n: parseFloat(currentRow.VN) || 0,
          vel_e: parseFloat(currentRow.VE) || 0,
          vel_d: parseFloat(currentRow.VD) || 0,
          temp: parseFloat(currentRow.T) || 0,
          pressure: parseFloat(currentRow.P) || 0,
          connect_timestamp: 0 
        };

        io.emit('rocketData', packet);

        const nextRow = logData[currentIndex + 1];
        if (nextRow) {
          const currentTimestamp = parseInt(currentRow.TimeStamp, 10);
          const nextTimestamp = parseInt(nextRow.TimeStamp, 10);
          const delay = nextTimestamp - currentTimestamp;

          currentIndex++;
          if (delay > 0) {
            csvReplayTimeout = setTimeout(replayStep, delay);
          } else {
            replayStep();
          }
        } else {
          currentIndex++;
          replayStep();
        }
      };

      replayStep();
    });
};

const stopCsvReplay = () => {
  if (csvReplayTimeout) {
    clearTimeout(csvReplayTimeout);
    csvReplayTimeout = null;
    io.emit('serial-status-update', { status: 'system', message: 'CSV 재생이 중지되었습니다.' });
    console.log('⏹️ CSV replay stopped.');
  }
};


// --- 기존 시뮬레이터 및 소켓/TCP 서버 코드 (변경 없음) ---
// ... (이하 코드는 이전 답변과 동일합니다) ...
let startSimulator = (io) => { console.error("Simulator is not initialized."); };
let stopSimulator = () => { console.error("Simulator is not initialized."); };

if (true) {
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
  
  let altitudeBuffer = [];
  let max_avg_alt = 0;

  function updateAttitudeAndCheckEjection() {
    if (!flightStartTime) {
        telemetryState.roll *= 0.95;
        telemetryState.pitch *= 0.95;
        return;
    }
    
    telemetryState.roll += (Math.random() - 0.5) * 0.5;
    telemetryState.pitch += (Math.random() - 0.5) * 0.5;
    telemetryState.yaw = (telemetryState.yaw + simulatorDirection.yaw * 0.1 + 360) % 360;

    if (Math.random() < 0.002) {
        console.log('💥 SIMULATING: High G-Force Event!');
        telemetryState.roll += (Math.random() - 0.5) * 200;
        telemetryState.pitch += (Math.random() - 0.5) * 200;
    }

    telemetryState.roll *= 0.99;
    telemetryState.pitch *= 0.99;

    const tiltAngle = Math.sqrt(telemetryState.roll**2 + telemetryState.pitch**2);

    if (tiltAngle > 70 && telemetryState.ejection === 0) {
        const message = `사출 명령 (자세): 기울기 ${tiltAngle.toFixed(2)}°`;
        console.log(`🚀 ${message}`);
        io.emit('serial-status-update', { status: 'success', message: message });
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
        telemetryState.Alt += (Math.random() * 5 + 25);
      }

      if (telemetryState.Alt > 350) {
        telemetryState.Alt -= (Math.random() * 5 + 5);
      }
      
      let baseAltitude = telemetryState.Alt;

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
              io.emit('serial-status-update', { status: 'success', message: message });
              telemetryState.ejection = 2;
          }
      }

      if (telemetryState.flight_timestamp >= 9 && telemetryState.ejection === 0) {
          const message = `사출 명령 (시간): ${telemetryState.flight_timestamp.toFixed(2)}초`;
          console.log(`🚀 ${message}`);
          io.emit('serial-status-update', { status: 'success', message: message });
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

    io.emit('serial-status-update', { status: 'system', message: '시뮬레이션이 중지 및 초기화되었습니다.' });
    console.log('✅ Simulation stopped and states reset.');
  }
}

io.on('connection', socket => {
  console.log('🌐 Web client connected');
  
  socket.on('connect-serial', (config) => {
    stopSimulator();
    stopCsvReplay();
    if (pythonProcess) {
      pythonProcess.kill();
      pythonProcess = null;
    }

    if (config.port === 'SIMULATOR') {
      console.log('🚀 Starting Simulator Mode...');
      startSimulator(io);
      return;
    }

    if (config.port === 'CSV_REPLAY') {
      console.log('🎬 Starting CSV Replay Mode...');
      startCsvReplay(io);
      return;
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
    stopSimulator();
    stopCsvReplay();
    
    if (pythonProcess) {
      console.log('🔪 Killing python process.');
      pythonProcess.kill();
      pythonProcess = null;
    }
  });

  socket.on('request-serial-ports', () => {
    const portLister = spawn('python', ['../python_bridge/list_ports.py']);
    let portData = '';
    portLister.stdout.on('data', (data) => { portData += data.toString(); });
    portLister.stderr.on('data', (data) => { console.error(`[PortLister STDERR]: ${data}`); });
    portLister.on('close', (code) => {
      let ports = [];
      if (code === 0) {
        try {
          ports = JSON.parse(portData);
        } catch (e) {
          console.error('Error parsing port list JSON:', e);
        }
      }
      
      ports.push({ device: 'SIMULATOR', description: 'GCS 내부 시뮬레이터' });
      ports.push({ device: 'CSV_REPLAY', description: 'CSV 로그 파일 재생' });
      socket.emit('serial-ports-list', ports);
    });
  });

  socket.on('disconnect', () => {
    console.log('🔌 Web client disconnected');
    stopSimulator();
    stopCsvReplay();
    if (pythonProcess) {
        pythonProcess.kill();
        pythonProcess = null;
    }
  });
});

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
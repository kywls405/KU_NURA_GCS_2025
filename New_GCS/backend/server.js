import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
// 👉 1. __dirname을 위해 추가
import { fileURLToPath } from 'url';

// 👉 2. __dirname 정의
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app); // socket.io를 위한 서버
const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(cors());

// 정적 파일 제공
app.use('/assets', express.static(path.join(__dirname, '../assets')));
app.use(express.static(path.join(__dirname, '../frontend')));

io.on('connection', socket => {
  console.log('✅ New client connected');

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected');
  });
});

// 테스트용 가짜 데이터 전송
setInterval(() => {
  const packet = {
    roll: (Math.random() * 10).toFixed(2),
    pitch: (Math.random() * 10).toFixed(2),
    yaw: (Math.random() * 10).toFixed(2),
    p_alt: (Math.random() * 300).toFixed(2),
    alt: (Math.random() * 300).toFixed(2),
    ax: (Math.random() * 4 - 2).toFixed(2),
    ay: (Math.random() * 4 - 2).toFixed(2),
    az: (Math.random() * 10).toFixed(2),
    lat: 37.5665 + Math.random() * 0.001,
    lon: 126.9780 + Math.random() * 0.001,
    temp: (20 + Math.random() * 5).toFixed(1),
    pressure: (1000 + Math.random() * 10).toFixed(1),
    ejection: Math.random() > 0.9 ? 1 : 0
  };
  io.emit('rocketData', packet);
}, 1000);

// 👉 3. app.listen() 대신 server.listen() 사용
server.listen(3000, () => {
  console.log('🚀 Server running at http://localhost:3000');
});
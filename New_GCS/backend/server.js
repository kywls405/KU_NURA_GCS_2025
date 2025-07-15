const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(cors());
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

server.listen(3000, () => {
  console.log('🚀 Server running at http://localhost:3000');
});

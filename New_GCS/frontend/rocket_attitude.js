// rocket_attitude.js

const rocketImage = new Image();
let imageLoaded = false;
let canvas, ctx;

const deg2rad = d => d * Math.PI / 180;
const rad2deg = r => r * 180 / Math.PI;

/**
 * 캔버스 초기화
 */
export function initRocketAttitude() {
  canvas = document.getElementById('rocket-icon');
  if (!canvas) {
    console.error('Rocket attitude canvas not found!');
    return;
  }
  ctx = canvas.getContext('2d');

  rocketImage.onload = () => {
    imageLoaded = true;
    drawRocket(0); // 초기 회전 0°
  };
  rocketImage.src = 'assets/Rocket.png';
}

/**
 * pitch, roll → 방향성 있는 회전각도 계산 및 이미지 회전에 반영
 */
export function updateRocketAttitude(pitch, roll) {
  // roll = 45; pitch = 69; // 테스트용 고정값
  if (!imageLoaded || !ctx) return;

  // ⬛ 1. 회전 방향 계산 (캔버스 기준 반전)
  const visualRotationRad = Math.sqrt(Math.pow(roll, 2) + Math.pow(pitch, 2)) * Math.PI / 180;
  drawRocket(visualRotationRad);

//   // ⬛ 2. 기울기 각도 계산 (0~180° 정확히 반영)
//   const pitchRad = pitch * Math.PI / 180;
//   const rollRad = roll * Math.PI / 180;

//   // 방향벡터 계산 (단위 벡터라고 가정)
//   const vx = Math.cos(pitchRad) * Math.cos(rollRad);
//   const vy = Math.sin(rollRad);
//   const vz = Math.sin(pitchRad) * Math.cos(rollRad);

  // z축 (0, 0, 1)과의 각도 = acos(vz)
  const deviationMagnitudeDeg = visualRotationRad * 180 / Math.PI;

  const angleDisplayElement = document.getElementById('angle-display');
  if (angleDisplayElement) {
    angleDisplayElement.textContent = `${deviationMagnitudeDeg.toFixed(1)}°`;
  }
}

/**
 * 지정된 각도(angleRad)만큼 회전하여 로켓 이미지 그리기
 */
function drawRocket(angleRad) {
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(angleRad);

  const scale = 1 / 11;
  const w = rocketImage.width * scale;
  const h = rocketImage.height * scale;
  ctx.drawImage(rocketImage, -w / 2, -h / 2, w, h);
  ctx.restore();
}

// rocket_attitude.js

const rocketImage = new Image();
let imageLoaded = false;
let canvas, ctx;

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
    drawRocket(0);  // 초기 yaw = 0
  };
  rocketImage.src = 'assets/Rocket.png';
}

/**
 * 유효범위 보장
 */
function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/**
 * pitch, yaw → 2D 평면상 회전량(0~180°) 계산 + yaw는 회전에만 사용
 */
export function updateRocketAttitude(pitch, yaw) {
  if (!imageLoaded || !ctx) return;

  // 1) 라디안 변환
  const pitchRad = pitch * Math.PI / 180;
  const yawRad   = yaw   * Math.PI / 180;

  // 2) 방향벡터 XY 투영
  const dirX = Math.cos(pitchRad) * Math.sin(yawRad);
  const dirY = Math.cos(pitchRad) * Math.cos(yawRad);

  // 3) 단위벡터화
  const mag2 = Math.hypot(dirX, dirY);
  const v2X = mag2 > 0 ? dirX / mag2 : 0;
  const v2Y = mag2 > 0 ? dirY / mag2 : 1;

  // 4) 초기벡터(0,1)와의 내적 → cosφ
  const cosPhi = clamp(v2Y, -1, 1);

  // 5) θ 계산 → 0~180°
  const angleDeg = Math.acos(cosPhi) * 180 / Math.PI;

  // 6) 각도 표시
  const angleDisplayElement = document.getElementById('angle-display');
  if (angleDisplayElement) {
    angleDisplayElement.textContent = `${angleDeg.toFixed(1)}°`;
  }

  // 7) yaw 회전만 반영
  drawRocket(yawRad);
}

/**
 * yaw 회전에 따라 로켓 그리기
 */
function drawRocket(yawRad) {
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(yawRad); // yaw만 반영

  const scale = 1 / 11;
  const w = rocketImage.width * scale;
  const h = rocketImage.height * scale;
  ctx.drawImage(rocketImage, -w / 2, -h / 2, w, h);
  ctx.restore();
}

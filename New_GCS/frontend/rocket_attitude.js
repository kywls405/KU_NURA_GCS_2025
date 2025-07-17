// rocket_attitude.js

const rocketImage = new Image();
let imageLoaded = false;
let canvas, ctx;

/**
 * 로켓 자세계 초기화 함수
 */
export function initRocketAttitude() {
  canvas = document.getElementById('rocket-icon');
  if (!canvas) {
    console.error('Rocket attitude canvas not found!');
    return;
  }
  ctx = canvas.getContext('2d');

  // 이미지가 로드되면 초기에 한 번 그려줍니다.
  rocketImage.onload = () => {
    imageLoaded = true;
    const x = canvas.width / 2;
    const y = canvas.height / 2;
    const w = rocketImage.width / 11;
    const h = rocketImage.height / 11;
    ctx.drawImage(rocketImage, x - w / 2, y - h / 2, w, h);
  };
  rocketImage.src = 'assets/Rocket.png'; // 이미지 경로 설정
}

/**
 * 로켓 자세계 업데이트 함수
 * @param {number} pitch - 피치 값
 * @param {number} yaw - 요 값
 */
export function updateRocketAttitude(pitch, yaw) {
  if (!imageLoaded || !ctx) return;

  // ▼▼▼ 중요 ▼▼▼
  // 각도 값을 표시할 HTML 요소를 이 함수 안에서 찾습니다.
  // 이렇게 하면 함수가 호출되는 시점에는 DOM이 항상 준비되어 있습니다.
  const angleDisplayElement = document.getElementById('angle-display');
  // ▲▲▲ 중요 ▲▲▲

  // 캔버스를 깨끗하게 지웁니다.
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const angleInRadians = Math.atan2(pitch, yaw);

  // HTML 요소가 존재할 경우에만 값을 업데이트합니다.
  if (angleDisplayElement) {
    const angleInDegrees = angleInRadians * (180 / Math.PI);
    angleDisplayElement.textContent = angleInDegrees.toFixed(1);
  }

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(angleInRadians);
  
  const w = rocketImage.width / 11;
  const h = rocketImage.height / 11;

  ctx.drawImage(rocketImage, -w / 2, -h / 2, w, h);
  ctx.restore();
}
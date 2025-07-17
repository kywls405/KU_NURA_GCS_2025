// frontend/navball.js

let scene, camera, renderer, sphere;

/**
 * 3D Navball을 초기화하는 함수
 */
export function initNavball() {
  // Scene(가상 공간), Camera(시점), Renderer(출력) 설정
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
  renderer = new THREE.WebGLRenderer({ 
    canvas: document.querySelector('#navball-canvas'),
    antialias: true,
    alpha: true // 캔버스 배경을 투명하게 만들어 CSS 배경이 보이도록 함
  });
  renderer.setPixelRatio(window.devicePixelRatio); // 고해상도 디스플레이 지원
  renderer.setSize(440, 440);

  // =======================================================================
  // ▼▼▼ [수정] 그래픽 잘림 문제 해결 ▼▼▼
  // 원인: 구체의 크기(반지름 5)가 카메라 시야에 비해 너무 컸습니다.
  // 해결: 구체의 반지름을 4로 줄여 캔버스 안에 완전히 들어오도록 조정합니다.
  // =======================================================================
  const geometry = new THREE.SphereGeometry(4, 64, 64); // 반지름을 5 -> 4로 수정, 세밀도 증가

  const texture = new THREE.TextureLoader().load('assets/navball.png');
  texture.center.set(0.5, 0.5); // ★★★ 이 줄을 추가하세요! ★★★

  const material = new THREE.MeshBasicMaterial({ map: texture });
  
  sphere = new THREE.Mesh(geometry, material);
  scene.add(sphere);

  // 카메라 위치를 z축 방향으로 7만큼 이동시킵니다.
  // 만약 그래픽이 여전히 크다면 이 값을 8이나 9로 늘려보세요.
  camera.position.z = 7;

  // 회전 순서 설정 (Yaw -> Pitch -> Roll 순으로 적용되어야 자연스러움)
  sphere.rotation.order = 'YXZ'; 

  // 렌더링 루프 시작
  animate();
}

/**
 * Roll, Pitch, Yaw 값을 받아 Navball을 회전시키는 함수
 * @param {number} roll
 * @param {number} pitch
 * @param {number} yaw
 */
export function updateNavball(roll, pitch, yaw) {
  if (!sphere) return;

  // 각도(degree)를 라디안(radian)으로 변환
  // Three.js는 내부적으로 라디안 단위를 사용합니다.
  const rollRad = THREE.MathUtils.degToRad(roll);
  const pitchRad = THREE.MathUtils.degToRad(pitch);
  const yawRad = THREE.MathUtils.degToRad(yaw);

  // 변환된 값을 각 축의 회전에 적용
  // 회전 순서(YXZ)에 따라 x축(Pitch), y축(Yaw), z축(Roll)에 값을 할당합니다.
  sphere.rotation.x = pitchRad;
//   sphere.rotation.y = yawRad;
//   sphere.rotation.z = rollRad;
}

/**
 * 매 프레임마다 화면을 다시 그리는 렌더링 루프
 */
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

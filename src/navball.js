// import { createRoot } from "react-dom/client";
import { useState, useEffect, useRef } from "react";
import { Canvas, useLoader, useFrame } from "@react-three/fiber";
import { TextureLoader } from "three";

import "./navball.css";

/**
 * Navball을 html 위에 출력하는 함수,
 * 3D로 멋지게 출력함
 * @returns Navball 캔버스가 포함된 깔끔한 html 구문
 */
function Navball(props) {
  const [euler, eulerSet] = useState([0.0, 0.0, 0.0]);

  useEffect(() => {
    console.log(euler);
    if (Array.isArray(props.euler) && props.euler.length === 3) {
      eulerSet(props.euler);
    }
  }, [props.euler]);

  return (
    <div id="navball-container">
      <Canvas
        camera={{
          zoom: 3.55,
          top: 150,
          bottom: -150,
          left: 150,
          right: -150,
          near: 1,
          far: 1024,
          position: [0, 0, 200],
        }}
        orthographic={true} // 멋진 orthographic 카메라
        flat={true} // 아카데미 색공간 말고 그냥 색공간 씁시다
      >
        <NavMesh euler={euler} />
      </Canvas>
    </div>
  );
}

/**
 * navball을 출력하는 함수.
 * mesh가 canvas 안에 있으니까 오류가 떠서 이렇게 분리함.
 * @returns navball을 three.js로 랜더링한 그거
 */
function NavMesh(props) {
  const myMesh = useRef();
  const rollGroup = useRef();
  const pitchGroup = useRef();
  const yawGroup = useRef();
  const [euler, eulerSet] = useState([0.0, 0.0, 0.0]);

  const PI = 3.141592;
  const DEG2RAD = PI / 180.0;

  useEffect(() => {
    myMesh.current.rotation.y = (3.0 * 3.141592) / 2.0;
  }, []);

  useEffect(() => {
    eulerSet(props.euler);
    rollGroup.current.rotation.z = euler[0] * DEG2RAD; // roll
    pitchGroup.current.rotation.x = euler[1] * DEG2RAD; // pitch
    yawGroup.current.rotation.y = -euler[2] * DEG2RAD; // yaw
  }, [props.euler]);

  // 텍스쳐 로딩
  const navTexture = useLoader(TextureLoader, "navball.png");
  navTexture.anisotropy = 16;

  return (
    <group ref={rollGroup}>
      <group ref={pitchGroup}>
        <group ref={yawGroup}>
          <mesh ref={myMesh}>
            <sphereGeometry args={[40, 48, 32]} />
            <meshBasicMaterial map={navTexture} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

export default Navball;

import { useState, useEffect } from "react";

import "./navInfo.css";

function NavInfo(props) {
  const height = window.innerHeight > 700 ? window.innerHeight - 360 : 340;

  const [vel, velSet] = useState(0.0);
  const [h_vel, h_velSet] = useState(0.0);
  const [v_vel, v_velSet] = useState(0.0);

  const [accel, accelSet] = useState(0.0);
  const [h_accel, h_accelSet] = useState(0.0);
  const [v_accel, v_accelSet] = useState(0.0);

  const [alti, altiSet] = useState(0.0);
  const [ap, apSet] = useState(0.0);
  const [t_ap, t_apSet] = useState(0.0);

  const [ejection, ejectionSet] = useState("미사출");

  useEffect(() => {
    if (Array.isArray(props.imu) && props.imu.length > 0) {
      const lastidx = props.imu.length - 1;

      const g = 9.8;

      let h_a2 =
        Math.pow(g * props.imu[lastidx].acc[0], 2) + // x축
        Math.pow(g * props.imu[lastidx].acc[1], 2); // y축
      let h_a = Math.sqrt(h_a2);
      let v_a = g * props.imu[lastidx].acc[2]; // z축
      let a = Math.sqrt(h_a2 + Math.pow(v_a, 2));

      accelSet(a);
      h_accelSet(h_a);
      v_accelSet(v_a);

      if (props.imu[lastidx].ejection === 0) {
        ejectionSet("미사출");
      } else if (props.imu[lastidx].ejection === 1) {
        ejectionSet("자세");
      } else if (props.imu[lastidx].ejection === 2) {
        ejectionSet("고도");
      } else if (props.imu[lastidx].ejection === 3) {
        ejectionSet("타이머");
      } else {
        ejectionSet("에러");
      }
    }
  }, [props.imu]);

  useEffect(() => {
    if (Array.isArray(props.gps) && props.gps.length > 0) {
      const lastidx = props.gps.length - 1;

      let h2 =
        Math.pow(props.gps[lastidx].velN, 2) +
        Math.pow(props.gps[lastidx].velE, 2);
      let h_velocity = Math.sqrt(h2);
      let v_velocity = props.gps[lastidx].velD;
      let velocity = Math.sqrt(h2 + Math.pow(v_velocity, 2));

      velSet(velocity);
      h_velSet(h_velocity);
      v_velSet(v_velocity);

      let altitute = props.gps[lastidx].height;
      let apoapsis = altitute + Math.pow(v_velocity, 2) / 19.6;
      let timeToApoapsis = v_velocity / 9.8;

      altiSet(altitute);
      apSet(apoapsis);
      t_apSet(timeToApoapsis);
    }
  }, [props.gps]);

  return (
    <div className="info-container" style={{ height: height }}>
      <h3 style={{ paddingTop: "10px" }}>정보</h3>
      <table
        style={{
          margin: "auto",
          borderCollapse: "collapse",
          width: "200px",
          fontSize: "13px",
        }}
      >
        <tbody>
          <tr>
            <th>속력</th>
            <td>{vel.toFixed(2)} m/s</td>
          </tr>
          <tr style={{ border: "none" }}>
            <th>수평속도</th>
            <td>{h_vel.toFixed(2)} m/s</td>
          </tr>
          <tr>
            <th>수직속도</th>
            <td>{v_vel.toFixed(2)} m/s</td>
          </tr>
          <tr>
            <th>가속도</th>
            <td>
              {accel.toFixed(2)} m/s<sup>2</sup>
            </td>
          </tr>
          <tr style={{ border: "none" }}>
            <th>수평가속도</th>
            <td>
              {h_accel.toFixed(2)} m/s<sup>2</sup>
            </td>
          </tr>
          <tr>
            <th>수직가속도</th>
            <td>
              {v_accel.toFixed(2)} m/s<sup>2</sup>
            </td>
          </tr>
          <tr>
            <th>고도</th>
            <td>{alti.toFixed(1)} m</td>
          </tr>
          <tr>
            <th>최고점</th>
            <td>{ap.toFixed(1)} m</td>
          </tr>
          <tr>
            <th>도달 시간</th>
            <td>{t_ap.toFixed(1)} s</td>
          </tr>
          <tr>
            <th>사출</th>
            <td>{ejection}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default NavInfo;

import { useEffect, useState, useRef } from "react";

import { socket, serIsOn } from "./socket";

import Navball from "./navball";
import NavInfo from "./navInfo";
import Map from "./map3d";
import CFG from "./cfg_window";

import "./App.css";

function App() {
  const [imu, imuSet] = useState([]);
  const [gps, gpsSet] = useState([]);
  const [coord, coordSet] = useState([]);
  const [alt, altSet] = useState([]);
  const timeRef = useRef({ imu: -1, gps: -1 });

  const serialInputRef = useRef();
  const serialInputWidth =
    window.innerWidth > 660 ? window.innerWidth - 360 : 300;

  useEffect(() => {
    const set_imu = (data) => {
      if (Array.isArray(data.imu) && data.imu.length > 0) {
        imuSet((imu) => [...imu, ...data.imu]);
        timeRef.current.imu = data.time;
      }
    };
    const set_gps = (data) => {
      if (Array.isArray(data.gps) && data.gps.length > 0) {
        gpsSet([...gps, ...data.gps]);

        let coordList = [];
        let altList = [];
        data.gps.map((value) => {
          if (value.lon === 0.0 && value.lat === 0.0) {
            // do nothing
          } else {
            coordList.push([value.lon, value.lat]);
            altList.push(value.height);
          }
        });
        coordSet((coord) => [...coord, ...coordList]);
        altSet((alt) => [...alt, ...altList]);
        timeRef.current.gps = data.time;
      }
    };

    socket.on("here_are_your_imu", set_imu);
    socket.on("here_are_your_gps", set_gps);

    const serialAck = (data) => {
      console.log("시리얼을 통해 성공적으로 전송됨: %s", data);
    };

    socket.on("serialAck", serialAck);

    let imuInt = setInterval(() => {
      if (serIsOn) {
        socket.emit("give_me_imu", timeRef.current.imu);
      }
    }, 15);
    let gpsInt = setInterval(() => {
      if (serIsOn) {
        socket.emit("give_me_gps", timeRef.current.gps);
      }
    }, 30);

    return () => {
      socket.off("here_are_your_imu", set_imu);
      socket.off("here_are_your_gps", set_gps);

      clearInterval(imuInt);
      clearInterval(gpsInt);
    };
  }, []);

  return (
    <div className="App">
      <CFG />
      <div className="nav-info">
        <Navball euler={imu[imu.length - 1]?.euler} />
        <NavInfo imu={imu} gps={gps} />
      </div>
      <div className="map">
        <div
          className="serial-input"
          style={{
            height: "30px",
            marginBottom: "10px",
          }}
        >
          <input
            ref={serialInputRef}
            style={{
              width: "500px",
              height: "100%",
              float: "left",
            }}
            type="text"
            placeholder={"시리얼로 전송할 값 입력"}
          ></input>
          <button
            style={{
              width: "70px",
              height: "100%",
              float: "left",
            }}
            onClick={() => {
              if (serialInputRef.current.value) {
                socket.emit("serialInput", serialInputRef.current.value);
                console.log("값 '%s'가 전송됨", serialInputRef.current.value);
              } else {
                console.log("input에 값이 없음");
              }
            }}
          >
            전송
          </button>
        </div>
        <Map coord={coord} alt={alt} />
      </div>
    </div>
  );
}

export default App;

import { useState, useEffect } from "react";
import { socket, serIsOn } from "./socket";

function CFG() {
  const [cfg_window, cfg_windowSet] = useState(false);

  const [port_list, port_listSet] = useState([]);
  const [baud_rate, baud_rateSet] = useState("");
  const [port, portSet] = useState(undefined);

  const [inputDisable, inputDisableSet] = useState(false);
  const [connectDisable, connectDisableSet] = useState(false);

  useEffect(() => {
    const func = (data) => {
      if (data.port) {
        // 연결된 경우
        portSet(data.port);
        serIsOn = true;
        inputDisableSet(true);
      } else {
        // 연결 안된 경우
        if (data.port_list.length === 0) {
          portSet(undefined);
        } else {
          portSet(data.port_list[0][0]);
        }
        serIsOn = false;
        inputDisableSet(false);
      }
      connectDisableSet(false);
      port_listSet(data.port_list);
      baud_rateSet(data.baud_rate);
    };
    socket.on("current_ser_info", func);

    // 마운트시 연결 상태 체크
    socket.emit("ser_info");
    return () => {
      socket.off("current_ser_info", func);
    };
  }, []);

  return (
    <>
      <button
        onClick={() => {
          cfg_windowSet(!cfg_window);
          socket.emit("ser_info");
        }}
        style={{
          width: "20px",
          height: "20px",
          color: "gray",
          position: "absolute",
          top: "5px",
          left: "5px",
        }}
      ></button>
      {cfg_window && (
        <div
          style={{
            width: "100vw",
            height: "100vh",
            position: "absolute",
            top: "0",
            left: "0",
            zIndex: "2",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            textAlign: "center",
          }}
          onClick={() => {
            cfg_windowSet(!cfg_window);
          }}
        >
          <div
            style={{
              width: "250px",
              height: "350px",
              marginTop: "-175px",
              marginLeft: "-125px",
              position: "absolute",
              top: "50%",
              left: "50%",
              backgroundColor: "#ddd",
              borderRadius: "30px",
            }}
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <h3 style={{ padding: "0", margin: "10px 0" }}>설정</h3>
            <p style={{ margin: "0" }}>시리얼 포트</p>
            <select
              id="serial-port"
              style={{ width: "200px", margin: "0 auto" }}
              disabled={inputDisable ? true : false}
              onChange={(e) => {
                portSet(e.target.value);
              }}
              value={port}
            >
              <optgroup label="시리얼 포트"></optgroup>
              {port_list.map((item) => (
                <option value={item[0]}>{item[0] + item[1]}</option>
              ))}
            </select>
            <p style={{ margin: "0" }}>보드레이트</p>
            <select
              id="baudrate"
              style={{ width: "200px", margin: "0 auto" }}
              disabled={inputDisable ? true : false}
              onChange={(e) => {
                baud_rateSet(e.target.value);
              }}
              value={baud_rate}
            >
              <optgroup label="보드레이트">
                <option value="9600">9600</option>
                <option value="115200">115200</option>
              </optgroup>
            </select>
            <div style={{ marginTop: "10px" }}>
              <button
                style={{ width: "100px" }}
                onClick={() => {
                  socket.emit("ser_info");
                }}
              >
                새로고침
              </button>
              <button
                style={{ width: "100px", marginLeft: "10px" }}
                onClick={() => {
                  if (!serIsOn) {
                    // 시리얼 비활성화시
                    if (port && baud_rate) {
                      let data = {
                        port: port,
                        baud_rate: baud_rate,
                      };
                      socket.emit("con_ser", data);
                    } else {
                      socket.emit("ser_info");
                    }
                  } else {
                    // 시리얼 활성화시
                    socket.emit("discon_ser");
                  }
                  inputDisableSet(true);
                  connectDisableSet(true);
                }}
                disabled={connectDisable ? true : false}
              >
                {serIsOn ? "연결해제" : "연결"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default CFG;

from flask_socketio import emit

from module import *
from nicola import bg_thread


def socketio_events(socketio, ser):
    bg = bg_thread(ser)

    @socketio.on("ser_info")
    def ser_info():
        info = {
            "port": ser.port,
            "baud_rate": str(ser.baudrate),
            "port_list": ser.ser_list(),
        }
        emit("current_ser_info", info, broadcast=False)

    @socketio.on("get_map_data")
    def get_map_data(time):
        if bg.isOn():
            data = bg.gps_data_from_time(time)
            if not data is None:
                emit("pull_map_data", data, broadcast=False)
            else:
                print("버퍼가 비었거나 유효하지 않은 입력.")
        else:
            info = {
                "port": ser.port,
                "baud_rate": str(ser.baudrate),
                "port_list": ser.ser_list(),
            }
            emit("current_ser_info", info, broadcast=False)

    @socketio.on("con_ser")
    def con_ser(data):
        ser.baudrate = int(data["baud_rate"])
        ser.port = data["port"]
        try:
            ser.open()
            bg.set()
        except:
            print("연결 실패")
        info = {
            "port": ser.port,
            "baud_rate": str(ser.baudrate),
            "port_list": ser.ser_list(),
        }
        emit("current_ser_info", info, broadcast=False)

    @socketio.on("discon_ser")
    def discon_ser():
        bg.close()
        ser.close()
        ser.port = None
        info = {
            "port": ser.port,
            "baud_rate": str(ser.baudrate),
            "port_list": ser.ser_list(),
        }
        emit("current_ser_info", info, broadcast=False)

    @socketio.on("give_me_imu")
    def give_me_imu(time):
        if bg.isOn():
            data = bg.imu_data_from_time(time)
            if not data is None:
                emit("here_are_your_imu", data)
        else:
            info = {
                "port": ser.port,
                "baud_rate": str(ser.baudrate),
                "port_list": ser.ser_list(),
            }
            emit("current_ser_info", info, broadcast=False)

    @socketio.on("give_me_gps")
    def give_me_gps(time):
        if bg.isOn():
            data = bg.gps_data_from_time(time)
            if not data is None:
                emit("here_are_your_gps", data)
        else:
            info = {
                "port": ser.port,
                "baud_rate": str(ser.baudrate),
                "port_list": ser.ser_list(),
            }
            emit("current_ser_info", info, broadcast=False)

    @socketio.on("serialInput")
    def serialInput(data):
        if bg.isOn():
            try:
                bg.ser.write(str.encode(data))
            except:
                print(f"{data} 전송 실패")
            else:
                emit("serialAck", data)
        else:
            print(f"시리얼 꺼져있음: {data} 전송 실패")

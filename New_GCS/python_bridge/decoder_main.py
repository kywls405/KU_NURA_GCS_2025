# python_bridge/decoder_main.py

import serial
import socket
import json
import time
import csv
import random
from datetime import datetime

from decoder import Decoder
from data_struct import GpsData, ImuData

"""
=================================================================
 [수정] 실행 모드 설정
 - 시뮬레이션 모드: simulate_mode = True
 - 실제 데이터 모드: simulate_mode = False
=================================================================
"""
simulate_mode = True  # <-- 이 값을 True/False로 변경하세요.


# === TCP 소켓 연결 (공통) ===
TCP_HOST = '127.0.0.1'
TCP_PORT = 9000
sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
try:
    sock.connect((TCP_HOST, TCP_PORT))
    print(f"🟢 Connected to Node.js backend at {TCP_HOST}:{TCP_PORT}")
except socket.error as e:
    print(f"🔥 TCP connection error: {e}")
    exit()

# === CSV 파일 설정 (공통) ===
timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
csv_filename = f"telemetry_log_{timestamp_str}.csv"
csv_file = open(csv_filename, mode='w', newline='', encoding='utf-8')
fieldnames = [
    "timestamp", "local_timestamp", "roll", "pitch", "yaw",
    "P_alt", "Alt", "ax", "ay", "az", "lat", "lon",
    "temp", "pressure", "vel_n", "vel_e", "vel_d", "ejection"
]
csv_writer = csv.DictWriter(csv_file, fieldnames=fieldnames)
csv_writer.writeheader()
print(f"📄 Logging telemetry to {csv_filename}")


if simulate_mode:
    # --- 시뮬레이션 모드 ---
    # (시뮬레이션 모드는 이미 0초부터 시작하므로 수정 없음)
    print("✅ Simulation mode activated.")
    # ... (생략) ...

else:
    # --- 실제 데이터 모드 ---
    print("✅ Real data mode activated.")

    # === 시리얼 설정 ===
    PORT = "COM11"
    BAUDRATE = 9600
    try:
        ser = serial.Serial(PORT, BAUDRATE)
    except serial.SerialException as e:
        print(f"🔥 Serial port error: {e}")
        sock.close()
        csv_file.close()
        exit()

    print("=== Serial Open ===")
    # === 디코더 초기화 ===
    decoder = Decoder()
    
    # [수정 1] 비행 시작 타임스탬프를 저장할 변수 추가
    flight_start_timestamp = None

    print("=== Decoder Main Start ===")
    try:
        while True:
            if ser.in_waiting > 0:
                byte_read = ser.read(ser.in_waiting)
                for byte in byte_read:
                    decoder.decode(byte)

            if decoder.is_imu_update():
                imu = decoder.get_imu_data()
                
                # --- [수정 2] 타임스탬프 정규화 로직 ---
                current_packet_timestamp = decoder.timestamp

                # 첫 유효 패킷의 타임스탬프를 비행 시작 시간으로 한 번만 기록
                if flight_start_timestamp is None:
                    flight_start_timestamp = current_packet_timestamp

                # 비행 시작 시간으로부터의 상대 시간 계산 (FC 타임스탬프가 ms 단위일 경우 /1000.0)
                relative_timestamp = (current_packet_timestamp - flight_start_timestamp) / 1000.0
                # ------------------------------------

                if decoder.is_gps_update():
                    gps = decoder.get_gps_data()
                else:
                    gps = GpsData()

                data = {
                    # [수정 3] 정규화된 상대 시간을 timestamp로 사용
                    "timestamp": relative_timestamp,
                    "local_timestamp": time.time(),
                    "roll": imu.euler[0], "pitch": imu.euler[1], "yaw": imu.euler[2],
                    "P_alt": imu.P_alt,
                    "ax": imu.acc[0], "ay": imu.acc[1], "az": imu.acc[2],
                    "temp": imu.temperature, "pressure": imu.pressure,
                    "ejection": imu.ejection,
                    "Alt": gps.Alt,
                    "lat": gps.lat, "lon": gps.lon,
                    "vel_n": gps.velN, "vel_e": gps.velE, "vel_d": gps.velD,
                }
                
                sock.sendall((json.dumps(data) + '\n').encode())
                csv_writer.writerow(data)
                print(f"[RECV] ts:{data['timestamp']:.3f}, euler: {imu.euler}, pos: {gps.lon:.7f}, {gps.lat:.7f}, alt: {gps.Alt:.2f}")

            time.sleep(0.01)

    except KeyboardInterrupt:
        print("\n🛑 User interrupt. Closing resources.")
    except (serial.SerialException, BrokenPipeError) as e:
        print(f"🔥 A connection error occurred: {e}")
    finally:
        ser.close()
        sock.close()
        csv_file.close()
        print("✅ All resources are closed.")
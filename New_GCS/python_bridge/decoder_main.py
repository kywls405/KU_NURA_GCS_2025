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
simulate_mode = False  # <-- 이 값을 True/False로 변경하세요.


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
    print("✅ Simulation mode activated.")
    # (시뮬레이션 모드 코드는 변경 없음)
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

    print("=== Decoder Main Start ===")
    try:
        while True:
            if ser.in_waiting > 0:
                byte_read = ser.read(ser.in_waiting)
                for byte in byte_read:
                    decoder.decode(byte)

            # [로직 수정] IMU 데이터 수신을 기준으로 동작
            if decoder.is_imu_update():
                imu = decoder.get_imu_data()

                # IMU 업데이트 시점에 GPS도 함께 업데이트 되었는지 확인
                if decoder.is_gps_update():
                    # IMU+GPS 통합 패킷의 경우
                    gps = decoder.get_gps_data()
                else:
                    # IMU 단독 패킷의 경우, 빈 GPS 객체 생성
                    gps = GpsData()

                # 데이터 패킷 구성
                data = {
                    "timestamp": decoder.timestamp,
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
                
                # 데이터 전송 및 저장
                sock.sendall((json.dumps(data) + '\n').encode())
                csv_writer.writerow(data)
                print(f"[RECV] ts:{data['timestamp']}, euler: {imu.euler}, pos: {gps.lon:.7f}, {gps.lat:.7f}, alt: {gps.Alt:.2f}")

            # CPU 과부하 방지를 위한 대기
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
# python_bridge/decoder_main.py

import serial
import socket
import json
import time
import csv
from datetime import datetime

from decoder import Decoder
from data_struct import GpsData, ImuData

# === 시리얼 설정 ===
PORT = "COM4"
BAUDRATE = 9600
ser = serial.Serial(PORT, BAUDRATE)

# === TCP 소켓 연결 (Node.js 백엔드로) ===
TCP_HOST = '127.0.0.1'
TCP_PORT = 9000
sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.connect((TCP_HOST, TCP_PORT))
print(f"🟢 Connected to Node.js backend at {TCP_HOST}:{TCP_PORT}")

# === CSV 파일 설정 ===
timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
csv_file = open(f"telemetry_log_{timestamp_str}.csv", mode='w', newline='', encoding='utf-8')

# [수정] CSV 필드명에 속도(vel) 필드 추가
csv_writer = csv.DictWriter(csv_file, fieldnames=[
    "timestamp", "local_timestamp",
    "roll", "pitch", "yaw",
    "p_alt", "alt",
    "ax", "ay", "az",
    "lat", "lon",
    "temp", "pressure",
    "vel_n", "vel_e", "vel_d", # 속도 필드 추가
    "ejection"
])
csv_writer.writeheader()

# === 디코더 초기화 ===
decoder = Decoder()
gps = GpsData()
imu = ImuData()

print("=== Decoder Main Start ===")
while True:
    try:
        if ser.in_waiting > 0:
            byte_read = ser.read(1)
            if byte_read:
                decoder.decode(int.from_bytes(byte_read, 'little'))

        if decoder.is_gps_update() or decoder.is_imu_update():
            gps = decoder.get_gps_data()
            imu = decoder.get_imu_data()

            # [수정] 최종 데이터 구성
            data = {
                # 패킷에서 받은 타임스탬프
                "timestamp": decoder.timestamp,

                # GCS에서 데이터를 수신하고 처리한 로컬 PC 시간
                "local_timestamp": time.time(),

                "roll": imu.euler[0],
                "pitch": imu.euler[1],
                "yaw": imu.euler[2],
                "p_alt": imu.P_alt,
                "alt": gps.alt,
                "ax": imu.acc[0],
                "ay": imu.acc[1],
                "az": imu.acc[2],
                "lat": gps.lat,
                "lon": gps.lon,
                "temp": imu.temperature,
                "pressure": imu.pressure,
                
                # [추가] 속도 데이터
                "vel_n": gps.velN,
                "vel_e": gps.velE,
                "vel_d": gps.velD,
                
                "ejection": imu.ejection
            }

            # TCP 전송
            try:
                sock.sendall((json.dumps(data) + '\n').encode())
            except Exception as e:
                print(f"⚠️ TCP Send Failed: {e}")
                break

            # CSV 저장
            csv_writer.writerow(data)

            # 콘솔 출력
            print(f"[IMU] euler: {imu.euler}, [GPS] pos: {gps.lon:.5f}, {gps.lat:.5f}, alt: {gps.alt:.2f}")

    except KeyboardInterrupt:
        print("\n🛑 User interrupt. Closing resources.")
        break
    except Exception as e:
        print(f"🔥 An unexpected error occurred: {e}")
        break

# === 리소스 정리 ===
ser.close()
sock.close()
csv_file.close()
print("✅ All resources are closed.")

# python_bridge/decoder_main.py
import sys
import io
import copy

# UTF-8 인코딩 설정
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
if sys.stderr.encoding != 'utf-8':
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

import serial
import socket
import json
import time
import csv
import argparse
from datetime import datetime
from decoder import Decoder
from data_struct import GpsData, ImuData

def send_status_to_server(sock, message, status_type='info'):
    """서버로 상태 정보를 JSON 형식으로 전송합니다."""
    try:
        status_packet = {
            "type": "status",
            "status": status_type,
            "message": message
        }
        sock.sendall((json.dumps(status_packet) + '\n').encode())
    except (BrokenPipeError, socket.error) as e:
        print(f"Error sending status: {e}")

parser = argparse.ArgumentParser(description="Serial to TCP bridge for GCS.")
parser.add_argument('--port', required=True, help='Serial port to connect to.')
parser.add_argument('--baud', type=int, required=True, help='Serial port baudrate.')
parser.add_argument('--host', default='127.0.0.1', help='TCP server host.')
parser.add_argument('--tcp_port', type=int, default=9000, help='TCP server port.')
args = parser.parse_args()

SERIAL_PORT = args.port
BAUDRATE = args.baud
TCP_HOST = args.host
TCP_PORT = args.tcp_port

sock = None
csv_file = None
ser = None

try:
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.connect((TCP_HOST, TCP_PORT))
    
    # --- 💡 FIX 1: 연결 성공 시간을 기록 ---
    connection_start_time = time.time()
    
    print(f"🟢 Connected to Node.js backend at {TCP_HOST}:{TCP_PORT}")

    timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    csv_filename = f"telemetry_log_{timestamp_str}.csv"
    csv_file = open(csv_filename, mode='w', newline='', encoding='utf-8')
    
    fieldnames = [
        "local_timestamp", "connect_timestamp", "flight_timestamp", "raw_packet_timestamp",
        "ax", "ay", "az", "gx", "gy", "gz", "mx", "my", "mz",
        "roll", "pitch", "yaw", "max_g", "temp", "pressure", "P_alt",
        "lon", "lat", "Alt", "vel_n", "vel_e", "vel_d", "fix_type",
        "ejection", "launch"
    ]
    csv_writer = csv.DictWriter(csv_file, fieldnames=fieldnames)
    csv_writer.writeheader()
    print(f"📄 Logging telemetry to {csv_filename}")

    try:
        send_status_to_server(sock, f"{SERIAL_PORT} @ {BAUDRATE}bps 연결 시도 중...", "info")
        ser = serial.Serial(SERIAL_PORT, BAUDRATE, timeout=1)
        send_status_to_server(sock, f"성공적으로 {SERIAL_PORT}에 연결되었습니다.", "success")
        print(f"=== Serial Port {SERIAL_PORT} Opened ===")
    except serial.SerialException as e:
        error_msg = f"시리얼 포트({SERIAL_PORT}) 오류: {e}"
        print(f"🔥 {error_msg}")
        send_status_to_server(sock, error_msg, "error")
        exit()

    decoder = Decoder()
    launch_packet_timestamp = None
    print("=== Decoder Main Start ===")
    
    while True:
        try:
            byte_read = ser.read(ser.in_waiting or 1)
        except serial.SerialException as e:
            error_msg = f"데이터 읽기 중 오류 발생: {e}"
            print(f"🔥 {error_msg}")
            send_status_to_server(sock, error_msg, "error")
            break

        if not byte_read:
            continue

        for byte in byte_read:
            decoder.decode(byte)

        if decoder.is_imu_update():
            imu = copy.deepcopy(decoder.get_imu_data())  # ← launch 값 덮어쓰기 방지
            current_packet_timestamp = decoder.timestamp

            if imu.launch == 1 and launch_packet_timestamp is None:
                launch_packet_timestamp = current_packet_timestamp
            
            relative_flight_timestamp = 0.0
            if launch_packet_timestamp is not None:
                relative_flight_timestamp = (current_packet_timestamp - launch_packet_timestamp) / 1000.0
            
            gps = decoder.get_gps_data() if decoder.is_gps_update() else GpsData()

            # --- 💡 FIX 2: 현재 시간과 연결 후 경과 시간을 계산 ---
            current_time = time.time()
            connect_timestamp = current_time - connection_start_time

            telemetry_payload_tcp = {
                "flight_timestamp": relative_flight_timestamp,
                "connect_timestamp": connect_timestamp, # 수정된 값 사용
                "roll": imu.euler[0], "pitch": imu.euler[1], "yaw": imu.euler[2],
                "P_alt": imu.P_alt, "Alt": gps.Alt,
                "ax": imu.acc[0], "ay": imu.acc[1], "az": imu.acc[2],
                "lat": gps.lat, "lon": gps.lon,
                "temp": imu.temperature, "pressure": imu.pressure,
                "vel_n": gps.velN, "vel_e": gps.velE, "vel_d": gps.velD,
                "ejection": imu.ejection,
                "launch": imu.launch
            }
            
            telemetry_payload_csv = {
                "local_timestamp": current_time, # 계산된 현재 시간 재사용
                "connect_timestamp": connect_timestamp, # 수정된 값 사용
                "flight_timestamp": relative_flight_timestamp,
                "raw_packet_timestamp": current_packet_timestamp,
                "ax": imu.acc[0], "ay": imu.acc[1], "az": imu.acc[2],
                "gx": imu.gyro[0], "gy": imu.gyro[1], "gz": imu.gyro[2],
                "mx": imu.mag[0], "my": imu.mag[1], "mz": imu.mag[2],
                "roll": imu.euler[0], "pitch": imu.euler[1], "yaw": imu.euler[2],
                "max_g": 0,
                "temp": imu.temperature, "pressure": imu.pressure, "P_alt": imu.P_alt,
                "lon": gps.lon, "lat": gps.lat, "Alt": gps.Alt,
                "vel_n": gps.velN, "vel_e": gps.velE, "vel_d": gps.velD,
                "fix_type": gps.fixType,
                "ejection": imu.ejection,
                "launch": imu.launch
            }

            full_packet = {
                "type": "telemetry",
                "payload": telemetry_payload_tcp
            }

            sock.sendall((json.dumps(full_packet) + '\n').encode())
            csv_writer.writerow(telemetry_payload_csv)

except (socket.error, BrokenPipeError) as e:
    print(f"🔥 TCP 소켓 오류: {e}")
except KeyboardInterrupt:
    print("\n🛑 User interrupt. Closing resources.")
except Exception as e:
    error_msg = f"예상치 못한 오류 발생: {e}"
    print(f"🔥 {error_msg}")
    if sock:
        send_status_to_server(sock, error_msg, "error")
finally:
    if ser and ser.is_open:
        ser.close()
    if sock:
        sock.close()
    if csv_file:
        csv_file.close()
    print("✅ All resources are closed.")
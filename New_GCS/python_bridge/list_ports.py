import serial.tools.list_ports
import json

def get_serial_ports():
    """사용 가능한 시리얼 포트 목록을 찾아 JSON 형태로 출력합니다."""
    ports = serial.tools.list_ports.comports()
    port_list = []
    for port in ports:
        # 각 포트의 이름(device)과 설명(description)을 딕셔너리로 저장
        port_list.append({
            "device": port.device,
            "description": port.description
        })
    # 찾은 포트 목록을 JSON 형식의 문자열로 변환하여 출력
    print(json.dumps(port_list))

if __name__ == "__main__":
    get_serial_ports()
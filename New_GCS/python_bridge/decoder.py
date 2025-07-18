import serial
import struct
import enum

from data_struct import GpsData, ImuData

HEADER1 = 0xAA
HEADER2 = 0xBB

class MsgID(enum.Enum):
    IMU = 0x01
    GPS = 0x02
    IMU_GPS = 0x03

class Decoder:
    def __init__(self):
        self.buf = bytearray(256) 

        self.gpsData = GpsData()
        self.imuData = ImuData()

        self.timestamp = 0

        self.new_gps_update = False
        self.new_imu_update = False

        self.idx = 0
        self.chksum = 0
        self.len = 0
        self.msg_type = 0

        self.rx_comp = False

    def decode(self, byte_in):        
        if self.idx == 0:  # Header 1
            if byte_in == HEADER1:
                self.buf[self.idx] = byte_in

                self.idx += 1
            else:
                self.idx = 0

        elif self.idx == 1:  # Header 2
            if byte_in == HEADER2:
                self.buf[self.idx] = byte_in

                self.idx += 1
            else:
                self.idx = 0

        elif self.idx == 2:  # Type
            self.buf[self.idx] = byte_in
            self.msg_type = self.buf[self.idx]
            
            self.chksum ^= self.buf[self.idx]
            self.idx += 1

        elif self.idx == 3:  # Payload length
            self.buf[self.idx] = byte_in

            payload_len = self.buf[self.idx]
            self.len = payload_len + 5 # 패킷 전체 길이

            self.chksum ^= self.buf[self.idx]
            self.idx += 1

        else:
            if self.idx < self.len:
                self.buf[self.idx] = byte_in

                if self.idx < self.len - 1:
                    self.chksum ^= self.buf[self.idx]
                self.idx += 1
        
        if self.idx >= 4 and self.idx >= self.len: # if all byte received
            if self.chksum == self.buf[self.len - 1]:
                self.rx_comp = True # 파싱 트리거
            
            # 다음 패킷을 위해 상태 초기화
            self.idx = 0
            self.chksum = 0

        if self.rx_comp:
            self.parse()
            self.rx_comp = False

    def parse(self):
        # '<' -> 리틀 엔디안 / 'B'(uint8_t) -> ejection / 'h'(int16_t) -> acc, gyro, magnetic, rpy, velN, velE, velD
        # 'H'(uint16_t) -> temp, P_alt, alt / 'I'(uint32_t) -> press, lon, lat, timestamp
        
        self.timestamp = struct.unpack_from("<I", self.buf, 4)[0] # 타임스탬프 (4~7)Byte
        payload_offset = 8 # 페이로드 시작 위치

        if self.msg_type == MsgID.IMU.value:
            # acc(3h),gyro(3h),mag(3h),euler(3h),temp(H),press(I),P_alt(H),ejection(B)
            payload_fmt = "<12hHIHB" 
            unpacked_data = struct.unpack_from(payload_fmt, self.buf, payload_offset)

            self.imuData.acc   = [x / 100.0 for x in unpacked_data[0:3]]
            self.imuData.gyro  = [x / 100.0  for x in unpacked_data[3:6]]
            self.imuData.mag   = [x / 10.0  for x in unpacked_data[6:9]]
            self.imuData.euler = [x / 100.0 for x in unpacked_data[9:12]]
            self.imuData.temperature = unpacked_data[12] / 100.0
            self.imuData.pressure    = unpacked_data[13] / 100.0
            self.imuData.P_alt       = unpacked_data[14] / 100.0

            self.imuData.ejection    = unpacked_data[15]
            self.new_imu_update = True

        elif self.msg_type == MsgID.GPS.value:
            # lon(I),lat(I),alt(H),ve(3h),fix(B)
            payload_fmt = "<3I3hB"
            unpacked_data = struct.unpack_from(payload_fmt, self.buf, payload_offset)
            
            self.gpsData.lon = unpacked_data[0]  / 1e7
            self.gpsData.lat = unpacked_data[1]  / 1e7
            self.gpsData.Alt = unpacked_data[2]  / 100.0
            self.gpsData.velN = unpacked_data[3] / 100.0
            self.gpsData.velE = unpacked_data[4] / 100.0
            self.gpsData.velD = unpacked_data[5] / 100.0
            self.gpsData.fixType = unpacked_data[6]

            self.new_gps_update = True
        
        elif self.msg_type == MsgID.IMU_GPS.value:
            payload_fmt = "<12hHIH3I3hBB" 
            unpacked_data = struct.unpack_from(payload_fmt, self.buf, payload_offset)
            
            # IMU
            self.imuData.acc   = [x / 100.0 for x in unpacked_data[0:3]]
            self.imuData.gyro  = [x / 100.0  for x in unpacked_data[3:6]]
            self.imuData.mag   = [x / 10.0  for x in unpacked_data[6:9]]
            self.imuData.euler = [x / 100.0 for x in unpacked_data[9:12]]
            self.imuData.temperature = unpacked_data[12] / 100.0
            self.imuData.pressure    = unpacked_data[13] / 100.0
            self.imuData.P_alt       = unpacked_data[14] / 100.0
            
            # GPS
            self.gpsData.lon = unpacked_data[15]  / 1e7
            self.gpsData.lat = unpacked_data[16]  / 1e7
            self.gpsData.Alt = unpacked_data[17]  / 100.0
            self.gpsData.velN = unpacked_data[18] / 100.0
            self.gpsData.velE = unpacked_data[19] / 100.0
            self.gpsData.velD = unpacked_data[20] / 100.0
            self.gpsData.fixType = unpacked_data[21]
            
            self.imuData.ejection = unpacked_data[22]
            
            self.new_imu_update = True
            self.new_gps_update = True

    def is_gps_update(self):
        return self.new_gps_update

    def is_imu_update(self):
        return self.new_imu_update

    def get_gps_data(self):
        self.new_gps_update = False
        return self.gpsData

    def get_imu_data(self):
        self.new_imu_update = False
        return self.imuData

if __name__ == "__main__":
    port = "COM11"
    baudrate = 9600 # 수정 필요?

    ser = serial.Serial(port, baudrate)
    decoder = Decoder()

    gps = GpsData()
    imu = ImuData()

    print("=== Main Start ===")
    while True:
        if ser.in_waiting > 0:
                byte_read = ser.read(1)

                if byte_read:
                    decoder.decode(int.from_bytes(byte_read, 'little'))

        if decoder.is_gps_update():
            gps = decoder.get_gps_data()
            print(f"pos: {gps.lon:.2f}, {gps.lat:.2f}, {gps.Alt:.2f}", end="\t")
            print(f"vel: {gps.velN:.2f}, {gps.velE:.2f}, {gps.velD:.2f}", end="\n")

        if decoder.is_imu_update():
            imu = decoder.get_imu_data()
            print(
                f"acc: {imu.acc[0]:.2f}, {imu.acc[1]:.2f}, {imu.acc[2]:.2f}", end="\t"
            )
            print(
                f"gyro: {imu.gyro[0]:.2f}, {imu.gyro[1]:.2f}, {imu.gyro[2]:.2f}",
                end="\n",
            )

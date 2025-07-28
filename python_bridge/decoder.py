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
        if self.idx == 0:
            if byte_in == HEADER1:
                self.buf[self.idx] = byte_in
                self.idx += 1
            else:
                self.idx = 0
        elif self.idx == 1:
            if byte_in == HEADER2:
                self.buf[self.idx] = byte_in
                self.idx += 1
            else:
                self.idx = 0
        elif self.idx == 2:
            self.buf[self.idx] = byte_in
            self.msg_type = self.buf[self.idx]
            self.chksum ^= self.buf[self.idx]
            self.idx += 1
        elif self.idx == 3:
            self.buf[self.idx] = byte_in
            payload_len = self.buf[self.idx]
            self.len = payload_len + 5
            self.chksum ^= self.buf[self.idx]
            self.idx += 1
        else:
            if self.idx < self.len:
                self.buf[self.idx] = byte_in
                if self.idx < self.len - 1:
                    self.chksum ^= self.buf[self.idx]
                self.idx += 1
    
        if self.idx >= 4 and self.idx >= self.len:
            if self.chksum == self.buf[self.len - 1]:
                self.rx_comp = True
            
            self.idx = 0
            self.chksum = 0

        if self.rx_comp:
            self.parse()
            self.rx_comp = False

    def parse(self):
        self.timestamp = struct.unpack_from("<I", self.buf, 4)[0]
        payload_offset = 8

        if self.msg_type == MsgID.IMU.value:
            # P_alt를 부호 없는 정수(H)로 변경
            print("IMU")
            payload_fmt = "<12hHIHBB" 
            unpacked_data = struct.unpack_from(payload_fmt, self.buf, payload_offset)

            self.imuData.acc         = [x / 100.0 for x in unpacked_data[0:3]]
            self.imuData.gyro        = [x / 100.0 for x in unpacked_data[3:6]]
            self.imuData.mag         = [x / 10.0  for x in unpacked_data[6:9]]
            self.imuData.euler       = [x / 100.0 for x in unpacked_data[9:12]]
            self.imuData.temperature = unpacked_data[12] / 100.0
            self.imuData.pressure    = unpacked_data[13] / 100.0
            p_alt_val = unpacked_data[14] / 100.0
            
            # 고도 예외처리
            self.imuData.P_alt = 0 if p_alt_val > 400 else p_alt_val

            self.imuData.ejection    = unpacked_data[15]
            self.imuData.launch      = unpacked_data[16]
            self.new_imu_update = True

        elif self.msg_type == MsgID.GPS.value:
            print("GPS")
            payload_fmt = "<3I3hB"
            unpacked_data = struct.unpack_from(payload_fmt, self.buf, payload_offset)
            
            self.gpsData.lon = unpacked_data[0] / 1e7
            self.gpsData.lat = unpacked_data[1] / 1e7
            alt_val = unpacked_data[2] / 100.0
            
            # 고도 예외처리
            self.gpsData.Alt = 0 if alt_val > 400 else alt_val

            self.gpsData.velN = unpacked_data[3] / 100.0
            self.gpsData.velE = unpacked_data[4] / 100.0
            self.gpsData.velD = unpacked_data[5] / 100.0
            self.gpsData.fixType = unpacked_data[6]

            self.new_gps_update = True
        
        elif self.msg_type == MsgID.IMU_GPS.value:
            # [핵심 수정] P_alt(H)와 누락되었던 fixType(B)을 모두 반영하여 "BBB"로 수정
            print("IMU_GPS")
            payload_fmt = "<12hHIH3I3hBBB" 
            unpacked_data = struct.unpack_from(payload_fmt, self.buf, payload_offset)
            
            # IMU
            self.imuData.acc         = [x / 100.0 for x in unpacked_data[0:3]]
            self.imuData.gyro        = [x / 100.0 for x in unpacked_data[3:6]]
            self.imuData.mag         = [x / 10.0  for x in unpacked_data[6:9]]
            self.imuData.euler       = [x / 100.0 for x in unpacked_data[9:12]]
            self.imuData.temperature = unpacked_data[12] / 100.0
            self.imuData.pressure    = unpacked_data[13] / 100.0
            p_alt_val = unpacked_data[14] / 100.0
            
            self.imuData.P_alt = 0 if p_alt_val > 400 else p_alt_val
            
            # GPS
            self.gpsData.lon = unpacked_data[15] / 1e7
            self.gpsData.lat = unpacked_data[16] / 1e7
            alt_val = unpacked_data[17] / 100.0
            
            self.gpsData.Alt = 0 if alt_val > 400 else alt_val

            self.gpsData.velN = unpacked_data[18] / 100.0
            self.gpsData.velE = unpacked_data[19] / 100.0
            self.gpsData.velD = unpacked_data[20] / 100.0
            self.gpsData.fixType = unpacked_data[21]
            
            # Ejection, Launch
            self.imuData.ejection = unpacked_data[22]
            self.imuData.launch   = unpacked_data[23]
            
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

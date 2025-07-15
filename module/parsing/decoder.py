# import serial
# import struct

# from .data_struct import GpsData, ImuData

# HEADER1 = b"\xFF"  # 헤더 수정
# HEADER2 = b"\xFE"

# MSG_IMU = 0x01
# MSG_GPS = 0x02
# MSG_IMU_GPS = 0x03


# class Decoder:
#     def __init__(self):
#         self.buf = bytearray(100)

#         self.gpsData = GpsData()
#         self.imuData = ImuData()
#         self.timestamp = 0

#         self.new_gps_update = False
#         self.new_imu_update = False

#         self.idx = 0
#         self.chksum = b"\x00"

#         self.len = 0
#         self.msg_type = 0

#         self.rx_comp = False

#     def decode(self, input):
#         if self.idx == 0:  # Header 1
#             if input == HEADER1:
#                 self.buf[self.idx] = input[0]
#                 self.idx += 1
#             else:
#                 self.idx = 0

#         elif self.idx == 1:  # Header 2
#             if input == HEADER2:
#                 self.buf[self.idx] = input[0]
#                 self.idx += 1
#             else:
#                 self.idx = 0

#         elif self.idx == 2:  # Type
#             self.buf[self.idx] = input[0]
#             self.idx += 1

#             self.msg_type = byte2char(input)
#             self.chksum = bitxor(self.chksum, input)

#         elif self.idx == 3:  # Payload length
#             self.buf[self.idx] = input[0]
#             self.idx += 1

#             len = byte2char(input)
#             self.len = len + 5

#             self.chksum = bitxor(self.chksum, input)

#         else:  # Data
#             self.buf[self.idx] = input[0]
#             self.idx += 1

#             if (self.idx <= self.len - 1):  # calc self.chksum before self.chksum byte input
#                 self.chksum = bitxor(self.chksum, input)

#         if self.idx >= 4 and self.idx >= self.len:  # if all byte received
#             if byte2char(self.chksum) == self.buf[self.len - 1]:
#                 self.rx_comp = True
#             self.idx = 0
#             self.chksum = b"\x00"

#         if self.rx_comp == True:
#             self.parse()
#             self.rx_comp = False

#     def parse(self):
#         buf = self.buf[0 : self.len]

#         if self.msg_type == MSG_IMU:
#             payload = struct.unpack("<xxxxIfffffffffffffffbx", buf)

#             self.timestamp = payload[0]
#             self.imuData.acc[0] = payload[1]
#             self.imuData.acc[1] = payload[2]
#             self.imuData.acc[2] = payload[3]
#             self.imuData.gyro[0] = payload[4]
#             self.imuData.gyro[1] = payload[5]
#             self.imuData.gyro[2] = payload[6]
#             self.imuData.mag[0] = payload[7]
#             self.imuData.mag[1] = payload[8]
#             self.imuData.mag[2] = payload[9]
#             self.imuData.euler[0] = payload[10]
#             self.imuData.euler[1] = payload[11]
#             self.imuData.euler[2] = payload[12]
#             self.imuData.temp = payload[13]
#             self.imuData.press = payload[14]
#             self.imuData.p_alt = payload[15]

#             self.imuData.ejection = payload[16]

#             self.new_imu_update = True

#         elif self.msg_type == MSG_GPS:
#             payload = struct.unpack("<xxxxIffffffbx", buf)

#             self.timestamp = payload[0]
#             self.gpsData.lon = payload[1]
#             self.gpsData.lat = payload[2]
#             self.gpsData.height = payload[3]
#             self.gpsData.velN = payload[4]
#             self.gpsData.velE = payload[5]
#             self.gpsData.velD = payload[6]
#             self.gpsData.fixType = payload[7]

#             self.new_gps_update = True

#         elif self.msg_type == MSG_IMU_GPS:
#             payload = struct.unpack("<xxxxIfffffffffffffffffffffbbx", buf)

#             self.timestamp = payload[0]
#             self.imuData.acc[0] = payload[1]
#             self.imuData.acc[1] = payload[2]
#             self.imuData.acc[2] = payload[3]
#             self.imuData.gyro[0] = payload[4]
#             self.imuData.gyro[1] = payload[5]
#             self.imuData.gyro[2] = payload[6]
#             self.imuData.mag[0] = payload[7]
#             self.imuData.mag[1] = payload[8]
#             self.imuData.mag[2] = payload[9]
#             self.imuData.euler[0] = payload[10]
#             self.imuData.euler[1] = payload[11]
#             self.imuData.euler[2] = payload[12]
#             self.imuData.temp = payload[13]
#             self.imuData.press = payload[14]
#             self.imuData.p_alt = payload[15]

#             self.gpsData.lon = payload[16]
#             self.gpsData.lat = payload[17]
#             self.gpsData.height = payload[18]
#             self.gpsData.velN = payload[19]
#             self.gpsData.velE = payload[20]
#             self.gpsData.velD = payload[21]
#             self.gpsData.fixType = payload[22]

#             self.imuData.ejection = payload[23]

#             self.new_imu_update = True
#             self.new_gps_update = True

#     def is_gps_update(self):
#         return self.new_gps_update

#     def is_imu_update(self):
#         return self.new_imu_update

#     def get_gps_data(self):
#         self.new_gps_update = False
#         return self.gpsData

#     def get_imu_data(self):
#         self.new_imu_update = False
#         return self.imuData


# def bitxor(a, b):
#     return bytes([aa ^ bb for aa, bb in zip(a, b)])


# def byte2int(b):
#     return struct.unpack("i", b)[0]


# def byte2uint(b):
#     return struct.unpack("I", b)[0]


# def byte2char(b):
#     return ord(struct.unpack("c", b)[0])


# def byte2float(b):
#     return struct.unpack("f", b)[0]


# if __name__ == "__main__":
#     port = "COM4"
#     baudrate = 115200

#     ser = serial.Serial(port, baudrate)
#     decoder = Decoder()

#     gps = GpsData()
#     imu = ImuData()

#     print("=== Main Start ===")
#     while True:
#         if ser.readable():
#             decoder.decode(ser.read())

#         if decoder.is_gps_update():
#             gps = decoder.get_gps_data()
#             print(f"pos: {gps.lon:.2f}, {gps.lat:.2f}, {gps.height:.2f}", end="\t")
#             print(f"vel: {gps.velN:.2f}, {gps.velE:.2f}, {gps.velD:.2f}", end="\n")

#         if decoder.is_imu_update():
#             imu = decoder.get_imu_data()
#             print(
#                 f"acc: {imu.acc[0]:.2f}, {imu.acc[1]:.2f}, {imu.acc[2]:.2f}", end="\t"
#             )
#             print(
#                 f"gyro: {imu.gyro[0]:.2f}, {imu.gyro[1]:.2f}, {imu.gyro[2]:.2f}",
#                 end="\n",
#             )

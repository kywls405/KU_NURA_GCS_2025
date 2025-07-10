from module import *
from threading import Thread
import time


class bg_thread:
    def __init__(self, ser: serial_plus):
        """시리얼을 통해 데이터를 읽어오는 클래스.

        Args:
            ser (serial_plus): 시리얼.
        """
        self.ser = ser
        self.thread = None

    def set(self):
        """쓰레드를 시작하는 함수."""
        if not self.isOn():
            self.flag = False
            self.thread = Thread(target=self.bg_thread)
            self.thread.start()

    def close(self):
        """쓰레드를 종료하는 함수."""
        if self.isOn():
            self.flag = True
            self.thread.join()  # 쓰레드 종료까지 대기
            self.thread = None

    def isOn(self) -> bool:
        """쓰레드가 작동하고 있는지 확인하는 함수.

        Returns:
            bool: 쓰레드 작동 여부
        """
        return not self.thread is None

    def gps_data_from_time(self, time: int) -> dict | None:
        """입력한 시간의 다음 순간부터의 위치를 퉤 하는 함수.

        Args:
            time (int): 찾을 시간.

        Returns:
            dict | None: 위치 데이터, 유효하지 않은 시간일 경우 None 반환.
        """
        if self.isOn():
            return self._gps_line_buf.get_from(time)

    def imu_data_from_recent(self) -> dict | None:
        if self.isOn():
            return self._imu_data_buf.get_recent()

    def gps_data_from_recent(self) -> dict | None:
        if self.isOn():
            return self._gps_data_buf.get_recent()

    def imu_data_from_time(self, time: int) -> dict | None:
        if self.isOn():
            return self._imu_data_buf.get_from(time)

    def gps_data_from_time(self, time: int) -> dict | None:
        if self.isOn():
            return self._gps_data_buf.get_from(time)

    def bg_thread(self):
        """시리얼에서 데이터를 읽어오는 역할을 하는 별도 쓰레드에서 작동할 함수"""
        print("111111111111111111111111111111111111")
        file_name = time.strftime("./log/#log_%y%m%d_%H%M%S.csv", time.localtime())
        saver = Saver(file_name)

        decoder = Decoder()
        gps = GpsData()
        imu = ImuData()
        self._imu = imu

        buf_size = 2000
        imu_data_buf = ImuDataBuf(buf_size)
        gps_data_buf = GpsDataBuf(buf_size)
        gps_line_buf = LineDataBuf(buf_size)
        self._imu_data_buf = imu_data_buf
        self._gps_data_buf = gps_data_buf
        self._gps_line_buf = gps_line_buf

        while True:
            if self.flag:
                return

            if self.ser.in_waiting > 0:
                byte_read = self.ser.read(1)

                if byte_read:
                    decoder.decode(int.from_bytes(byte_read, 'little'))

            if decoder.is_imu_update():
                imu = decoder.get_imu_data()
                imu_data_buf.add(decoder.timestamp, imu)

                if decoder.is_gps_update():
                    gps = decoder.get_gps_data()
                    gps_data_buf.add(decoder.timestamp, gps)
                    gps_line_buf.add(decoder.timestamp, gps)

                else:
                    gps = GpsData()

                saver.save_line(gps, imu, decoder.timestamp)

# # 디버깅시 아래 주석 해제 후 실행
# # 이 주석을 없애려면 테스트용 실행파일을 상위 폴터에 만들면 되긴 하는데 귀찮
# import sys, os
# sys.path.append(os.path.dirname(os.path.abspath(os.path.dirname(__file__))))
# from parsing import GpsData
# # 여기까지


class buf:
    def __init__(self, size: int):
        """링 버퍼 클래스.

        Args:
            size (int): 링 버퍼 크기
        """
        self._size = size
        self._reset()

    def _reset(self):
        """링 버퍼 초기화 함수."""
        buffer = [None] * self._size
        self._head = 0
        self._tail = 0
        self._data_num = 0
        self._buffer = buffer

    def enqueue(self, data):
        """링 버퍼에 데이터 한 개 추가하는 함수.

        Args:
            data (_type_): 추가할 데이터, 자료형 상관 없음
        """
        if self._isfull():
            self.dequeue()
        self._buffer[self._tail] = data
        self._tail = (self._tail + 1) % self._size
        self._data_num += 1

    def dequeue(self):
        """링 버퍼에서 가장 오래된 데이터를 반환하고 삭제하는 함수.

        Returns:
            _type_ | None: 가장 오래된 데이터. 데이터가 없을 시 None 반환.
        """
        if self._data_num == 0:
            self._reset()
            return None
        data = self._buffer[self._head]
        self._buffer[self._head] = None
        self._head = (self._head + 1) % self._size
        self._data_num -= 1
        return data

    def get_all(self) -> list | None:
        """모든 데이터를 입력된 순서대로 리스트로 만들어 반환하는 함수.

        Returns:
            list | None: 입력된 순서대로 정렬된 데이터. 데이터가 없을 시 None 반환.
        """
        return self.get_from(self._head)

    def get_from(self, start: int, include_start=True) -> list | None:
        """특정 데이터부터 순서대로 끝까지 반환하는 함수.

        Args:
            start (int): 시작할 인덱스
            include_start (bool): 리턴값에 시작점을 포함할 지 여부

        Returns:
            list | None: 입력된 순서대로 정렬된 데이터. 데이터가 없을 시 None 반환.
        """
        if not include_start:
            start = (start + 1) % self._size

        if self._data_num == 0:
            return None
        if start < self._tail:
            return self._buffer[start : self._tail]
        else:
            return self._buffer[start : self._size] + self._buffer[0 : self._tail]

    def get_recent(self) -> int | None:
        """입력된 가장 최근의 데이터를 반환하는 함수.

        Returns:
            int | None: 가장 최근의 데이터. 데이터가 없을 시 None 반환
        """
        return self._buffer[(self._tail - 1) % self._size]

    def _isfull(self) -> bool:
        """버퍼가 다 찼는지 확인하는 함수.

        Returns:
            bool: 버퍼가 다 찼으면 True, 아니면 False 반환
        """
        return self._data_num == self._size

    def _isempty(self) -> bool:
        """버퍼가 비어있는지 확인하는 함수.

        Returns:
            bool: 버퍼가 비어있으면 True, 아니면 False 반환
        """
        return self._data_num == 0


class time_buf(buf):
    def binary_search(self, target: int) -> int:
        """이진 탐색으로 인덱스를 찾는 함수

        Args:
            target (int): 탐색할 시간

        Returns:
            int: 해당 시간에 해당하는 링 버퍼의 인덱스. 예외 발생시 None 반환.
        """
        if self._isempty():
            return None

        if (
            target < self._buffer[self._head]
            or target > self._buffer[(self._tail - 1) % self._size]
        ):
            return None

        start = 0
        end = self._data_num - 1

        while start <= end:
            mid = (start + end) // 2

            idx = (self._head + mid) % self._size  # 실제 버퍼 내부의 idx
            data = self._buffer[idx]  # 버퍼의 idx의 데이터

            if data == target:
                return idx
            elif data < target:
                start = mid + 1
            else:
                end = mid - 1
        return None

    def is_expired(self, target: int) -> bool:
        """입력된 시간이 버퍼에 저장된 가장 오래된 시간보다 작은지 확인하는 함수.

        Args:
            target (int): 확인할 시간.

        Returns:
            bool: 만료 여부.
        """
        return target < self._buffer[self._head]


class LineDataBuf:
    def __init__(self, size: int):
        """Javascript maptalks에서 요구하는 형식으로 위치를 저장하는 링 버퍼.

        Args:
            size (int): 링 버퍼의 크기.
        """
        pos = buf(size)
        h = buf(size)
        time = time_buf(size)

        self._pos = pos
        self._h = h
        self._time = time

    def add(self, time: int, gps):
        """링 버퍼에 데이터를 추가하는 함수.

        Args:
            time (int): 데이터가 측정된 시간.
            gps (GpsData): GPS 측정값 구조체. data_struct.py의 GpsData 클래스 구조를 따른다.
        """
        self._time.enqueue(int(time))
        self._pos.enqueue([gps.lon, gps.lat])
        self._h.enqueue(gps.alt)

    def get_from(self, target: int) -> dict | None:
        """특정 시간 다음부터의 위치 데이터를 딕셔너리 형태로 출력하는 함수.

        Args:
            target (int): 타겟 시간.

        Returns:
            dict | None: 위치 데이터. 유효하지 않은 시간일 경우 None 반환.
        """
        if self._time.get_recent() == target:
            print("ring buffer: 이미 최신 데이터임")
            return None

        idx = self._time.binary_search(target)

        if idx is None:  # 예외 처리
            print("ring buffer: 시간 이진탐색 실패")
            if self._time._isempty():  # 버퍼가 비어있을 시
                print("버퍼가 비어있음")
                return None
            if self._time.is_expired(target):  # 가장 오래된 데이터보다 이전의 데이터를 입력했을 시
                print("시간 만료됨, 전체 데이터 출력")
                return {
                    "pos": self._pos.get_all(),
                    "alti": self._h.get_all(),
                    "time": self._time.get_recent(),
                }
            print("유효하지 않은 데이터")
            return None

        return {
            "pos": self._pos.get_from(idx, include_start=False),
            "alti": self._h.get_from(idx, include_start=False),
            "time": self._time.get_recent(),
        }


class ImuDataBuf:
    def __init__(self, size: int):
        imu_buf = buf(size)
        time = time_buf(size)

        self._imu_buf = imu_buf
        self._time = time

    def add(self, time: int, imu):
        self._time.enqueue(int(time))
        data = {
            "acc": imu.acc.copy(),
            "gyro": imu.gyro.copy(),
            "mag": imu.mag.copy(),
            "euler": imu.euler.copy(),
            "temp": imu.temperature,
            "press": imu.pressure,
            "p_alt": imu.P_alt,
            "ejection": imu.ejection,
        }
        self._imu_buf.enqueue(data)
        print(f"acc_x: {imu.acc[0]:.2f}, acc_y: {imu.acc[1]:.2f}, acc_z: {imu.acc[2]:.2f}\n")
        print(f"gyro_x: {imu.gyro[0]:.2f}, gyro_y: {imu.gyro[1]:.2f}, gyro_z: {imu.gyro[2]:.2f}\n")

    def get_recent(self) -> dict | None:
        data = self._imu_buf.get_recent()
        time = self._time.get_recent()

        if data is None or time is None:
            return None

        data["time"] = time
        return data

    def get_from(self, target: int) -> dict | None:
        """특정 시간 다음부터의 위치 데이터를 딕셔너리 형태로 출력하는 함수.

        Args:
            target (int): 타겟 시간.

        Returns:
            dict | None: 위치 데이터. 유효하지 않은 시간일 경우 None 반환.
        """
        if self._time.get_recent() == target:
            print("ring buffer: 이미 최신 데이터임")
            return None

        idx = self._time.binary_search(target)

        if idx is None:  # 예외 처리
            print("ring buffer: 시간 이진탐색 실패")
            if self._time._isempty():  # 버퍼가 비어있을 시
                print("버퍼가 비어있음")
                return None
            if self._time.is_expired(target):  # 가장 오래된 데이터보다 이전의 데이터를 입력했을 시
                print("시간 만료됨, 전체 데이터 출력")
                return {
                    "imu": self._imu_buf.get_all(),
                    "time": self._time.get_recent(),
                }
            print("유효하지 않은 데이터")
            return None

        return {
            "imu": self._imu_buf.get_from(idx, include_start=False),
            "time": self._time.get_recent(),
        }


class GpsDataBuf:
    def __init__(self, size: int):
        gps_buf = buf(size)
        time = time_buf(size)

        self._gps_buf = gps_buf
        self._time = time

    def add(self, time: int, gps):
        self._time.enqueue(int(time))
        data = {
            "lon": gps.lon,
            "lat": gps.lat,
            "height": gps.alt,
            "velN": gps.velN,
            "velE": gps.velE,
            "velD": gps.velD,
            "fixType": gps.fixType,
        }
        self._gps_buf.enqueue(data)

    def get_recent(self) -> dict | None:
        data = self._gps_buf.get_recent()
        time = self._time.get_recent()

        if data is None or time is None:
            return None

        data["time"] = time
        return data

    def get_from(self, target: int) -> dict | None:
        """특정 시간 다음부터의 위치 데이터를 딕셔너리 형태로 출력하는 함수.

        Args:
            target (int): 타겟 시간.

        Returns:
            dict | None: 위치 데이터. 유효하지 않은 시간일 경우 None 반환.
        """
        if self._time.get_recent() == target:
            print("ring buffer: 이미 최신 데이터임")
            return None

        idx = self._time.binary_search(target)

        if idx is None:  # 예외 처리
            print("ring buffer: 시간 이진탐색 실패")
            if self._time._isempty():  # 버퍼가 비어있을 시
                print("버퍼가 비어있음")
                return None
            if self._time.is_expired(target):  # 가장 오래된 데이터보다 이전의 데이터를 입력했을 시
                print("시간 만료됨, 전체 데이터 출력")
                return {
                    "gps": self._gps_buf.get_all(),
                    "time": self._time.get_recent(),
                }
            print("유효하지 않은 데이터")
            return None

        return {
            "gps": self._gps_buf.get_from(idx, include_start=False),
            "time": self._time.get_recent(),
        }


# if __name__ == "__main__":
#     gps = GpsData()

#     gps.lon = 127.4
#     gps.lat = 37.4
#     gps.height = 10.1

#     #####################

#     map_data = line_data(10)

#     for i in range(15):
#         map_data.add(i * 3, gps)
#         gps.lon += 0.01
#         gps.lat -= 0.01
#         gps.height += 1.1

#     print(map_data.get_from(3))
#     print(map_data.get_from(4))
#     print(map_data.get_from(36))
#     print(map_data.get_from(42))
#     print(map_data.get_from(45))

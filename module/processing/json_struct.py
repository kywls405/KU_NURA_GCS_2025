class json_struct:
    def __init__(self, key_list1: list, key_list3: list, size: int):
        self.size = size
        self.key_list1 = key_list1
        self.key_list3 = key_list3

        self.head = 0
        self.tail = 0

        self.buffer = {}
        self.reset_buffer()

    def __repr__(self):
        return str(self.get_all_data())

    def reset_buffer(self) -> None:
        init_list1 = [0.0] * self.size
        init_list3 = [[0.0] * 3] * self.size

        for i in self.key_list1:
            self.buffer[i] = init_list1.copy()
        for i in self.key_list3:
            self.buffer[i] = init_list3.copy()

    def get_all_data(self) -> dict:
        data = {}
        for i in self.key_list1 + self.key_list3:
            val = []
            for j in range(self.size):
                val.append(self.buffer[i][(self.head + j) % self.size])
            data[i] = val
        return data

    def get_tail_data(self) -> dict:
        data = {}
        for i in self.key_list1 + self.key_list3:
            data[i] = self.buffer[i][self.tail - 1]
        return data

    def is_empty(self) -> bool:
        return self.head == self.tail

    def is_full(self) -> bool:
        return (self.tail + 1) % self.size == self.head


class gps_json(json_struct):
    def __init__(self, size: int):
        self.size = size
        self.key_list1 = ["time"]
        self.key_list3 = ["pos", "vel"]

        self.head = 0
        self.tail = 0

        self.buffer = {}
        self.reset_buffer()

    def enqueue(self, gps: object, time: int) -> None:
        if self.is_full():
            self.head = (self.head + 1) % self.size
        self.buffer["time"][self.tail] = time
        self.buffer["pos"][self.tail] = [gps.lon, gps.lat, gps.alt]
        self.buffer["vel"][self.tail] = [gps.velN, gps.velE, gps.velD]
        self.tail = (self.tail + 1) % self.size


class imu_json(json_struct):
    def __init__(self, size: int):
        self.size = size
        self.key_list1 = ["time", "temp", "press", "p_alt"]
        self.key_list3 = ["acc", "gyro", "mag"]

        self.head = 0
        self.tail = 0

        self.buffer = {}
        self.reset_buffer()

    def enqueue(self, imu: object, time: int) -> None:
        if self.is_full():
            self.head = (self.head + 1) % self.size
        self.buffer["time"][self.tail] = time
        self.buffer["acc"][self.tail] = imu.acc.copy()
        self.buffer["gyro"][self.tail] = imu.gyro.copy()
        self.buffer["mag"][self.tail] = imu.mag.copy()
        self.buffer["temp"][self.tail] = imu.temperature
        self.buffer["press"][self.tail] = imu.pressure
        self.buffer["p_alt"][self.tail] = imu.P_alt
        self.tail = (self.tail + 1) % self.size


if __name__ == "__main__":
    json = gps_json(10)
    print(json)

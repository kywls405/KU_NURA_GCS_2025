class Saver:
    def __init__(self, filename):
        self.name = filename

        with open(self.name, "w") as f:
            f.write(
                "timestamp,ax,ay,az,gx,gy,gz,mx,my,mz,roll,pitch,yaw,T,P,P_alt,fix,lon,lat,alt,velN,velE,velD,ejection\n"
            )

    def save_line(self, gps, imu, timestamp):
        with open(self.name, "a") as f:
            f.write(f"{timestamp},{imu.acc[0]},{imu.acc[1]},{imu.acc[2]},")
            f.write(f"{imu.gyro[0]},{imu.gyro[1]},{imu.gyro[2]},")
            f.write(f"{imu.mag[0]},{imu.mag[1]},{imu.mag[2]},")
            f.write(f"{imu.euler[0]},{imu.euler[1]},{imu.euler[2]},")
            f.write(f"{imu.temperature},{imu.pressure},{imu.P_alt},")
            f.write(f"{gps.fixType},{gps.lon},{gps.lat},{gps.alt},")
            f.write(f"{gps.velN},{gps.velE},{gps.velD},")
            f.write(f"{imu.ejection}\n")

    def save_test(self, i):
        with open(self.name, "a") as f:
            f.write(f"{i}\n")


if __name__ == "__main__":
    filename = "sensor_data_test.csv"
    saver = Saver(filename)
    saver.save_test(10)

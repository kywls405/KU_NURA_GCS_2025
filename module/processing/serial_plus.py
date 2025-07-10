import serial
import serial.tools.list_ports


class serial_plus(serial.Serial):
    def ser_list(self):
        port_list = serial.tools.list_ports.comports()
        opened_port = []
        for i in range(len(port_list)):
            opened_port.append([port_list[i].device])
            info = port_list[i].description
            if info[:16] == "mbed Serial Port":
                opened_port[i].append(" - " + info)
            else:
                opened_port[i].append("")
        return opened_port

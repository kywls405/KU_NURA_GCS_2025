from flask import Flask
from flask_socketio import SocketIO

from module import serial_plus
from routes import flask_routes
from events import socketio_events

app = Flask(__name__, static_folder="build")
socketio = SocketIO(app)

if __name__ == "__main__":
    ser = serial_plus()
    ser.baudrate = 9600

    # 웹 페이지 route 생성 함수
    flask_routes(app)

    # 웹소켓 이벤트 생성 함수
    socketio_events(socketio, ser)

    # 웹서버 실행
    socketio.run(app=app, host="0.0.0.0", debug=True, use_reloader=False)

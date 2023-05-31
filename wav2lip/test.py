import socketio
import sys

sio = socketio.Client()

try:
    @sio.event
    def connect():
        print("connected...")

    @sio.event
    def test(data):
        print("recieved: ", data)

    sio.connect("http://localhost:3000")

except KeyboardInterrupt:
    print("exiting...")
    sys.exit(0)
import socketio
import sys
import subprocess

sio = socketio.Client()

try:
    @sio.event
    def connect():
        print("connected...")

    @sio.event
    def ttsReady(data):
        print("recieved: ", data)
        subprocess.call(["python", "inference.py", "--checkpoint_path", "checkpoints/wav2lip.pth", "--face", "youngJoey.mp4", "--audio", "../tts.mp3"])

    sio.connect("http://localhost:3000")

except KeyboardInterrupt:
    print("exiting...")
    sys.exit(0)

#   D:\DDocuments\CodeSculpting\Ruhsky\Basic-ChatBot\wav2lip>
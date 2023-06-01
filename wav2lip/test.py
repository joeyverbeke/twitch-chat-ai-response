import socketio
import subprocess
#from subprocess import Popen
from threading import Thread
import time
import os

sio = socketio.Client()

""""
class Process(Popen):
    def register_callback(self, callback, *args, **kwargs):
        Thread(target=self._poll_completion, args=(callback, args, kwargs)).start()

    def _poll_completion(self, callback, args, kwargs):
        while self.poll() is None:
            time.sleep(0.1)
        callback(*args, **kwargs)
"""
        
#try:
@sio.event
def connect():
    print("connected...")

@sio.event
def ttsReady(data):
    print("recieved: ", data)
    #subprocess.call(["python", "inference.py", "--checkpoint_path", "checkpoints/wav2lip_gan.pth", "--face", "aiJoey.mp4", "--audio", "../tts.mp3"])
    proc_create = subprocess.Popen(["python", "inference.py", "--checkpoint_path", "checkpoints/wav2lip_gan.pth", "--face", "aiJoey.mp4", "--audio", "../tts.mp3"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    
    while proc_create.poll() is None:
        output, error = proc_create.communicate()
        print(output)

    #proc_move = subprocess.Popen(["cmd", "/c", "move", "./results/result_voice.mp4", "../public/aiJoey.mp4"])
    proc_move = subprocess.Popen('move .\\results\\result_voice.mp4 ..\\public\\aiJoey.mp4', shell=True)


    while proc_move.poll() is None:
        output, error = proc_move.communicate()
        print(output)

    print("finished...")
    sio.emit("vidReady", {"vidReady": "vidReady"})

@sio.event
def disconnect():
    print("disconnected...")

sio.connect("http://localhost:3000")

#except KeyboardInterrupt:
#    print("exiting...")
#    sys.exit(0)

#   D:\DDocuments\CodeSculpting\Ruhsky\Basic-ChatBot\wav2lip
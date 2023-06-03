const {config} = require('./app.config');

const express = require("express");
const app = express();
const http = require('http');
const path = require('path');
const server = http.createServer(app);

const { Server } = require('socket.io');
const io = new Server(server);

const tmi = require('tmi.js');
const fs = require("fs");

const voice = require('elevenlabs-node');
const {chat, local_chat} = require('./gpt');

const player = require('play-sound')();
//const video = require("video");

let isCreatingVid = false;
let chatMessages = [];
let lastFileSize = 0;

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

server.listen(3000, () => {
  console.log("listening on *:3000");
})

const client = new tmi.Client({
	options: { debug: true },
	connection: {
		secure: true,
		reconnect: true
	},
	identity: {
		username: config.twitch_username,
		password: config.twitch_key
	},
	channels: [ config.twitch_channel ]
});

client.connect();

client.on('message', (channel, tags, message, self) => {
	//console.log(`${tags['display-name']}: ${message}`);

  chatMessages.push((`${tags['display-name']}: ${message}`));

  if(!isCreatingVid){
    chatToGPT();
  }

});

async function chatToGPT(){
  if(!isCreatingVid){
    
    //pick random message from chat
    const chosenChatter = chatMessages[Math.floor(Math.random() * chatMessages.length)];

    //responding to
    console.log(chosenChatter);

    //clear messages
    chatMessages = [];

    chat(chosenChatter)
    .then(response => {
        if(response != null) {
            const responseData = response.choices[0].message.content;
            responseToTTS(responseData);
      }
        else {
          res.status(500).json({ error: 'empty response' });
        }
    });
  }
}

io.on("connection", (socket) => {
  socket.on("vidReady", (data) => {
    console.log("vid is ready...")

    //check if new file has loaded
    while(fs.statSync("./public/aiJoey.mp4").size == lastFileSize){
      //wait
    }

    console.log("vid has loaded...")

    lastFileSize = fs.statSync("./public/aiJoey.mp4").size;

    io.emit("playVid", "1");
    isCreatingVid = false;

    //if chat messages are waiting, start new one
    if(chatMessages.length > 0){
      chatToGPT();
    }

//    const video = new videoPlayer("/wav2lip/results/result_voice.mp4");
//    video.play();
  })
})



async function responseToTTS(message){
    const audioStream = await voice.textToSpeechStream(config.elevenlabs_key, config.voice_id, message);

    const ttsFileName = "tts.mp3"

    const writeStream = fs.createWriteStream(ttsFileName);
    audioStream.pipe(writeStream);

    writeStream.on('finish', async () => {

      //tell python we ready for some wav2lip
      io.emit("ttsReady", 1);
      isCreatingVid = true;

      //for audio only playback
      /*
        player.play("./tts.mp3", (err) => {
            if (err) console.log(`Could not play sound: ${err}`);
        });
      */
    })

    writeStream.on('error', (error) => {
        console.error('Error writing the file:', error);
        res.status(500).send('Internal Server Error');
    });
}

app.post("/gpt", async (req, res) => {
  const prompt = req.body.prompt;

  chat(prompt)
  .then(response => {
    if(response != null) {
      //res.json({ responseData: response.results[0].text})
      res.json({ responseData: response.choices[0].message.content})
    }
    else {
      res.status(500).json({ error: 'empty response' });
    }
  });
});
const {config} = require('./app.config');

const express = require("express");
const { createServer } = require('http');
const WebSocket = require('ws');

const tmi = require('tmi.js');
const fs = require("fs");

const voice = require('elevenlabs-node');
const {chat, local_chat} = require('./gpt');

const player = require('play-sound')();
//const video = require("video");

var ffmpeg = require('fluent-ffmpeg');

const app = express();
const port = 8080;

const server = createServer(app);
const wss = new WebSocket.Server({ server });

let isCreatingVid = false;
let chatMessages = [];
let lastFileSize = 0;

const twinPrompt = "twin";


server.listen(port, function() {
  console.log(`Listening on http://localhost:${port}`);
});

wss.on('connection', ws => {
  console.log('Client connected');

  // Send a message to the client
  ws.send('Welcome!');

  ws.on('message', message => {
    console.log('Received: %s', message);
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

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

  //return if message isn't for my twin
  if(!message.includes(twinPrompt)){
    return;
  }

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


function notifyUnity(ttsFileName) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({fileName: ttsFileName}));
    }
  });
}

async function responseToTTS(message){
    const audioStream = await voice.textToSpeechStream(config.elevenlabs_key, config.voice_id, message);

    //const ttsFileName = "tts.mp3"
    let timestamp = Date.now();
    const ttsFileName = `tts_${timestamp}`;
    const ttsPath = "./airia/TTS_Files/";

    const ttsMP3 = ttsPath + ttsFileName + ".mp3";
    const ttsWAV = ttsPath + ttsFileName + ".wav";

    const writeStream = fs.createWriteStream(ttsMP3);
    audioStream.pipe(writeStream);

    writeStream.on('finish', async () => {

      var process = new ffmpeg({ source: ttsMP3 })
        .toFormat('wav')
        .on('error', function(err) {
          console.log('An error occurred: ' + err.message);
        })
        .on('progress', function(progress) {
          console.log('Processing: ' + progress.percent + '% done');
        })
        .on('end', function() {
          console.log('Processing finished!');
        })
        .saveToFile(ttsWAV);
      
      setTimeout(() => {
        notifyUnity(ttsFileName);
      }, "100");

      //if chat messages are waiting, start new one
      if(chatMessages.length > 0){
        chatToGPT();
      }
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
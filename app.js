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

let waitingForTts = false;
let chatMessages = [];
let lastFileSize = 0;
let currentBot;

const aiPrompt = ["airia", "ailuro"];


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

  //return if message is for me
  let includesPrompt = false;
  for(let i=0; i<aiPrompt.length; i++){
    if(message.includes(aiPrompt[i])){
      includesPrompt = true;
    }
  }

  if(!includesPrompt){
    return;
  }

  chatMessages.push((`${tags['display-name']}: ${message}`));

  if(!waitingForTts){
    chatToGPT();
  }

});

async function chatToGPT(){
  if(!waitingForTts && chatMessages.length > 0){
    
    //pick random message from chat
    const chosenChatter = chatMessages[Math.floor(Math.random() * chatMessages.length)];

    //set currentBot to whom chatter is talking to
    for(let i=0; i<aiPrompt.length; i++){
      if(chosenChatter.includes(aiPrompt[i])){
        currentBot = aiPrompt[i];
      }
    }

    //responding to
    console.log(chosenChatter);

    //clear messages
    chatMessages = [];

    chat(chosenChatter)
    .then(response => {
        if(response != null) {

          const responseData = response.choices[0].message.content;
          console.log(Date.now(), " - ", chosenChatter, currentBot, ": ", responseData);

          getTtsOfResponse(responseData, currentBot)
          .then(ttsFile => {
            writeToFileAndSend(ttsFile);

          });
        }
        else {
          res.status(500).json({ error: 'empty response' });
        }
    });
  }
}


function notifyUnity(_botName, ttsFileName) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({botName: _botName, fileName: ttsFileName}));
    }
  });
}

async function getTtsOfResponse(message, botName){

  waitingForTts = true;

  switch (botName) {
    case "airia":
      return await voice.textToSpeechStream(config.elevenlabs_key, config.voice_id_airia, message);

    case "ailuro":
      return await voice.textToSpeechStream(config.elevenlabs_key, config.voice_id_ailuro, message);

    default:
      break;
  }
}

async function writeToFileAndSend(ttsStream){
  let timestamp = Date.now();
  const ttsFileName = `tts_${timestamp}`;
  const ttsPath = "./airia/TTS_Files/";

  const ttsMP3 = ttsPath + ttsFileName + ".mp3";
  const ttsWAV = ttsPath + ttsFileName + ".wav";

  const writeStream = fs.createWriteStream(ttsMP3);
  ttsStream.pipe(writeStream);

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
    
    const timeout = setTimeout(() => {
      notifyUnity(currentBot, ttsFileName);
      waitingForTts = false;
      chatToGPT();
    }, "500")
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
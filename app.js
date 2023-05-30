const {config} = require('./app.config');

const express = require("express");
const app = express();

const tmi = require('tmi.js');
const fs = require("fs");

const voice = require('elevenlabs-node');
const {chat, local_chat} = require('./gpt');

const player = require('play-sound')();

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
	console.log(`${tags['display-name']}: ${message}`);

    chat(`${tags['display-name']}: ${message}`)
    .then(response => {
        if(response != null) {
            const responseData = response.choices[0].message.content;
            respondToChat(responseData);
        }
        else {
          res.status(500).json({ error: 'empty response' });
        }
    });
});

async function respondToChat(message){
    const audioStream = await voice.textToSpeechStream(config.elevenlabs_key, config.voice_id, message);

    const ttsFileName = "tts.mp3"

    const writeStream = fs.createWriteStream(ttsFileName);
    audioStream.pipe(writeStream);

    writeStream.on('finish', async () => {

        player.play("./tts.mp3", (err) => {
            if (err) console.log(`Could not play sound: ${err}`);
        });
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
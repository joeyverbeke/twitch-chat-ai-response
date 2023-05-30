const {env} = require('./app.env');

var config={
    'gpt_ip': '127.0.0.1',
    'openai_key': env.OPENAI_API_KEY,
    'elevenlabs_key': env.ELEVENLABS_KEY, 
    'twitch_key': env.TWTICH_KEY,
    'voice_id': env.VOICE_ID
}

module.exports = {config}
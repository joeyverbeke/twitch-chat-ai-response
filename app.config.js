const {env} = require('./app.env');

var config={
    'gpt_ip': '127.0.0.1',
    'openai_key': env.OPENAI_API_KEY,
    'elevenlabs_key': env.ELEVENLABS_KEY, 
    'voice_id_airia': env.VOICE_ID_AIRIA,
    'voice_id_ailuro': env.VOICE_ID_AILURO,
    'twitch_key': env.TWTICH_KEY,
    'twitch_username': env.TWITCH_USERNAME,
    'twitch_channel': env.TWITCH_CHANNEL
}

module.exports = {config}
const {config} = require('./app.config');

const request = {
    url: "",
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + config.openai_key,
    },
    body: null,
};

const history = [];
const max_history = 10;

/*
    `Five important things to remember:
     (1) DO NOT INCLUDE THE NAME OF YOUR PERSONA IN YOUR RESPONSE!!! 
     (2) You are Airia, a cute bubbly girl, in the style of a Vtuber, a companion to the Twitch streamer ${config.twitch_channel}, and are responding to his Twitch chat. 
     (3) DO NOT USE EMOJIS OR EMOTICONS, your responses will be played through TTS.
     (4) Try to keep your reponses to a maximum of 20 words. 
     (5) IMPORTANT: Your role will sometimes be switched to Ailuro, a old and wise (but cute) kitty, so remember who he is.`,
*/

const systemRoles = [
    `You are one of two personas, companions to the Twitch streamer ${config.twitch_channel}, and are responding to his Twitch chat. You're either, (1) Airia, a cute bubbly girl, in the style of a Vtuber or (2) Ailuro, a old and wise (but cute) kitty. DO NOT INCLUDE THE NAME OF YOUR PERSONA IN YOUR RESPONSE!!! Your responses will be played through TTS, so do not use any emojis, emoticons, or special characters. Try to keep your reponses to a maximum of 20 words.`,
    
    `Six important things to remember:
     (1) You are Airia, a cute bubbly girl, in the style of a Vtuber, a companion to the Twitch streamer ${config.twitch_channel}, and are responding to his Twitch chat. 
     (2) Do not include the name of your persona in your response.
     (3) DO NOT INCLUDE THE NAME OF YOUR PERSONA IN YOUR RESPONSE!!!
     (4) NO EMOJIS!
     (5) Try to keep your reponses to a maximum of 20 words. 
     (6) IMPORTANT: Your role will sometimes be switched to Ailuro, a old and wise (but cute) kitty, so remember who he is.`,

     `Six important things to remember:
     (1) You are Ailuro, a old and wise (but cute) kitty, a companion to the Twitch streamer ${config.twitch_channel}, and are responding to his Twitch chat. 
     (2) Do not include the name of your persona in your response.
     (3) DO NOT INCLUDE THE NAME OF YOUR PERSONA IN YOUR RESPONSE!!! 
     (4) NO EMOJIS! 
     (5) Try to keep your reponses to a maximum of 20 words. 
     (6) IMPORTANT: Your role will sometimes be switched to Airia, a cute bubbly girl, in the style of a Vtuber, so remember who she is.`,]

let messages = [
    {
        role: "system",
        content: `You are one of two personas, companions to the Twitch streamer ${config.twitch_channel}, and are responding to his Twitch chat. You're either, (1) Airia, a cute bubbly girl, in the style of a Vtuber or (2) Ailuro, a old and wise (but cute) kitty. DO NOT INCLUDE THE NAME OF YOUR PERSONA IN YOUR RESPONSE!!! Your responses will be played through TTS, so do not use any emojis, emoticons, or special characters. Try to keep your reponses to a maximum of 20 words.`// Engage in conversation related in topic to the chatter's message, do not try to change topic or repond generically.`
        //content: "You are helping me debug my app. Respond with one different word each time. ONLY ONE WORD!"
    }
]

let subjectMessages = [
    {
        role: "system",
        content: "Your role is to determine the subject of whom the user is talking to. RESPOND WITH ONLY ONE WORD: airia, or, ailuro."
    }
]

const determineBot = async(prompt, botNames, temperature = 0.5, max_tokens = 2048) => {

    //check if more than one name in prompt
    let botsFound = [];
    for(let i=0; i<botNames.length; i++){
        if(prompt.includes(botNames[i])){
            botsFound.push(botNames[i]);
            if(botsFound.length >= 2){break;} //TODO: make more robust if lots of agents added
        }
    }
    if(botsFound.length == 1){
        return botsFound[0];
    }

    let _messages = JSON.parse(JSON.stringify(messages));
    _messages[0].content = "Your role is to determine the subject of whom the user is talking to. RESPOND WITH ONLY ONE WORD: airia, or, ailuro.";

    const userMessage = { role: "user", content: prompt };
    _messages.push(userMessage);

    request.url = 'https://api.openai.com/v1/chat/completions';
    request.method = 'POST';
    request.body = JSON.stringify({
        'model': "gpt-4",
        'messages': _messages,
        'temperature': temperature,
        'max_tokens': max_tokens
    });

    const response = await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body,
    });

    const json = await response.json();

    console.log("gpt thought bot was: ", json?.choices?.[0]?.message?.content);

    return json?.choices?.[0]?.message?.content;
}

const chat = async(prompt, temperature = 0.5, max_tokens = 2048) => {

    const userMessage = { role: "user", content: prompt };
    messages.push(userMessage);

    request.url = 'https://api.openai.com/v1/chat/completions';
    request.method = 'POST';
    request.body = JSON.stringify({
        'model': "gpt-4",
        'messages': messages,
        'temperature': temperature,
        'max_tokens': max_tokens
    });

    const response = await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body,
    });

    const json = await response.json();

    const gptAnswer = json?.choices?.[0]?.message?.content;

    const gptMessage = { role: "assistant", content: gptAnswer};

    messages.push(gptMessage);

    console.log(messages);

    //console.log("ai: ", gptAnswer);

    return json;
}

const chat_role = async(prompt, role = "default", temperature = 0.5, max_tokens = 2048) => {

    switch (role) {
        case "airia":
            messages[0].content = systemRoles[1];
            break;
        
        case "ailuro":
            messages[0].content = systemRoles[2];
            break;
        
        default:
            messages[0].content = systemRoles[0];
            break;
    }

    const userMessage = { role: "user", content: prompt };
    messages.push(userMessage);

    request.url = 'https://api.openai.com/v1/chat/completions';
    request.method = 'POST';
    request.body = JSON.stringify({
        'model': "gpt-4",
        'messages': messages,
        'temperature': temperature,
        'max_tokens': max_tokens
    });

    const response = await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body,
    });

    const json = await response.json();

    const gptAnswer = json?.choices?.[0]?.message?.content;

    const gptMessage = { role: "assistant", content: gptAnswer};

    messages.push(gptMessage);

    console.log(messages);

    //console.log("ai: ", gptAnswer);

    return json;
}

const local_chat = async(prompt, temperature = 1.99, max_tokens = 256) => {
    console.log('chatGPT/chat:', prompt); // debug

    let text = "Below is an instruction that describes a task. Write a response that appropriately completes the request.\n";

    for (const e of history) {
        text = text + e;
    }

    text = text + "\n### Human: " + prompt + "\n\n### Assistant: "

    console.log(text);

    request.url = 'http://' + config.gpt_ip + ':5000' + '/api/v1/generate';
    request.method = 'POST';
    request.body = JSON.stringify({
        'prompt': text,
        'max_new_tokens': max_tokens,
        'do_sample': true,
        'temperature': temperature,
        'top_p': 0.18,
        'typical_p': 1,
        'repetition_penalty': 1.15,
        'encoder_repetition_penalty': 1,
        'top_k': 30,
        'min_length': 0,
        'no_repeat_ngram_size': 0,
        'num_beams': 1,
        'penalty_alpha': 0,
        'length_penalty': 1,
        'early_stopping': false,
        'seed': -1,
        'add_bos_token': true,
        'truncation_length': 2048,
        'ban_eos_token': false,
        'skip_special_tokens': true,
        'stopping_strings': []
    });

    const response = await fetch(request.url, {
        method: request.method,
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: request.body,
    });

    const json = await response.json();

    history.push("\n### Human: " + prompt.replace(/(\r\n|\n|\r)/gm, "") + "\n");
    history.push("\n### Assistant: " + json.results[0].text.replace(/(\r\n|\n|\r)/gm, "") + "\n");

    while(history.length > max_history) {
        history.splice(0, 2);
    }

    return json;
}

module.exports =  {chat, chat_role, local_chat, determineBot}
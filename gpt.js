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

let messages = [
    {
        role: "system",
        content: "You are responding to messages from Twitch chat. Messages will come from various users, and but there username will be included, so remember which user you're talking to. If you include their username in your response, insert it in a natural way. Your responses will be played through text-to-speech, so only include language that will be able to be spoken properly by TTS. Keep your responses to a maximum of 20 words."
    }
]

const chat = async(prompt, temperature = 0.5, max_tokens = 2048) => {

    console.log("user: ", prompt);
    
    const userMessage = { role: "user", content: prompt };
    messages.push(userMessage);
    
    //console.log('chatGPT/chat:', prompt); // debug

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

    console.log("gpt: ", gptAnswer);

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

module.exports =  {chat, local_chat}
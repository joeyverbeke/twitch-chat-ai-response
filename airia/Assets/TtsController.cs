using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Networking;

using NativeWebSocket;
using System.IO;
using System;

[Serializable]
public class TtsPath
{
    public string fileName;
    public string botName;
}

public class TtsController : MonoBehaviour
{
    public GameObject Airia;
    public GameObject Ailuro;
    
    public GameObject tts_airia;
    public GameObject tts_ailuro;

    WebSocket websocket;

    async void Start()
    {
        //audioSource = gameObject.AddComponent<AudioSource>();
        websocket = new WebSocket("ws://localhost:8080");

        websocket.OnOpen += () =>
        {
            Debug.Log("Connection open!");
        };

        websocket.OnError += (e) =>
        {
            Debug.Log("Error! " + e);
        };

        websocket.OnClose += (e) =>
        {
            Debug.Log("Connection closed!");
        };

        websocket.OnMessage += (bytes) =>
        {
            var message = System.Text.Encoding.UTF8.GetString(bytes);
            Debug.Log("OnMessage! " + message);

            var msgAsJSON = JsonUtility.FromJson<TtsPath>(message);

            Debug.Log(msgAsJSON.ToString());

            string audioFilePath = "TTS_Files/" + msgAsJSON.fileName + ".wav";

            Debug.Log("botName recieved: " + msgAsJSON.botName);
            StartCoroutine(LoadAudioClip(msgAsJSON.botName, audioFilePath));
 

        };

        // waiting for messages
        await websocket.Connect();
    }

    private IEnumerator LoadAudioClip(string botName, string relativePath)
    {
        string filePath = Path.Combine(Application.dataPath, "..", relativePath);
        filePath = "file:///" + filePath.Replace("\\", "/");

        Debug.Log(filePath);

        WWW www = new WWW(filePath);
        yield return www;

        if (string.IsNullOrEmpty(www.error))
        {
            AudioClip audioClip = www.GetAudioClip();

            if (botName == "airia")
            {
                Debug.Log("airia");

                AudioSource tts = tts_airia.GetComponent<AudioSource>();

                tts.clip = audioClip;
                tts.Play();

                Airia.GetComponent<Animator>().SetBool("isTalking", true);
                Airia.GetComponent<Animator>().SetTrigger("startedTalking");
                StartCoroutine(TransitionStateAfterTalking(botName, tts));
            }
            else if(botName == "ailuro")
            {
                Debug.Log("ailuro");

                AudioSource tts = tts_ailuro.GetComponent<AudioSource>();

                tts.clip = audioClip;
                tts.Play();

                Ailuro.GetComponent<Animator>().SetBool("isTalking", true);
                Ailuro.GetComponent<Animator>().SetTrigger("startedTalking");
                StartCoroutine(TransitionStateAfterTalking(botName, tts));
            }
        }
        else
        {
            Debug.LogError("Failed to load AudioClip from " + filePath + ". Error: " + www.error);
        }
    }

    private IEnumerator TransitionStateAfterTalking(string botName, AudioSource tts)
    {
        yield return new WaitUntil(() => tts.isPlaying == false);
        
        if(botName == "airia")
        {
            Airia.GetComponent<Animator>().SetBool("isTalking", false);
            Airia.GetComponent<Animator>().SetTrigger("stoppedTalking");
        }
        else if(botName == "ailuro")
        {
            Ailuro.GetComponent<Animator>().SetBool("isTalking", false);
            Ailuro.GetComponent<Animator>().SetTrigger("stoppedTalking");
        }
        
    }

    // Update is called once per frame
    void Update()
    {
        #if !UNITY_WEBGL || UNITY_EDITOR
                websocket.DispatchMessageQueue();
        #endif

        if (Input.GetKeyDown("space"))
        {
            /*
            audioData = GetComponent<AudioSource>();
            audioData.Play(0);
            Debug.Log("playing audio...");
            */
        }
    }
    private async void OnApplicationQuit()
    {
        await websocket.Close();
    }
}

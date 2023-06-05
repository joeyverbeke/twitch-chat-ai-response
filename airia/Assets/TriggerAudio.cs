using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Networking;

using NativeWebSocket;
using System.IO;
using System;

[Serializable]
public class ttsPath
{
    public string fileName;
}


[RequireComponent(typeof(AudioSource))]
public class TriggerAudio : MonoBehaviour
{
    AudioSource audioData;
    WebSocket websocket;
    private AudioSource audioSource;

    async void Start()
    {
        audioSource = gameObject.AddComponent<AudioSource>();
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

            var msgAsJSON = JsonUtility.FromJson<ttsPath>(message);

            Debug.Log(msgAsJSON.ToString());

            string audioFilePath = "TTS_Files/" + msgAsJSON.fileName + ".wav";

            Debug.Log(audioFilePath);
            StartCoroutine(LoadAudioClip(audioFilePath));

        };

        // waiting for messages
        await websocket.Connect();
    }

    private IEnumerator LoadAudioClip(string relativePath)
    {
        string filePath = Path.Combine(Application.dataPath, "..", relativePath);
        filePath = "file:///" + filePath.Replace("\\", "/");

        Debug.Log(filePath);

        WWW www = new WWW(filePath);
        yield return www;

        if (string.IsNullOrEmpty(www.error))
        {
            AudioClip audioClip = www.GetAudioClip();

            Debug.Log(audioClip.name);

            audioData = GetComponent<AudioSource>();
            audioData.clip = audioClip;
            audioData.Play();
        }
        else
        {
            Debug.LogError("Failed to load AudioClip from " + filePath + ". Error: " + www.error);
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
            audioData = GetComponent<AudioSource>();
            audioData.Play(0);
            Debug.Log("playing audio...");
        }
    }
    private async void OnApplicationQuit()
    {
        await websocket.Close();
    }
}

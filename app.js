import { WhisperWasmService, ModelManager } from '@timur00kh/whisper.wasm';


const ModelTypes = 
{
    tiny: "tiny",
    small: "small",
    medium: "medium",
    large: "large"

}
let enabled = false;

function LoadWhisper()
{
    const whisper = new WhisperWasmService({ logLevel: 1 });
    const modelManager = new ModelManager();
}

async function BrowserCompatible()
{
    const isSupported = await whisper.checkWasmSupport();
    if (!isSupported)
    {
        throw new Error('WebAssembly is not supported');
    }

}

async function LoadModel(model)
{
    const modelData = await modelManager.loadModel(model); 
    await whisper.initModel(modelData);
}

function IsVideoPlaying()
{
    const video = GetVideo();
    return video && !video.paused;
}

function GetVideo()
{
    return document.querySelector("video");
}

function EnabledStateChanged()
{
    if (enabled)
    {
        StartStreamingTranscription();
    }

}

function SetListeners()
{
    GetVideo().SetListeners("play", () =>
    {
        console.log("Video playing")
        enabled = true;
        EnabledStateChanged();
    })

    GetVideo().SetListeners("pause", () =>
    {
        console.log("Video paused")
        enabled = false;
        EnabledStateChanged();
    })

}

async function StartStreamingTranscription()
{
    if (!enabled) {return;}
    const session = whisper.createSession();
    const stream = session.streamimg(audioData,
    {
        language: 'en',
        threads: 4,
        translate: false,
        sleepMsBetweenChunks: 100,
    });

    for await (const segment of stream)
    {
        if (!enabled) {return;}
        console.log(`[${segment.timeStart}ms - ${segment.timeEnd}ms]: ${segment.text}`);
    }

}

function IsFocusedOnVideo()
{
    return document.visibilityState === "visible" && document.hasFocus();
}

SetListeners();
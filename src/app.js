import { WhisperWasmService, ModelManager } from "@timur00kh/whisper.wasm";

const ModelTypes = {
  tiny: "tiny",
  small: "small",
  base: "base",
  medium: "medium",
  large: "large",
};

let enabled = false;
let whisper = null;
let modelManager = null;
let audioContext = null;
let preNode = null;
let stream = null;
let audio16kStream = null;
let session = null;
let transcribing = false;
let stack = [];
const URL = browser.runtime.getURL("src/audiopreprocessor.js");

function LoadWhisper() {
  whisper = new WhisperWasmService({ logLevel: 1 });
  modelManager = new ModelManager();
  session = whisper.createSession();
}

async function BrowserCompatible() {
  const isSupported = await whisper.checkWasmSupport();
  if (!isSupported) {
    throw new Error("WebAssembly is not supported");
  } else {
    console.log("Browser compatible with Whisper");
  }
}

async function LoadModel(model) {
  console.log("Loading Whisper model...");
  try {
    const modelData = await modelManager.loadModel(model, true, (progress) => {
      console.log(`Loading progress: ${progress}%`);
    });
    await whisper.initModel(modelData);
    console.log("Whisper loaded");
  } catch (err) {
    console.log(err);
  }
}

function IsVideoPlaying() {
  const video = GetVideo();
  return video && !video.paused;
}

function GetVideo() {
  return document.querySelector("video");
}

function EnabledStateChanged() {
  if (enabled) {
    StartStreamingTranscription();
  }
}

function SetListeners() {
  console.log("Setting listeners!");
  const video = GetVideo();
  //const enableButton = document.getElementById("enableButton");
  video.addEventListener("play", () => {
    console.log("Video playing");
    enabled = true;
    StartStreamingTranscription();
  });

  video.addEventListener("pause", () => {
    console.log("Video paused");
    enabled = false;
    stream = false;
    audio16kStream = null;
    stack.length = 0;
  });
}

async function GetAudioStream(video) {
  if (audioContext && preNode) {
    return;
  }
  audioContext = new AudioContext();
  await audioContext.audioWorklet.addModule(URL);
  preNode = new AudioWorkletNode(audioContext, "audiopreprocessor");

  const stream = video.captureStream
    ? video.captureStream()
    : video.mozCaptureStreamUntilEnded();
  console.log(stream);
  if (!video.captureStream) {
    const dest = audioContext.createMediaStreamSource(stream);
    dest.connect(preNode);
    dest.connect(audioContext.destination);
  }

  preNode.connect(audioContext.destination);
  console.log("Listeners linked");
}

async function processQueue() {
  if (transcribing) return;
  if (stack.length <= 0) return;

  transcribing = true;


  const first = stack.shift();

  try {
    const currStream = session.streamimg(first, {
      language: "en",
      threads: 4,
      translate: false,
      sleepMsBetweenChunks: 1000,
    });

    for await (const segment of currStream) {
      console.log(
        `[${segment.timeStart}ms - ${segment.timeEnd}ms]: ${segment.text}`
      );
    }

    transcribing = false;
  } catch (err) {
    console.error(err);
  } finally {

    processQueue();
  }
}

async function StartStreamingTranscription() {
  if (!enabled || !IsFocusedOnVideo()) return;

  const video = GetVideo();
  if (!video) throw new Error("No video element found");

  await GetAudioStream(video);

  if (!preNode) return;

  console.log("Prenode found!");
  preNode.port.onmessage = async (e) => {
    stack.push(e.data);
    processQueue();
  };
}

function IsFocusedOnVideo() {
  return document.visibilityState === "visible" && document.hasFocus();
}

async function Initialize() {
  try {
    console.log("Initializing YoutubeWhisper");
    LoadWhisper();
    await BrowserCompatible();
    await LoadModel(ModelTypes.tiny);
    SetListeners();
  } catch (err) {
    console.error("Initialization failed:", err);
  }
}

Initialize();

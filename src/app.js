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

function LoadWhisper() {
  whisper = new WhisperWasmService({ logLevel: 1 });
  modelManager = new ModelManager();
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
  const video = GetVideo();
  const enableButton = document.getElementById("enableButton");
  video.addEventListener("play", () => {
    console.log("Video playing");
    enabled = true;
    EnabledStateChanged();
  });

  video.addEventListener("pause", () => {
    console.log("Video paused");
    enabled = false;
    EnabledStateChanged();
  });

  enableButton.addEventListener("click", () => {
    console.log("Button clicked!");
  });

  console.log("Listeners linked");
}

function ResampleTo16kHZ(audioData, origSampleRate = 44100) {
  // Convert the audio data to a Float32Array
  const data = new Float32Array(audioData);

  // Calculate the desired length of the resampled data
  const targetLength = Math.round(data.length * (16000 / origSampleRate));

  // Create a new Float32Array for the resampled data
  const resampledData = new Float32Array(targetLength);

  // Calculate the spring factor and initialize the first and last values
  const springFactor = (data.length - 1) / (targetLength - 1);
  resampledData[0] = data[0];
  resampledData[targetLength - 1] = data[data.length - 1];

  // Resample the audio data
  for (let i = 1; i < targetLength - 1; i++) {
    const index = i * springFactor;
    const leftIndex = Math.floor(index).toFixed();
    const rightIndex = Math.ceil(index).toFixed();
    const fraction = index - leftIndex;
    resampledData[i] = data[leftIndex] + (data[rightIndex] - data[leftIndex]) * fraction;
  }

  // Return the resampled data
  return resampledData;
}

async function StartStreamingTranscription() {
  if (!enabled || !IsFocusedOnVideo()) {
    return;
  }

  // get audio data
  const video = GetVideo();
  const audioStream = video.captureStream();
  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);

  const session = whisper.createSession();
  const stream = session.streaming(audioData, {
    language: "en",
    threads: 4,
    translate: false,
    sleepMsBetweenChunks: 100,
  });

  

  for await (const segment of stream) {
    if (!enabled) {
      return;
    }
    console.log(
      `[${segment.timeStart}ms - ${segment.timeEnd}ms]: ${segment.text}`
    );
  }
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
    document.addEventListener("DOMContentLoaded", () => {
      SetListeners();
    });
  } catch (err) {
    console.error("Initialization failed:", err);
  }
}

Initialize();

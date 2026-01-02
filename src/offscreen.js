import { WhisperWasmService, ModelManager } from "@timur00kh/whisper.wasm";
const ModelTypes = {
  tiny: "tiny",
  small: "small",
  base: "base",
  medium: "medium",
  large: "large",
};
let whisper = null;
let modelManager = null;
let session = null;
let transcribing = false;
const currentURL = chrome.runtime.getURL("src/offscreen.html");
const ttsOptions = {
  language: "en",
  threads: 4,
  translate: false,
  sleepMsBetweenChunks: 100,
};
let segments = [];
function LoadWhisper() {
  whisper = new WhisperWasmService({ logLevel: 1 });
  modelManager = new ModelManager();
  session = whisper.createSession();
  console.log(session);
}

async function BrowserCompatible() {
  const isSupported = await whisper.checkWasmSupport();
  if (!isSupported) {
    throw new Error("WebAssembly is not supported");
  } else {
    console.log("Browser compatible with Whisper");
  }
}

/**
 * Captures audio from the active tab in Google Chrome.
 * @returns {Promise<MediaStream>} A promise that resolves with the captured audio stream.
 */
function captureTabAudio() {
  return new Promise((resolve) => {
    chrome.tabCapture.capture(
      {
        audio: true,
        video: false,
      },
      (stream) => {
        resolve(stream);
      }
    );
  });
}

function CleanupAudio() {
  if (preNode) {
    preNode.port.onmessage = null;
    preNode.disconnect();
    preNode = null;
  }

  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }

  if (currentStream) {
    currentStream.getTracks().forEach((track) => {
      track.stop();
      console.log("Stopped track:", track.kind);
    });
    currentStream = null;
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

async function InitAudioWorklet(stream) {
  audioContext = new AudioContext();
  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }

  try {
    await audioContext.audioWorklet.addModule(URL);
    preNode = new AudioWorkletNode(audioContext, "audiopreprocessor");
    const mediaStream = audioContext.createMediaStreamSource(stream);

    mediaStream.connect(preNode);
    preNode.connect(audioContext.destination);
    preNode.port.onmessage = (event) => {
      const data = event.data;
      const audio16k = data; // Float32Array @ 16 kHz
      const wordStream = session.streamimg(audio16k, options);
    };
  } catch (error) {
    console.error("Error initializing AudioWorklet:", error);
    throw error;
  }
}
async function GetAudioData() {
  const stream = await captureTabAudio();
  if (stream) {
    currentStream = stream;
    stream.oninactive = () => {
      CleanupAudio();
      window.close();
    };

    try {
      await InitAudioWorklet(stream);
    } catch (error) {
      console.error("Failed to initialize AudioWorklet:", error);
      return;
    }
  }
}
async function Initialize() {
  try {
    console.log("Initializing YoutubeWhisper");
    LoadWhisper();
    await BrowserCompatible();
    await LoadModel(ModelTypes.tiny);
  } catch (err) {
    console.error("Initialization failed:", err);
  }
}

function handleMessages(message) {
  if (message.type == "VIDEO_PLAY") {
    GetAudioData();
    console.log("VIDEO_PLAY");
  }
}

Initialize();
chrome.runtime.onMessage.addListener(handleMessages);

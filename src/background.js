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
const mockAudioData = new Float32Array(16000);
const ttsOptions = {
  language: "en",
  threads: 4,
  translate: false,
  sleepMsBetweenChunks: 100
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

Initialize();

browser.runtime.onConnect.addListener((port) => {
  if (port.name !== "transcription") return;

  port.onMessage.addListener(async (msg) => {
    if (transcribing) return;
    if (msg.type == "TRANSCRIBE") {
      transcribing = true;
      console.log("Transcribing");
      try {
        const stream = session.streamimg(msg.audioData, ttsOptions);
        console.log("Stream gained");
        for await (const segment of stream) {
        segments.push(segment);
        }
    


      } catch (err) {
        console.log(err);
      }

      console.log("Done transcribing");
    //transcribing = false;
    }
  });
});

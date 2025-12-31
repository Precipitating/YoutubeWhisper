let enabled = false;
let audioContext = null;
let preNode = null;
let stream = null;
let chunks = [];
const URL = browser.runtime.getURL("src/audiopreprocessor.js");
const transcribePort = browser.runtime.connect({ name: "transcription" });

function GetVideo() {
  return document.querySelector("video");
}
function SetListeners() {
  console.log("Setting listeners!");
  const video = GetVideo();
  //const enableButton = document.getElementById("enableButton");
  video.addEventListener("play", async () => {
    console.log("Video playing");
    enabled = true;
    await GetAudioStream(video);
    StartStreamingTranscription();
  });

  video.addEventListener("pause", () => {
    console.log("Video paused");
    enabled = false;
    stream = false;
    audio16kStream = null;
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
    try {
      const dest = audioContext.createMediaStreamSource(stream);
      dest.connect(preNode);
      dest.connect(audioContext.destination);
    } catch {
      console.log("Failed to get audio stream, pause & play again to retry");
      audioContext = null;
      return;
    }
  }

  preNode.connect(audioContext.destination);
  console.log("Listeners linked");
}

async function StartStreamingTranscription() {
  if (!enabled || !IsFocusedOnVideo()) return;

  const video = GetVideo();
  if (!video) throw new Error("No video element found");

  if (!preNode) return;

  console.log("Prenode found!");
  preNode.port.onmessage = async (e) => {
    transcribePort.postMessage({
      type: "TRANSCRIBE",
      audioData: e.data,
    });
  };
}

function IsFocusedOnVideo() {
  return document.visibilityState === "visible" && document.hasFocus();
}

async function Initialize() {
  try {
    SetListeners();
  } catch (err) {
    console.error("Initialization failed:", err);
  }
}

Initialize();

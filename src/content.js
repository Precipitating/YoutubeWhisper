function GetVideo() {
  return document.querySelector("video");
}
function SetListeners() {
  console.log("Setting listeners!");
  const video = GetVideo();
  video.addEventListener("play", () => {
    console.log("Video playing");
    chrome.runtime.sendMessage({ type: "VIDEO_PLAY" });
  });

  video.addEventListener("pause", () => {
    console.log("Video paused");
  });
}

async function Initialize() {
  try {
    SetListeners();
  } catch (err) {
    console.error("Initialization failed:", err);
  }
}

Initialize();


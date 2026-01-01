let creatingOffscreen = null;

async function EnsureOffscreen() {
  const offscreenUrl = chrome.runtime.getURL("build/offscreen.html");

  // Check if offscreen document already exists
  if ("getContexts" in chrome.runtime) {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ["OFFSCREEN_DOCUMENT"],
      documentUrls: [offscreenUrl],
    });

    if (contexts.length > 0) {
      console.log("Offscreen document already exists");
      return;
    }
  } else {
    // Fallback for older Chrome versions
    const clients = await self.clients.matchAll();
    if (clients.some((client) => client.url.includes(chrome.runtime.id))) {
      return;
    }
  }

  // Create offscreen document
  if (!creatingOffscreen) {
    creatingOffscreen = chrome.offscreen.createDocument({
      url: "build/offscreen.html",
      reasons: ["WORKERS"],
      justification:
        "Maintain persistent data structures for extension functionality",
    });

    await creatingOffscreen;
    creatingOffscreen = null;
    console.log("Offscreen document created successfully");
  } else {
    await creatingOffscreen;
  }
}

// Create offscreen on browser startup
chrome.runtime.onStartup.addListener(() => {
  EnsureOffscreen();
  console.log("Extension started, offscreen document ensured");
});

// Create offscreen on extension installation
chrome.runtime.onInstalled.addListener(() => {
  EnsureOffscreen();
  console.log("Extension installed, offscreen document created");
});

// Handle messages (from content script) to ensure offscreen exists
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === "ensure_offscreen") {
    EnsureOffscreen()
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }
});

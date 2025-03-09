document.getElementById("start-btn").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "startClassification" }, (response) => {
    console.log("Start Classification response:", response);
  });
});

document.getElementById("cancel-btn").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "cancelClassification" }, (response) => {
    console.log("Cancel response:", response);
  });
});

document.getElementById("clear-btn").addEventListener("click", () => {
  chrome.runtime.sendMessage(
    { type: "clearClassifiedMessages" },
    (response) => {
      console.log("Clear messages response:", response);
    }
  );
});

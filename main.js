async function suggestMeal() {
  const input = document.getElementById("userInput").value;
  const result = document.getElementById("result");
  const searchBtn = document.getElementById("searchButton");

  if (!input.trim()) {
    result.textContent = "なにか入力してください🍽";
    return;
  }

  result.textContent = "メニューを考えています...🤔";
  searchBtn.disabled = true;

  try {
    const response = await fetch("/.netlify/functions/getMealSuggestion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userInput: input }),
    });

    const data = await response.json();

    if (!response.ok || !data.reply || typeof data.reply !== "string") {
      throw new Error("API応答が不正です");
    }

    const rawReply = data.reply;

    const highlightedReply = rawReply
      .replace(/\u3010主菜\u3011/g, '<span class="highlight-main">【主菜】</span>')
      .replace(/\u3010副菜\u3011/g, '<span class="highlight-side">【副菜】</span>');

    result.innerHTML = highlightedReply;

    const newEntry = {
      input,
      reply: highlightedReply,
      timestamp: new Date().toISOString(),
    };
    let history = [];
    try {
      const saved = localStorage.getItem("mealHistory");
      history = saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.warn("履歴の読み込みに失敗しました", e);
    }
    history.unshift(newEntry);
    history = history.slice(0, 10); // 最新10件まで
    try {
      localStorage.setItem("mealHistory", JSON.stringify(history));
    } catch (e) {
      console.warn("履歴の保存に失敗しました", e);
    }
    renderHistory();
  } catch (error) {
    console.error("エラー発生:", error);
    result.textContent = "エラーが発生しました🥲";
  } finally {
    searchBtn.disabled = false;
  }
}

function clearResult() {
  document.getElementById("userInput").value = "";
  document.getElementById("result").textContent =
    "今日のおすすめメニューを考えます🤔";
}

function renderHistory() {
  const historyList = document.getElementById("history");
  historyList.innerHTML = "";
  try {
    const saved = localStorage.getItem("mealHistory");
    const history = saved ? JSON.parse(saved) : [];
    history.forEach((entry) => {
      const item = document.createElement("div");
      item.className = "history-entry";
      item.innerHTML = `<div class="history-input">▶ ${entry.input}</div><div class="history-reply">${entry.reply}</div>`;
      historyList.appendChild(item);
    });
  } catch (e) {
    console.warn("履歴の表示に失敗しました", e);
  }
}

function clearHistory() {
  localStorage.removeItem("mealHistory");
  renderHistory();
}

document.addEventListener("DOMContentLoaded", () => {
  renderHistory();
  document.getElementById("searchButton").addEventListener("click", suggestMeal);
  document.getElementById("clearButton").addEventListener("click", clearResult);
  document.getElementById("clearHistoryButton").addEventListener("click", clearHistory);
});

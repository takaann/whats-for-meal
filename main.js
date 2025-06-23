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

    const highlightedReply = data.reply
      .replace(/【主菜】/g, '<span class="highlight-main">【主菜】</span>')
      .replace(/【副菜】/g, '<span class="highlight-side">【副菜】</span>');

    result.innerHTML = highlightedReply;

    // 履歴に保存
    const newEntry = {
      input,
      reply: highlightedReply,
      timestamp: new Date().toISOString(),
    };

    const saved = localStorage.getItem("mealHistory");
    let history = saved ? JSON.parse(saved) : [];

    history.unshift(newEntry); // 先頭に追加
    history = history.slice(0, 10); // 最大10件
    localStorage.setItem("mealHistory", JSON.stringify(history));

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

  const saved = localStorage.getItem("mealHistory");
  const history = saved ? JSON.parse(saved) : [];

  history.forEach((entry, index) => {
    const item = document.createElement("div");
    item.className = "history-entry";
    item.innerHTML = `
      <div class="history-input">▶ ${entry.input}</div>
      <div class="history-reply">${entry.reply}</div>
      <button class="delete-btn" data-index="${index}">✕ 削除</button>
    `;
    historyList.appendChild(item);
  });

  // 削除ボタンのイベントを後から設定
  const deleteButtons = document.querySelectorAll(".delete-btn");
  deleteButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const index = e.target.getAttribute("data-index");
      deleteHistoryItem(index);
    });
  });
}

function deleteHistoryItem(index) {
  const saved = localStorage.getItem("mealHistory");
  let history = saved ? JSON.parse(saved) : [];

  history.splice(index, 1); // 指定インデックスを削除
  localStorage.setItem("mealHistory", JSON.stringify(history));

  renderHistory(); // 再描画
}

document.addEventListener("DOMContentLoaded", () => {
  renderHistory();
  document
    .getElementById("searchButton")
    .addEventListener("click", suggestMeal);
  document
    .getElementById("clearButton")
    .addEventListener("click", clearResult);
});

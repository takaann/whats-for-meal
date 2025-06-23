// 🍽 ユーザーの入力からおすすめメニューを取得・表示する関数
async function suggestMeal() {
  // ユーザーの入力欄から値を取得
  const input = document.getElementById("userInput").value;
  const calorie = document.getElementById("calorieInput").value;
  // 結果表示用のDOM要素を取得
  const result = document.getElementById("result");
  // 検索ボタンのDOM要素を取得
  const searchBtn = document.getElementById("searchButton");

  // 入力が空かスペースのみなら警告文を表示して終了
  if (!input.trim()) {
    result.textContent = "なにか入力してください🍽";
    return;
  }

  // 処理中のメッセージ表示
  result.textContent = "メニューを考えています...🤔";
  // ボタンを一時的に無効化（連打防止）
  searchBtn.disabled = true;

  try {
    // Netlify Functions のエンドポイントに POST リクエストを送信
    const response = await fetch("/.netlify/functions/getMealSuggestion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userInput: input, calorieLimit: calorie }), // 入力データをJSON形式で送信
    });

    // 応答をJSONとしてパース
    const data = await response.json();

    // エラー処理：レスポンスが不正または reply プロパティが無い場合
    if (!response.ok || !data.reply || typeof data.reply !== "string") {
      throw new Error("API応答が不正です");
    }

    // レスポンスのテキストに含まれる【主菜】【副菜】をHTMLで強調表示
    const highlightedReply = data.reply
      .replace(/【主菜】/g, '<span class="highlight-main">【主菜】</span>')
      .replace(/【副菜】/g, '<span class="highlight-side">【副菜】</span>');

    // 結果を表示エリアにHTMLとして出力（装飾あり）
    result.innerHTML = highlightedReply;

    // 🌟 履歴データの構築
    const newEntry = {
      input,                      // 入力内容
      reply: highlightedReply,   // 強調済み返信
      timestamp: new Date().toISOString(), // タイムスタンプ
    };

    // localStorageから履歴を取得（存在しなければ空配列）
    const saved = localStorage.getItem("mealHistory");
    let history = saved ? JSON.parse(saved) : [];

    // 新しい履歴を先頭に追加
    history.unshift(newEntry);
    // 履歴は最大10件までに制限
    history = history.slice(0, 10);
    // localStorageに履歴を保存
    localStorage.setItem("mealHistory", JSON.stringify(history));

    // 履歴を画面に再描画
    renderHistory();
  } catch (error) {
    // 通信失敗時などのエラー表示
    console.error("エラー発生:", error);
    result.textContent = "エラーが発生しました🥲";
  } finally {
    // ボタンを再度有効化
    searchBtn.disabled = false;
  }
}

// 🔄 入力欄・結果欄をリセットする処理
function clearResult() {
  document.getElementById("userInput").value = ""; // 入力欄を空に
  document.getElementById("result").textContent =
    "今日のおすすめメニューを考えます🤔"; // 初期メッセージに戻す
}

// 📜 履歴一覧を画面に表示する関数
function renderHistory() {
  const historyList = document.getElementById("history"); // 履歴表示エリア
  historyList.innerHTML = ""; // 一旦中身を空にする（再描画のため）

  // localStorageから履歴を取得（なければ空配列）
  const saved = localStorage.getItem("mealHistory");
  const history = saved ? JSON.parse(saved) : [];

  // 履歴の1件ずつをHTMLとして描画
  history.forEach((entry, index) => {
    const item = document.createElement("div");
    item.className = "history-entry"; // スタイル用クラス
    item.innerHTML = `
      <div class="history-input">▶ ${entry.input}</div>
      <div class="history-reply">${entry.reply}</div>
      <button class="delete-btn" data-index="${index}">✕ 削除</button>
    `;
    historyList.appendChild(item);
  });

  // 🗑 削除ボタンのクリックイベントを設定
  const deleteButtons = document.querySelectorAll(".delete-btn");
  deleteButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const index = e.target.getAttribute("data-index");
      deleteHistoryItem(index); // 指定インデックスの履歴を削除
    });
  });
}

// 🗑 指定インデックスの履歴を削除して保存しなおす
function deleteHistoryItem(index) {
  const saved = localStorage.getItem("mealHistory");
  let history = saved ? JSON.parse(saved) : [];

  history.splice(index, 1); // 該当の履歴1件を削除
  localStorage.setItem("mealHistory", JSON.stringify(history)); // 更新保存

  renderHistory(); // 履歴を再描画
}

// 🏁 ページ読み込み完了時の初期設定
document.addEventListener("DOMContentLoaded", () => {
  renderHistory(); // 初回履歴描画
  document
    .getElementById("searchButton")
    .addEventListener("click", suggestMeal); // 検索ボタン設定
  document
    .getElementById("clearButton")
    .addEventListener("click", clearResult); // クリアボタン設定
});

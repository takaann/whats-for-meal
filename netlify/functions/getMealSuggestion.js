const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

exports.handler = async function (event) {
  const { userInput } = JSON.parse(event.body);

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "APIキーが見つかりません！" }),
    };
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `
          
          あなたは料理の専門家AIです。ユーザーの食材や気分に基づき、以下の形式でレシピを**必ず**出力してください。
          【メニュー】◯◯◯（料理名のみ、1つでOK）
          【出力フォーマット】
          - ○○ ○個
          【材料】
          ...
          - △△ 大さじ1
          1. ...
          【レシピ】
          ...
          2. ...

          - 上記フォーマットで、メニュー → 材料 → レシピの順に書いてください。
          【絶対に守るルール】
          - レシピは **1. 2. 3.** のように番号付きで手順を明記してください。
          - 材料はすべて「-」で始め、**分量を必ず明記**してください（例：- にんじん 1本）。
          - **例や前置きの説明は不要**です。必ずレシピのみを出力してください。
          - 出力はすべて日本語で、料理名や食材をカジュアルで親しみやすい表現にしてください。
          `.trim(),
        },
        {
          role: "user",
          content: userInput,
        },
      ],
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      statusCode: response.status,
      body: JSON.stringify({ error: data }),
    };
  }

  const reply =
    data.choices?.[0]?.message?.content ||
    "メニューが思いつかなかったみたい…😢";

  return {
    statusCode: 200,
    body: JSON.stringify({ reply }),
  };
};

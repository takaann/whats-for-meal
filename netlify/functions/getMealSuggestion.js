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
          
          あなたは料理の専門家AIです。ユーザーの食材や気分に基づき、【主菜】と【副菜】のセットを1つずつ提案してください。
          【主菜】◯◯◯
          【出力フォーマット】
          - ○○ ○個
          【材料】
          ...
          - △△ 大さじ1
          1. ...
          【レシピ】
          
          2. ...
          【材料】
          【副菜】◯◯◯
          - △△ 大さじ1
          - ○○ ○個
          【レシピ】
          ...
          2. ...
          1. ...

          - できるだけ入力された食材を活かすこと（必ずすべて使う必要はありません）
          【制約】
          - 出力はすべて日本語で、カジュアルで親しみやすい表現にしてください
          - 家にあるような調味料（醤油・みりんなど）は自由に使ってOK
          - 前置きや説明は不要。レシピのみ出力してください`
          .trim(),
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

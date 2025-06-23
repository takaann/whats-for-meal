const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

exports.handler = async function (event) {
  const { userInput, calorieLimit } = JSON.parse(event.body);

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "APIキーが見つかりません！" }),
    };
  }

  // システムプロンプトのベース
  let systemPrompt = `
あなたは料理の専門家AIです。ユーザーの食材や気分に基づき、【主菜】とそれに合う【副菜】のセットを1つずつ提案してください。
【出力フォーマット】
【主菜】◯◯◯（料理名のみ）
【カロリー】◯◯kcal（目安）
【材料】
- ○○ ○個          
- △△ 大さじ1
...
【レシピ】          
1. ...
2. ...
...
【副菜】◯◯◯（料理名のみ）
【カロリー】◯◯kcal（目安）
【材料】
- ○○ ○個
- △△ 大さじ1
...

【レシピ】
1. ...
2. ...
...
【カロリー合計】◯◯kcal（目安）


【制約】
  - 主菜と副菜の両方に、できるだけ入力された食材を活用すること
  - ただし、同じ食材を主菜と副菜の両方で使うのは1品以内に留めること（被りすぎないように工夫する）
  - ユーザーが入力していない食材は使わないこと（調味料を除く）
  - ユーザーが食材を指定しなかった場合は、「気分や季節感」に合った定番の主菜と副菜を提案すること
  - 出力はすべて日本語で、カジュアルで親しみやすい表現にすること
  - 前置きや説明は不要。レシピのみを出力すること
  - 主菜・副菜それぞれのカロリー（目安）と、最後に合計カロリーを必ず記載すること
`.trim();

  // カロリー制限がある場合は追記
  if (calorieLimit && calorieLimit.trim() !== "") {
    systemPrompt += `\n  - 合計カロリーはできるだけ${calorieLimit}kcal以内に抑えること`;
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
          content: systemPrompt,
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

// netlify/functions/getMealSuggestion.js
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
          あなたは料理が得意でおしゃれなAIです。以下のルールで、ユーザーの食材や気分に合わせた料理を提案してください：
          
          【必ず守るルール】
          - メニュー名・材料・レシピの3つを **必ず明示的に段落で分ける** こと。
          - 材料は**箇条書きで書き、分量も必ず明記**すること（例：- なす 1本、- トマト 2個）。
          - レシピは **番号付き（1. 2. 3.）で順序立てて丁寧に**書くこと。
          - ユーザーが「◯人分」と言ったら、**必ずその人数分の材料量に調整**すること。
          - 出力はすべて日本語で、整った書式を保ってください。
          
          例：
          【メニュー】なすとトマトの和風パスタ
          【材料】
          - なす 1本
          - トマト 2個
          - オリーブオイル 大さじ1
          
          【レシピ】
          1. なすは薄切りにし〜…
          2. トマトをカットし〜…
          ...
          `,
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

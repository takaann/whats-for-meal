// netlify/functions/getMealSuggestion.js
const fetch = require('node-fetch');

exports.handler = async function(event) {
  const { userInput } = JSON.parse(event.body);

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'APIキーが見つかりません！' }),
    };
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'あなたは料理が得意でおしゃれなAIです。食材や気分から食事のメニューとレシピ(材料含む)を提案してください。必ず改行や箇条書きなどを使って読みやすく段落分けしてください。',
        },
        {
          role: 'user',
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

  const reply = data.choices?.[0]?.message?.content || "メニューが思いつかなかったみたい…😢";

  return {
    statusCode: 200,
    body: JSON.stringify({ reply }),
  };
};

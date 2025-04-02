// netlify/functions/getMealSuggestion.js
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

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
          content: 'あなたは料理が得意でおしゃれなAIです。食材や気分から食事のメニューとレシピ(材料含む)を提案してください。メニュー名・材料・レシピを**必ず明示し、区別できるように**出力してください。'
        },
        {
          role: 'user',
          content: userInput,
        },
      ],
    })
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      statusCode: response.status,
      body: JSON.stringify({ error: data }),
    };
  }

  const raw = data.choices?.[0]?.message?.content || 'メニューが思いつかなかったみたい…\ud83d\ude2d';

  const formatReply = (text) => {
    const lines = text.trim().split('\n');
    let result = '';

    const firstLine = lines[0]?.trim();
    let menuName = '';
    if (firstLine) {
      menuName = firstLine.replace(/^[#\uff0a*]+/, '')
                          .replace(/^メニュー[:：]?\s*/, '')
                          .replace(/^名[:：]?\s*/, '')
                          .trim();
      result += `<div class="menu-title">🍽 メニュー<br>${menuName}</div>\n`;
      lines.shift();
    }

    const bodyText = lines.join('\n');

    const materialPattern = /(?:###\s*|[*\uff0a]{2})?材料[:：]?\s*([\s\S]*?)(?=\n(?:###\s*|[*\uff0a]{2})?レシピ|$)/i;
    const materialMatch = bodyText.match(materialPattern);
    if (materialMatch) {
      result += `<div class="ingredients"><strong>材料</strong><br>${materialMatch[1].trim().replace(/\n/g, '<br>')}</div>\n`;
    }

    const recipePattern = /(?:###\s*|[*\uff0a]{2})?レシピ[:：]?\s*([\s\S]*)/i;
    const recipeMatch = bodyText.match(recipePattern);
    if (recipeMatch) {
      result += `<div class="recipe"><strong>レシピ</strong><br>${recipeMatch[1].trim().replace(/\n/g, '<br>')}</div>\n`;
    }

    return result;
  };

  return {
    statusCode: 200,
    body: JSON.stringify({ reply: formatReply(raw) }),
  };
};

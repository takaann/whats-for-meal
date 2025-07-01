const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

exports.handler = async function (event) {
  const { userInput, calorieLimit, allergies = []} = JSON.parse(event.body);
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "APIキーが見つかりません！" }),
    };
  }

  // 📌 ベースプロンプト
  let systemPrompt = `
あなたは料理の専門家AIです。ユーザーの食材や気分に基づき、【主菜】とそれに合う【副菜】のセットを1つずつ提案してください。

【出力フォーマット】
【主菜】◯◯◯（料理名のみ）
【カロリー】◯◯kcal（目安）
【材料】
- 食材名と分量を、すべて記載（調味料も含めること）
【レシピ】
1. 手順を省略せず、わかりやすくすべて記載すること
2. 簡潔に箇条書き形式で表現すること

【副菜】◯◯◯（料理名のみ）
【カロリー】◯◯kcal（目安）
【材料】
- 食材名と分量を、できる限りすべて記載（調味料も含めること）
【レシピ】
1. 手順を省略せず、わかりやすくすべて記載すること
2. 簡潔に箇条書き形式で表現すること

【カロリー合計】◯◯kcal（目安）

【制約】
- 主菜と副菜の両方に、できるだけ入力された食材を活用すること
- 同じ食材を主菜と副菜の両方で使うのは1品以内に留めること
- ユーザーが入力していない食材は使わないこと（調味料を除く）
- ユーザーが食材を指定しなかった場合は、「気分や季節感」に合った定番の主菜と副菜を提案すること
- ユーザーの入力が曖昧な場合（例：「暑い」など）、気温や季節感を想定して適切な定番メニューを提案すること
- レシピの前に、ユーザーの気分や体調に対する共感コメントを1文だけ添えること
- 栄養バランスを考えて提案すること（たんぱく質、食物繊維、ビタミンなど）
- 出力はすべて日本語で、カジュアルで親しみやすい表現にすること
- 主菜・副菜それぞれのカロリー（目安）と、最後に合計カロリーを必ず記載すること
`.trim();

  if (calorieLimit && calorieLimit.trim() !== "") {
    systemPrompt += `\n- 合計カロリーはできるだけ${calorieLimit}kcal以内に抑えること`;
  }

  if (allergies && Array.isArray(allergies) && allergies.length > 0) {
    const allergensList = allergies.join("、");
    systemPrompt += `
【アレルゲン情報】
- ユーザーは以下の食材にアレルギーがあります：${allergensList}

【アレルゲン制約】
- 以下のアレルゲンを含む食材を一切使用しないこと：${allergensList}
- 提案文の**最初の一文目**に必ず「特定のアレルゲン（${allergensList}）を除外しました。」と書くこと。絶対に省略してはいけません。
- これはルールです。ルール違反の回答は無効とみなします。
`;
  }

  // 🔍 材料欄だけ抽出してアレルゲンを検出
  const extractIngredients = (text) => {
    const matches = [...text.matchAll(/【材料】([\s\S]*?)【レシピ】/g)];
    return matches.map((m) => m[1]).join("\n").toLowerCase();
  };

  const containsAllergen = (text, allergens) => {
    const ingredients = extractIngredients(text);
    return allergens?.some((a) =>
      ingredients.includes(a.toLowerCase())
    );
  };

  const startsWithAllergenNotice = (text, allergens) => {
    const expected = `特定のアレルゲン（${allergens.join("、")}）を除外しました。`;
    return text.trim().startsWith(expected);
  };

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        temperature: 0.3,
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

    if (!response.ok || data.error) {
      return {
        statusCode: response.status || 500,
        body: JSON.stringify({
          error: data.error?.message || "OpenAI APIからの応答に失敗しました。",
        }),
      };
    }

    const content = data.choices?.[0]?.message?.content;

    if (!content || typeof content !== "string" || content.trim() === "") {
      return {
        statusCode: 200,
        body: JSON.stringify({
          reply: "条件が厳しくて、レシピが見つからなかったみたい…😢 入力内容をもう一度見直してみてね。",
        }),
      };
    }

    if (allergies.length > 0) {
      if (!startsWithAllergenNotice(content, allergies)) {
        return {
          statusCode: 200,
          body: JSON.stringify({
            reply: "アレルゲン除外の明記が出力されていなかったため、生成を中止しました。もう一度お試しください。",
          }),
        };
      }

      if (containsAllergen(content, allergies)) {
        return {
          statusCode: 200,
          body: JSON.stringify({
            reply: "アレルゲンが含まれてしまったレシピが生成されたため、出力をキャンセルしました。もう一度お試しください。",
          }),
        };
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ reply: content }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "通信中にエラーが発生しました。" }),
    };
  }
};

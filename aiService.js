// aiService.js
const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Send the user's question and the full student dataset to the LLM.
 * The prompt instructs the LLM to strictly use provided JSON data.
 */
async function chatWithLLM(userMessage, studentsJson) {
  const systemPrompt = `
You are a data analysis assistant. You must answer strictly based on the provided student JSON data.
Rules:
- If a requested field is not present in the data, say it's not available.
- For counts, compute exactly from the dataset.
- For lists, return only the exact matching records from the dataset.
- If the dataset is empty, say so.
- If asked for "average age" but age isn't in the data, state that age is not available.
- Consider synonyms: BS Information Systems = BSIS, BS Computer Science = BCS, etc., only if exactly present in data.
- Output concise, accurate answers. If the question is unclear, ask a brief clarifying question.
`;

  const userPrompt = `
Here is the full student dataset (JSON):
${JSON.stringify(studentsJson, null, 2)}

User question:
${userMessage}
`;

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt.trim() },
      { role: "user", content: userPrompt.trim() },
    ],
    temperature: 0.2,
    max_tokens: 600,
  });

  return response.choices?.[0]?.message?.content || "";
}

module.exports = { chatWithLLM };

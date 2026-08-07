/**
 * Firebase Cloud Function for GenUI – Secure LLM API Relay
 */

const functions = require("firebase-functions");
const axios = require("axios");

const SYSTEM_PROMPT = `You are the Generative UI planning engine.
Your task is to convert natural-language application requirements into a structured JSON UI schema.
You must ONLY return valid JSON. No conversational text, no markdown.

You may use ONLY these component types:
card, metric, chart, table, form, button, progress, timeline

Never generate HTML.
Never generate CSS.
Never generate JavaScript code.
Never execute code.
Return ONLY the JSON schema.`;

exports.generateUISchema = functions.https.onCall(async (data, context) => {
  // Enforce authentication if required
  const userPrompt = data.prompt;
  const existingSchema = data.existingSchema || null;

  if (!userPrompt) {
    throw new functions.https.HttpsError("invalid-argument", "The 'prompt' field is required.");
  }

  const apiKey = process.env.GEMINI_API_KEY || functions.config().gemini?.key;
  if (!apiKey) {
    throw new functions.https.HttpsError("failed-precondition", "GEMINI_API_KEY environment variable is not configured.");
  }

  const fullPrompt = existingSchema
    ? `EXISTING SCHEMA:\n${JSON.stringify(existingSchema)}\n\nMODIFICATION REQUIREMENT:\n${userPrompt}`
    : `USER REQUIREMENT:\n${userPrompt}`;

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        contents: [
          { role: "user", parts: [{ text: `${SYSTEM_PROMPT}\n\n${fullPrompt}` }] }
        ],
        generationConfig: { responseMimeType: "application/json", temperature: 0.2 }
      }
    );

    const resultText = response.data.candidates[0].content.parts[0].text;
    return { status: "success", jsonSchemaText: resultText };
  } catch (error) {
    console.error("Gemini API call error:", error.response?.data || error.message);
    throw new functions.https.HttpsError("internal", "Failed to communicate with LLM API.");
  }
});

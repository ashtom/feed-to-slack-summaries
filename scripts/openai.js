// Example code from github.com/models
import OpenAI from "openai";
import core from "@actions/core";

const token = process.env["GITHUB_TOKEN"]; // REFERENCE ENV FROM WORKFLOW
const endpoint = "https://models.inference.ai.azure.com";
const modelName = "gpt-4o"; // CHANGE OPENAI MODEL AS YOU SEE GIT

export async function makeCompletion(systemPrompt, prompt) {
  if (!token) {
    core.setFailed("PAT_TOKEN is missing.");
    throw new Error("Missing PAT_TOKEN");
  }

  const client = new OpenAI({ baseURL: endpoint, apiKey: token.replace(/^\s+|\s+$/g, '') });

  const response = await client.chat.completions.create({
    model: modelName,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt }
    ]
  });

  const content = response.choices?.[0]?.message?.content;
  if (!content) {
    core.setFailed("No content returned from model.");
    throw new Error("Empty response from model");
  }

  return content;
}

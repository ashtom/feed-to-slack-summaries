// Example code from github.com/models
import OpenAI from "openai";
import * as core from "@actions/core";

const token = process.env["GITHUB_TOKEN"]; // REFERENCE ENV FROM WORKFLOW
const endpoint = "https://models.github.ai/inference";
const modelName = "openai/gpt-5-mini"; // CHANGE OPENAI MODEL AS YOU SEE GIT

export async function makeCompletion(systemPrompt, prompt) {
  if (!token) {
    core.setFailed("GITHUB_TOKEN is missing (set from PAT_TOKEN in workflow). ");
    throw new Error("Missing GITHUB_TOKEN");
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

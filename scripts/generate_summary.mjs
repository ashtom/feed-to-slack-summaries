import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import core from '@actions/core';
import { makeCompletion } from './openai.js';
import { formatNewsPrompt } from './prompt.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputPath = process.argv[2];
if (!inputPath) {
  core.setFailed("Usage: node generate_summary.mjs <input_json_file>");
  process.exit(1);
}

function isValidUrl(u) {
  try {
    const parsed = new URL(u);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

// Example Slack Block
// Go to https://api.slack.com/block-kit/building to create you personalized block
function createSlackBlock({ title, url, source, why, highlight }) {
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${source}:* <${url}|*${title}*>`
      }
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Why it Matters:* ${why}`
      }
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Highlight:* _${highlight}_`
      }
    },
    { type: "divider" }
  ];
}

const today = new Date().toLocaleDateString("en-US", {
  month: "long", day: "numeric", year: "numeric"
});

// Load and filter articles
let articles;
try {
  const raw = fs.readFileSync(inputPath, 'utf-8');
  articles = JSON.parse(raw);

  const now = new Date(Date.now());
  const maxAgeHours = 36; // Currently set for max hour of 36
  articles = articles.filter(a => {
    const pubDate = new Date(a.published || a.publishedAt || a.date || a.timestamp || a.created_at);
    const ageInHours = (now - pubDate) / (1000 * 60 * 60);
    return !isNaN(ageInHours) && ageInHours <= maxAgeHours && isValidUrl(a.url);
  });
} catch (err) {
  core.setFailed("Invalid JSON input: " + err.message);
  process.exit(1);
}

// Updated system prompt for per-article summarization
const systemPrompt = `
You are an AI assistant that summarizes technology news articles for developers and product teams.

Return a single valid JSON object with the following keys:
- "title" (string): The title of the article
- "url" (string): The original URL
- "source" (string): The news source
- "why" (string): A 25–50 word summary explaining the importance or relevance of this article
- "highlight" (string): An 80–110 word summary with key quotes, stats, or product details

DO NOT include:
- Code blocks (e.g., triple backticks)
- Markdown formatting
- Any other text — only return raw, valid JSON

Prioritize:
- Articles about developer tools, AI, product launches, and infrastructure
- Content from trusted sources (e.g., TechCrunch, Wired, Bloomberg, The Verge, Axios, MIT Tech Review)

If the article is off-topic or unrelated to tech/AI/development, summarize it factually without overstating its importance.
`;

async function main() {
  core.info("Summarizing articles individually...");
  core.info(`Loaded ${articles.length} articles from input.json`);
  const summaries = [];
  let idx = 0;

  while (summaries.length < 5 && idx < articles.length) {
    const article = articles[idx++];
    const prompt = formatNewsPrompt(article);
    core.info(`Summarizing: ${article.title}`);

    let raw;
    try {
      raw = await makeCompletion(systemPrompt, prompt);
    } catch (err) {
      core.warning(`Failed to generate summary for: ${article.title} → ${err.message}`);
      continue;  // Skip to next article
    }

    try {
      const clean = raw.trim().replace(/^```(?:json)?\n?|```$/g, "");
      const parsed = JSON.parse(clean);
      summaries.push(parsed);
    } catch (e) {
      core.warning(`Failed to parse summary for: ${article.title} → ${e.message}`);

      const safeTitle = article.title.replace(/[^a-z0-9]/gi, "_").slice(0, 50);
      fs.writeFileSync(`debug_failed_${safeTitle}.json`, raw);

      continue;  // Skip to next article
    }
  }

  const allBlocks = summaries.flatMap(item => createSlackBlock(item));
  const slackTitle = `📰 *Daily Top 5 – ${today}* 📰`;

  const today = new Date().toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric"
  });

  const threadReplyPayload = {
    channel: process.env.CHANNEL_ID,
    text: slackTitle
    blocks: allBlocks,
    unfurl_links: false,
    unfurl_media: false
  };

  const parentPayload = {
    channel: process.env.CHANNEL_ID,
    text: slackTitle
  };

  fs.writeFileSync("thread_reply_payload.json", JSON.stringify(threadReplyPayload, null, 2));
  fs.writeFileSync("parent_payload.json", JSON.stringify(parentPayload, null, 2));

  core.info("Saved parent_payload.json and thread_reply_payload.json");
}

main();

# 📰 feed-to-slack-summaries

This project automates the process of delivering high-quality tech and AI news summaries to Slack. It fetches articles from 30+ curated RSS feeds, filters and ranks them using customizable keywords, summarizes them using an LLM (e.g., OpenAI), and posts a clean daily digest directly into a Slack channel. Currently set to post the top 5 daily AI news articles in a thread to Slack.

---

## 🚀 Features

- **Automated Summaries via GitHub Actions**  
  Runs daily (Mon–Fri) at 9AM PT by default.

- **Curated RSS Feed Processing**  
  Pulls news from top sources like TechCrunch, Bloomberg, Wired, Axios, and CNBC

- **Keyword-Based Filtering**  
  Prioritizes articles on developer tools, AI, product launches, and infrastructure.

- **AI-Powered Summarization**  
  Uses OpenAI or other LLMs to generate:
  - **Why it Matters** (A 25–50 word summary explaining the importance or relevance of this article)
  - **Highlight** (An 80–110 word summary with key quotes, stats, or product details)

- **Slack Integration**  
  Sends the top 5 summaries to a Slack channel in a well-formatted thread.

- **Extensible & Customizable**  
  Keywords, scheduling, and sources can all be configured.

---
## 🛠️ Setup
Install Dependencies
```bash
npm install
```
**Add Secrets (for GitHub Actions)**
Go to your GitHub repo settings and add the following repository secrets:
- **PAT_TOKEN** — your Personal Access Token (GitHub) or OpenAI key
- **BOT_TOKEN** — for Slack API access
- **CHANNEL_ID** — the ID of the target Slack channel

## Customize Keywords & Feeds
Edit scripts/rules_for_articles.py to change the keyword filters or feed URLs to better match your use case.

## 🤖 How It Works
- Fetches articles from RSS feeds
- Filters them based on freshness and relevance
- Uses OpenAI to generate summaries using a structured system prompt
- Formats them with Slack Block Kit
- Posts to Slack (parent message + threaded replies)

## 📁 Output Files
1. parent_payload.json — Slack message block with title
2. thread_reply_payload.json — Slack blocks for each article (posted in a thread)

These files are used by GitHub Actions to send the content to Slack.

## 📄 License
MIT — feel free to use, modify, or extend this project for your own workflows.

## 🙌 Contributing
Pull requests are welcome! Feel free to open issues or suggest improvements.

## 🌐 Example Use Cases
Team-wide daily news digests

Executive summaries on AI product launches

Developer-centric industry monitoring

Summarizing research papers from sources like arXiv

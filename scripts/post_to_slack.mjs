import fs from 'fs';
import { WebClient } from '@slack/web-api';
import core from '@actions/core';

const token = process.env.BOT_TOKEN; // REFERENCE WORKFLOW FILE FOR NAME OF ENV
const channel = process.env.CHANNEL_ID; // REFERENCE WORKFLOW FILE FOR NAME OF ENV
const thread_ts = process.env.SLACK_THREAD_TS;
const payloadPath = "thread_reply_payload.json";

if (!token || !channel || !thread_ts) {
  core.setFailed("Missing one or more required environment variables: BOT_TOKEN, CHANNEL_ID, SLACK_THREAD_TS");
  process.exit(1);
}

let payload;
try {
  payload = JSON.parse(fs.readFileSync(payloadPath, "utf-8"));
} catch (err) {
  core.setFailed("Failed to read or parse Slack payload file: " + err.message);
  process.exit(1);
}

const slack = new WebClient(token);

async function postToSlack() {
  try {
    const res = await slack.chat.postMessage({
      channel,
      thread_ts,
      ...payload
    });
    core.info(`Successfully posted Slack message to thread_ts=${thread_ts}`);
    core.info(JSON.stringify(res, null, 2));
    core.info('Posted blocks:');
    core.info(JSON.stringify(payload.blocks, null, 2));
  } catch (err) {
    core.setFailed("Slack API call failed: " + err.message);
  }
}

postToSlack();

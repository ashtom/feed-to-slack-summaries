import feedparser
from datetime import datetime, timedelta
import json
import os
from newspaper import Article
from difflib import SequenceMatcher

# Filtering rules

# Update Keywords as you see fit
KEYWORDS = [
    "Github", "Anthropic", "Cursor", "Claude", "GPT", "OpenAI", "AI", "AWS", "Amazon", "Developers", "AI Agents",
    "Tariffs", "Global Affairs", "Microsoft", "Nvidia", "Technology", "Europe", "Computers", "Google Gemini", "RAG", 
    "LLMs", "xAI", "Elon Musk", "ChatGPT", "Gemini", "Mistral", "Open Source AI"
]

# Update publications as you see fit
PUBLICATIONS = [
    "TechCrunch", "Axios", "InformationWeek", "Time", "SiliconANGLE", "CNBC", "Quartz", "Wall Street Journal",
    "Eurasianet", "Fortune", "New York Times", "CBS News", "Politico", "Wired", "VentureBeat",
    "Bloomberg", "The Guardian", "BBC", "Deadline", "The Atlantic", "The Verge", "Vulture",
    "Reuters", "NPR", "The Information"
]

# Update RSS Feeds as you see fit
RSS_FEEDS = [
    "https://techcrunch.com/feed/",
    "http://www.axios.com/feeds/feed.rss",
    "https://feeds.feedburner.com/Informationweek-AllStories",
    "https://time.com/feed/",
    "https://siliconangle.com/feed/",
    "https://www.cnbc.com/id/100003114/device/rss/rss.html",
    "https://qz.com/rss",
    "https://www.wsj.com/xml/rss/3_7085.xml",
    "https://eurasianet.org/taxonomy/term/34/all/feed",
    "https://fortune.com/feed/",
    "https://rss.nytimes.com/services/xml/rss/nyt/Movies.xml",
    "https://www.cbsnews.com/latest/rss/",
    "http://rss.nytimes.com/services/xml/rss/nyt/Technology.xml",
    "http://www.politico.com/rss/politicopicks.xml",
    "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
    "http://feeds.nytimes.com/nyt/rss/HomePage",
    "http://feeds.wired.com/wired/index",
    "https://venturebeat.com/feed/",
    "https://www.bloomberg.com/feeds/bbizdaily.xml",
    "https://www.theguardian.com/world/rss",
    "http://feeds.bbci.co.uk/news/rss.xml",
    "https://deadline.com/feed/",
    "https://www.theatlantic.com/feed/all/",
    "https://www.theverge.com/rss/index.xml",
    "https://www.vulture.com/rss/",
    "https://www.reuters.com/rssFeed/topNews",
    "https://www.npr.org/rss/rss.php",
    "https://www.theinformation.com/rss"
]

def is_similar(a, b, threshold=0.7):
    return SequenceMatcher(None, a.lower(), b.lower()).ratio() > threshold

def deduplicate_articles(articles):
    unique = []
    for article in articles:
        if all(
            not is_similar(article["title"], existing["title"]) and
            not is_similar(article.get("content", ""), existing.get("content", ""))
            for existing in unique
        ):
            unique.append(article)
    return unique

# Currently set for 24 hours time window 
def fetch_articles(time_window_hours=24):
    seen_sources = set()
    articles = []
    now = datetime.utcnow()
    since = now - timedelta(hours=time_window_hours)

    for url in RSS_FEEDS:
        print(f"Fetching: {url}")
        feed = feedparser.parse(url)
        if feed.bozo or not feed.entries:
            print(f"  Skipped: {url} (bozo error or no entries)")
            continue

        for entry in feed.entries:
            published = entry.get("published_parsed")
            if not published:
                continue
            pub_date = datetime(*published[:6])
            if pub_date < since:
                continue

            title = entry.get("title", "")
            rss_summary = entry.get("summary", "")
            link = entry.get("link", "")
            if not link:
                continue

            if not any(kw.lower() in title.lower() for kw in KEYWORDS) and not any(kw.lower() in rss_summary.lower() for kw in KEYWORDS):
                continue

            source = url.split("//")[-1].split("/")[0].replace("www.", "")
            if not any(pub.lower() in source.lower() for pub in PUBLICATIONS):
                continue

            try:
                article_obj = Article(link)
                article_obj.download()
                article_obj.parse()
                full_text = article_obj.text
            except Exception as e:
                print(f"  Failed to scrape {link}: {e}")
                full_text = rss_summary

            if not full_text or len(full_text) < 100:
                continue

            articles.append({
                "title": title,
                "content": full_text[:8000],  # Trimmed for token safety
                "url": link,
                "source": source,
                "published": pub_date.isoformat()
            })

            seen_sources.add(source)

            if len(articles) >= 20:
                break  # Exit inner loop over feed entries

        if len(articles) >= 20:
            break  # Exit outer loop over feeds

    articles = deduplicate_articles(articles)
    print(f"🔎 Deduplicated to {len(articles)} articles")

    # Scoring function for more specific articles from a publication if wanted 
    def score_article(article):
        title = article["title"].lower()
        content = article["content"].lower()

        source_bonus = 3 if article["source"] in [
            "techcrunch.com", "cnbc.com", "axios.com", "siliconangle.com", "venturebeat.com"
        ] else 0

        launch_keywords = ["launch", "rolls out", "announces", "introduces", "unveils", "update", "beta", "developer preview", "API", "version", "preview"]
        ai_entities = ["openai", "github", "gemini", "copilot", "gpt", "anthropic", "claude", "cursor", "microsoft", "xai", "perplexity", "deepmind", "hugging face", "rag"]
        metric_keywords = ["users", "weekly", "monthly", "million", "billion", "growth", "adoption", "usage"]
        controversy_keywords = ["accused", "lawsuit", "ban", "block", "restrict", "scraping", "court", "investigation"]

        score = (
            source_bonus +
            sum(1 for kw in launch_keywords if kw in title or kw in content) +
            sum(1 for kw in ai_entities if kw in title or kw in content) +
            sum(1 for kw in metric_keywords if kw in title or kw in content) +
            sum(1 for kw in controversy_keywords if kw in title or kw in content)
        )
        return score

    articles.sort(key=score_article, reverse=True)
    final_articles = articles[:15]  # Give generate_summary room to retry
    return final_articles

# Set currently for 5 articles; expands to 36 hour time window if less than 5 articles are found
if __name__ == "__main__":
    articles = fetch_articles()
    if len(articles) < 5:
        print("Fewer than 5 articles found, expanding window to 36 hours")
        articles = fetch_articles(time_window_hours=36)

    print(f"✅ Final articles written to input.json:")
    for a in articles:
        print(f"  - {a['title']} ({a['published']})")
        print(f"    ↳ Length: {len(a['content'])} chars")

    os.makedirs("data", exist_ok=True)
    with open("data/input.json", "w") as f:
        json.dump(articles, f, indent=2)

    print("Saved input for summarization to data/input.json")

export function formatNewsPrompt(article) {
  const snippet = (article.content || article.summary || "").slice(0, 1500); // Trim for token limits
  return `${article.source}: ${article.title}
Published: ${article.published || "Unknown"}
URL: ${article.url}

${snippet}`;
}

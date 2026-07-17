const HASHTAG_REGEX = /#([a-zA-Z0-9_]{1,50})/g;
// Negative lookbehind excludes "@" preceded by a word character, so email
// addresses like "hello@example.com" aren't mistaken for a mention of "example.com".
const MENTION_REGEX = /(?<![a-zA-Z0-9_])@([a-zA-Z0-9_.]{3,30})/g;

export function extractHashtags(content: string): string[] {
  const matches = content.matchAll(HASHTAG_REGEX);
  const tags = new Set<string>();
  for (const match of matches) tags.add(match[1].toLowerCase());
  return Array.from(tags);
}

export function extractMentionedUsernames(content: string): string[] {
  const matches = content.matchAll(MENTION_REGEX);
  const usernames = new Set<string>();
  for (const match of matches) usernames.add(match[1].toLowerCase());
  return Array.from(usernames);
}

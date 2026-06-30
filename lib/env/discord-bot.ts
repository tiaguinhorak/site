import "server-only";

export function getDiscordBotUrl(): string | undefined {
  const url = process.env.DISCORD_BOT_URL?.trim();
  return url || undefined;
}

export function getDiscordBotApiKey(): string | undefined {
  const key = process.env.DISCORD_BOT_API_KEY?.trim();
  return key || undefined;
}

export function isDiscordBotConfigured(): boolean {
  return Boolean(getDiscordBotUrl() && getDiscordBotApiKey());
}

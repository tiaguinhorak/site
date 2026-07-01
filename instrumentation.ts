export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startSteamProfileBackgroundSync } = await import(
      "./lib/steam/sync-profiles-background"
    );
    startSteamProfileBackgroundSync();
  }
}

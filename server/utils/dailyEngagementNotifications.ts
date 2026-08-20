import { db } from "../db";
import { users } from "@shared/schema";
import { isNotNull } from "drizzle-orm";
import { storage } from "../storage";
import { sendPushNotification } from "./apns";

// French-time send hours, chosen with Anatole (2026-08-20): challenges reset at midnight
// Paris time and the free spin at 1am, but nobody's awake then — these are the actual
// engagement nudges, timed after both have already reset.
const CHALLENGES_HOUR_PARIS = 12;
const FREE_SPIN_HOUR_PARIS = 9;

const CHALLENGES_CONFIG_KEY = "lastChallengesNotifSentDay";
const FREE_SPIN_CONFIG_KEY = "lastFreeSpinNotifSentDay";

// Paris wall-clock date/hour, DST-safe — same Intl-over-a-fixed-instant technique as the
// free-spin reset calculation in server/storage.ts (a fixed UTC offset would drift an hour
// twice a year).
function getParisNow(date: Date): { dateKey: string; hour: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return { dateKey: `${get("year")}-${get("month")}-${get("day")}`, hour: parseInt(get("hour"), 10) };
}

async function broadcastPush(title: string, body: string): Promise<void> {
  const recipients = await db.select({ pushToken: users.pushToken }).from(users).where(isNotNull(users.pushToken));
  const results = await Promise.allSettled(
    recipients.map((r: { pushToken: string | null }) => sendPushNotification(r.pushToken as string, { title, body }))
  );
  const failed = results.filter((r) => r.status === "rejected").length;
  console.log(`📣 [daily-notif] "${body}" sent to ${recipients.length - failed}/${recipients.length} devices`);
}

// Checked every minute alongside the other daily-reset backstops in server/index.ts.
// Persists "already sent today" in the config table (not an in-memory flag) — Render's free
// tier sleeps/restarts the process, and an in-memory guard would re-fire the notification on
// every wake-up past the target hour instead of remembering it already went out today.
// Compares "local hour >= target, not yet sent today" rather than "== target hour" for the
// same reason: a server that was asleep exactly at the target minute still catches up instead
// of silently skipping the whole day.
export async function checkAndSendDailyEngagementNotifications(): Promise<void> {
  const { dateKey, hour } = getParisNow(new Date());

  if (hour >= CHALLENGES_HOUR_PARIS) {
    const lastSent = await storage.getConfig(CHALLENGES_CONFIG_KEY);
    if (lastSent !== dateKey) {
      await storage.setConfig(CHALLENGES_CONFIG_KEY, dateKey);
      await broadcastPush("FaceUp", "Your daily challenges are ready — come claim your rewards!").catch((err) =>
        console.error("Failed to broadcast daily challenges notification:", err)
      );
    }
  }

  if (hour >= FREE_SPIN_HOUR_PARIS) {
    const lastSent = await storage.getConfig(FREE_SPIN_CONFIG_KEY);
    if (lastSent !== dateKey) {
      await storage.setConfig(FREE_SPIN_CONFIG_KEY, dateKey);
      await broadcastPush("FaceUp", "Your free daily spin is ready to claim!").catch((err) =>
        console.error("Failed to broadcast daily free spin notification:", err)
      );
    }
  }
}

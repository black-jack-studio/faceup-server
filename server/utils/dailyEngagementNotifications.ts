import { db } from "../db";
import { users } from "@shared/schema";
import { isNotNull } from "drizzle-orm";
import { storage } from "../storage";
import { sendPushNotification } from "./apns";

// French-time send hours, chosen with Anatole (2026-08-20, revised same day): challenges
// reset at midnight Paris time and the free spin at 1am, but nobody's awake then — spread
// across the day instead of bunching all three at once. The streak reminder goes out in the
// morning (a "don't forget today" nudge, checked first thing), while the free spin and
// challenges nudges — reward-already-waiting nudges rather than time-sensitive ones — go out
// together in the afternoon.
const STREAK_HOUR_PARIS = 9;
const FREE_SPIN_HOUR_PARIS = 14;
const CHALLENGES_HOUR_PARIS = 15;

const CHALLENGES_CONFIG_KEY = "lastChallengesNotifSentDay";
const FREE_SPIN_CONFIG_KEY = "lastFreeSpinNotifSentDay";
const STREAK_CONFIG_KEY = "lastStreakNotifSentDay";

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

type PushRecipient = { id: string; pushToken: string | null };

// `eligible` narrows recipients beyond "has a push token" — each broadcast below uses it to
// skip anyone the reminder isn't relevant to anymore (already spun, already finished today's
// challenges).
async function broadcastPush(title: string, body: string, eligible?: (userId: string) => Promise<boolean>): Promise<void> {
  const recipients: PushRecipient[] = await db.select({ id: users.id, pushToken: users.pushToken }).from(users).where(isNotNull(users.pushToken));
  const targets = eligible
    ? (await Promise.all(recipients.map(async (r: PushRecipient) => ((await eligible(r.id)) ? r : null)))).filter(
        (r): r is PushRecipient => r !== null
      )
    : recipients;

  const results = await Promise.allSettled(
    targets.map((r: PushRecipient) => sendPushNotification(r.pushToken as string, { title, body }))
  );
  const failed = results.filter((r) => r.status === "rejected").length;
  console.log(`📣 [daily-notif] "${body}" sent to ${targets.length - failed}/${targets.length} devices (${recipients.length} had a push token)`);
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

  if (hour >= STREAK_HOUR_PARIS) {
    const lastSent = await storage.getConfig(STREAK_CONFIG_KEY);
    if (lastSent !== dateKey) {
      await storage.setConfig(STREAK_CONFIG_KEY, dateKey);
      await broadcastPush(
        "FaceUp",
        "Keep your winning streak alive! Win a Classic hand today.",
        // Only worth nagging players who actually have a streak to lose and haven't already
        // won today — a brand new player with no streak gets no value from this ping.
        async (userId) => {
          const status = await storage.getDailyStreakStatus(userId);
          return status.currentStreak > 0 && !status.wonToday;
        }
      ).catch((err) => console.error("Failed to broadcast daily streak notification:", err));
    }
  }

  if (hour >= FREE_SPIN_HOUR_PARIS) {
    const lastSent = await storage.getConfig(FREE_SPIN_CONFIG_KEY);
    if (lastSent !== dateKey) {
      await storage.setConfig(FREE_SPIN_CONFIG_KEY, dateKey);
      await broadcastPush(
        "FaceUp",
        "Your free daily spin is ready to claim!",
        (userId) => storage.canUserSpin(userId)
      ).catch((err) => console.error("Failed to broadcast daily free spin notification:", err));
    }
  }

  if (hour >= CHALLENGES_HOUR_PARIS) {
    const lastSent = await storage.getConfig(CHALLENGES_CONFIG_KEY);
    if (lastSent !== dateKey) {
      await storage.setConfig(CHALLENGES_CONFIG_KEY, dateKey);
      await broadcastPush(
        "FaceUp",
        "Your daily challenges are ready! Come claim your rewards.",
        async (userId) => !(await storage.hasCompletedTodaysChallenges(userId))
      ).catch((err) => console.error("Failed to broadcast daily challenges notification:", err));
    }
  }
}

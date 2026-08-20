import { db } from "../db";
import { users } from "@shared/schema";
import { isNotNull } from "drizzle-orm";
import { storage } from "../storage";
import { sendPushNotification } from "./apns";

// French-time send windows, chosen with Anatole (2026-08-20, revised same day): a fixed
// clock time made every user's phone buzz at the exact same instant, which reads as
// robotic and spiky on the server — each window instead gets ONE random minute picked
// fresh per Paris calendar day (see getTodaysTargetMinute below), so sends spread out
// naturally across the window instead of bunching at one second. The streak reminder's
// window is in the morning (a "don't forget today" nudge, checked first thing), while the
// free spin and challenges nudges — reward-already-waiting nudges rather than time-sensitive
// ones — get back-to-back windows in the afternoon.
type NotifWindow = { startHour: number; endHour: number }; // Paris local time, [startHour, endHour)

const STREAK_WINDOW: NotifWindow = { startHour: 8, endHour: 11 };
const FREE_SPIN_WINDOW: NotifWindow = { startHour: 13, endHour: 16 };
const CHALLENGES_WINDOW: NotifWindow = { startHour: 16, endHour: 19 };

const STREAK_SENT_KEY = "lastStreakNotifSentDay";
const STREAK_PLAN_KEY = "streakNotifTargetMinutePlan";
const FREE_SPIN_SENT_KEY = "lastFreeSpinNotifSentDay";
const FREE_SPIN_PLAN_KEY = "freeSpinNotifTargetMinutePlan";
const CHALLENGES_SENT_KEY = "lastChallengesNotifSentDay";
const CHALLENGES_PLAN_KEY = "challengesNotifTargetMinutePlan";

// Paris wall-clock date/minute-of-day, DST-safe — same Intl-over-a-fixed-instant technique as
// the free-spin reset calculation in server/storage.ts (a fixed UTC offset would drift an hour
// twice a year).
function getParisNow(date: Date): { dateKey: string; minuteOfDay: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  const hour = parseInt(get("hour"), 10);
  const minute = parseInt(get("minute"), 10);
  return { dateKey: `${get("year")}-${get("month")}-${get("day")}`, minuteOfDay: hour * 60 + minute };
}

// Picks this notification's target minute-of-day for today, once — persisted in the config
// table (not recomputed on every check) so every one-minute tick agrees on the same target,
// and so a Render restart mid-window doesn't silently reroll a later target and delay the send.
async function getTodaysTargetMinute(planConfigKey: string, window: NotifWindow, dateKey: string): Promise<number> {
  const plan = (await storage.getConfig(planConfigKey)) as { date: string; targetMinute: number } | undefined;
  if (plan?.date === dateKey) return plan.targetMinute;

  const windowMinutes = (window.endHour - window.startHour) * 60;
  const targetMinute = window.startHour * 60 + Math.floor(Math.random() * windowMinutes);
  await storage.setConfig(planConfigKey, { date: dateKey, targetMinute });
  return targetMinute;
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
// every wake-up past the target minute instead of remembering it already went out today.
// Compares "minute-of-day >= today's target, not yet sent today" rather than "== target"
// for the same reason: a server that was asleep exactly at the target minute still catches up
// instead of silently skipping the whole day.
async function maybeSendWindowed(
  window: NotifWindow,
  planConfigKey: string,
  sentConfigKey: string,
  dateKey: string,
  minuteOfDay: number,
  label: string,
  title: string,
  body: string,
  eligible?: (userId: string) => Promise<boolean>
): Promise<void> {
  const targetMinute = await getTodaysTargetMinute(planConfigKey, window, dateKey);
  if (minuteOfDay < targetMinute) return;

  const lastSent = await storage.getConfig(sentConfigKey);
  if (lastSent === dateKey) return;
  await storage.setConfig(sentConfigKey, dateKey);

  await broadcastPush(title, body, eligible).catch((err) => console.error(`Failed to broadcast ${label} notification:`, err));
}

export async function checkAndSendDailyEngagementNotifications(): Promise<void> {
  const { dateKey, minuteOfDay } = getParisNow(new Date());

  await maybeSendWindowed(
    STREAK_WINDOW,
    STREAK_PLAN_KEY,
    STREAK_SENT_KEY,
    dateKey,
    minuteOfDay,
    "daily streak",
    "FaceUp",
    "Keep your winning streak alive! Win a Classic hand today.",
    // Only worth nagging players who actually have a streak to lose and haven't already won
    // today — a brand new player with no streak gets no value from this ping.
    async (userId) => {
      const status = await storage.getDailyStreakStatus(userId);
      return status.currentStreak > 0 && !status.wonToday;
    }
  );

  await maybeSendWindowed(
    FREE_SPIN_WINDOW,
    FREE_SPIN_PLAN_KEY,
    FREE_SPIN_SENT_KEY,
    dateKey,
    minuteOfDay,
    "daily free spin",
    "FaceUp",
    "Your free daily spin is ready to claim!",
    (userId) => storage.canUserSpin(userId)
  );

  await maybeSendWindowed(
    CHALLENGES_WINDOW,
    CHALLENGES_PLAN_KEY,
    CHALLENGES_SENT_KEY,
    dateKey,
    minuteOfDay,
    "daily challenges",
    "FaceUp",
    "Your daily challenges are ready! Come claim your rewards.",
    async (userId) => !(await storage.hasCompletedTodaysChallenges(userId))
  );
}

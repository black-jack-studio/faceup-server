
import { storage } from "./storage";
import { db } from "./db";
import { users, betDrafts } from "@shared/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

async function testBettingFlow() {
    console.log("🚀 Starting Betting Flow Test...");

    // 1. Create Test User
    const testUsername = `test_user_${nanoid(5)}`;
    console.log(`\n👤 Creating test user: ${testUsername}`);
    const user = await storage.createUser({
        username: testUsername,
        email: `${testUsername}@example.com`,
        password: "password123"
    });

    // Set initial balance
    await storage.updateUser(user.id, { coins: 1000, bolts: 5 });
    console.log(`   Initial State: Coins=${1000}, Bolts=${5}`);

    // ==========================================
    // TEST 1: Classic Mode (Coin Deduction)
    // ==========================================
    console.log("\n🧪 TEST 1: Classic Mode Betting");
    const betId1 = nanoid();
    const betAmount1 = 100;

    // Prepare
    console.log("   -> Preparing bet...");
    const draft1 = await storage.createBetDraft({
        betId: betId1,
        userId: user.id,
        amount: betAmount1,
        mode: "classic",
        expiresAt: new Date(Date.now() + 60000)
    });

    // Commit (Simulating the transaction logic from routes.ts)
    console.log("   -> Committing bet...");
    await db.transaction(async (tx) => {
        const [u] = await tx.select().from(users).where(eq(users.id, user.id));
        const [draft] = await tx.select().from(betDrafts).where(eq(betDrafts.betId, betId1));

        if (!draft) throw new Error("Draft not found");

        const newCoins = (u.coins || 0) - draft.amount;

        await tx.update(users)
            .set({ coins: newCoins })
            .where(eq(users.id, user.id));

        await tx.delete(betDrafts).where(eq(betDrafts.betId, betId1));
    });

    // Verify
    const userAfterTest1 = await storage.getUser(user.id);
    console.log(`   Result: Coins=${userAfterTest1?.coins} (Expected 900)`);
    if (userAfterTest1?.coins !== 900) {
        console.error("❌ TEST 1 FAILED: Coins not deducted correctly in Classic mode");
    } else {
        console.log("✅ TEST 1 PASSED");
    }

    console.log("\n🏁 Test Complete");
    process.exit(0);
}

testBettingFlow().catch(console.error);

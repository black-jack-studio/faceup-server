/**
 * Integration test for All-in Game functionality
 * This test verifies that the complete All-in game flow works correctly
 */

import { storage } from './server/storage.js';
import { randomUUID } from 'crypto';

async function testAllInGameFlow() {
  console.log('🧪 Starting All-in Game Integration Test...\n');
  
  try {
    // 1. Create a test user with tickets and coins
    console.log('1. Creating test user...');
    const testUser = await storage.createUser({
      username: `test_user_${randomUUID().substring(0, 8)}`,
      email: `test_${randomUUID().substring(0, 8)}@test.com`,
      password: 'test_password'
    });
    console.log(`✅ Created user: ${testUser.username} (${testUser.id})`);
    console.log(`   Initial state: ${testUser.coins} coins, ${testUser.tickets} tickets\n`);
    
    // 2. Verify config values exist and are correct
    console.log('2. Verifying config values...');
    const winProbability = await storage.getConfig('allInWinProbability');
    const rebatePercent = await storage.getConfig('lossRebatePct');
    console.log(`✅ Win probability: ${winProbability} (expected: 0.28)`);
    console.log(`✅ Rebate percentage: ${rebatePercent} (expected: 0.05)\n`);
    
    if (winProbability !== 0.28 || rebatePercent !== 0.05) {
      throw new Error('Config values are not set correctly!');
    }
    
    // 3. Give the user some coins to test with (1000 default should be enough)
    if (testUser.coins < 100) {
      console.log('3. Adding coins to test user...');
      const updatedUser = await storage.updateUserCoins(testUser.id, 1000);
      console.log(`✅ Updated coins: ${updatedUser.coins}\n`);
    } else {
      console.log('3. ✅ User has sufficient coins for testing\n');
    }
    
    // 4. Verify user has tickets
    const userTickets = await storage.getUserTickets(testUser.id);
    console.log(`4. User tickets: ${userTickets}`);
    if (userTickets <= 0) {
      console.log('   Adding tickets to test user...');
      await storage.updateUserTickets(testUser.id, 3);
      console.log('✅ Updated tickets: 3\n');
    } else {
      console.log('✅ User has tickets for testing\n');
    }
    
    // 5. Execute All-in game
    console.log('5. Executing All-in game...');
    const beforeUser = await storage.getUser(testUser.id);
    console.log(`   Before game: ${beforeUser.coins} coins, ${beforeUser.tickets} tickets, ${beforeUser.bonusCoins || 0} bonus coins, ${beforeUser.allInLoseStreak || 0} lose streak`);
    
    const gameResult = await storage.executeAllInGame(testUser.id);
    
    console.log('✅ Game executed successfully!');
    console.log(`   Result: ${gameResult.outcome.won ? 'WIN' : 'LOSE'}`);
    console.log(`   Bet amount: ${gameResult.outcome.betAmount}`);
    console.log(`   Payout: ${gameResult.outcome.payout}`);
    console.log(`   Rebate: ${gameResult.outcome.rebate}`);
    console.log(`   New balance: ${gameResult.outcome.newBalance}`);
    console.log(`   Tickets remaining: ${gameResult.outcome.ticketsRemaining}`);
    
    // 6. Verify database updates
    console.log('\n6. Verifying database updates...');
    const afterUser = await storage.getUser(testUser.id);
    console.log(`   After game: ${afterUser.coins} coins, ${afterUser.tickets} tickets, ${afterUser.bonusCoins || 0} bonus coins, ${afterUser.allInLoseStreak || 0} lose streak`);
    
    // Verify ticket consumption
    if (afterUser.tickets !== beforeUser.tickets - 1) {
      throw new Error(`Ticket consumption failed: expected ${beforeUser.tickets - 1}, got ${afterUser.tickets}`);
    }
    console.log('✅ Tickets properly decremented');
    
    // Verify coin calculation
    if (gameResult.outcome.won) {
      const expectedCoins = beforeUser.coins * 3; // Win = bet * 3
      if (afterUser.coins !== expectedCoins) {
        throw new Error(`Win calculation failed: expected ${expectedCoins}, got ${afterUser.coins}`);
      }
      console.log('✅ Win calculation correct (coins * 3)');
      
      // Verify lose streak reset on win
      if (afterUser.allInLoseStreak !== 0) {
        throw new Error(`Lose streak should be reset to 0 on win, got ${afterUser.allInLoseStreak}`);
      }
      console.log('✅ Lose streak reset on win');
    } else {
      // Verify loss: coins = 0, bonus coins increased
      if (afterUser.coins !== 0) {
        throw new Error(`Loss calculation failed: coins should be 0, got ${afterUser.coins}`);
      }
      console.log('✅ Loss calculation correct (coins = 0)');
      
      const expectedRebate = Math.floor(beforeUser.coins * rebatePercent);
      const expectedBonusCoins = (beforeUser.bonusCoins || 0) + expectedRebate;
      if (afterUser.bonusCoins !== expectedBonusCoins) {
        throw new Error(`Rebate calculation failed: expected ${expectedBonusCoins} bonus coins, got ${afterUser.bonusCoins}`);
      }
      console.log('✅ Rebate calculation correct');
      
      // Verify lose streak incremented
      const expectedLoseStreak = (beforeUser.allInLoseStreak || 0) + 1;
      if (afterUser.allInLoseStreak !== expectedLoseStreak) {
        throw new Error(`Lose streak should be incremented to ${expectedLoseStreak}, got ${afterUser.allInLoseStreak}`);
      }
      console.log('✅ Lose streak incremented');
    }
    
    // 7. Verify audit record was created
    console.log('\n7. Verifying audit record...');
    console.log(`   Run ID: ${gameResult.run.id}`);
    console.log(`   Pre-balance: ${gameResult.run.preBalance}`);
    console.log(`   Bet amount: ${gameResult.run.betAmount}`);
    console.log(`   Result: ${gameResult.run.result}`);
    console.log(`   Multiplier: ${gameResult.run.multiplier}`);
    console.log(`   Payout: ${gameResult.run.payout}`);
    console.log(`   Rebate: ${gameResult.run.rebate}`);
    console.log('✅ Audit record created successfully');
    
    // 8. Test edge cases
    console.log('\n8. Testing edge cases...');
    
    // Test with 0 tickets
    await storage.updateUserTickets(testUser.id, 0);
    try {
      await storage.executeAllInGame(testUser.id);
      throw new Error('Should have failed with 0 tickets');
    } catch (error) {
      if (error.message === 'No tickets remaining') {
        console.log('✅ Correctly rejects game with 0 tickets');
      } else {
        throw error;
      }
    }
    
    // Reset tickets and test with 0 coins
    await storage.updateUserTickets(testUser.id, 1);
    await storage.updateUserCoins(testUser.id, 0);
    try {
      await storage.executeAllInGame(testUser.id);
      throw new Error('Should have failed with 0 coins');
    } catch (error) {
      if (error.message === 'Insufficient coins') {
        console.log('✅ Correctly rejects game with 0 coins');
      } else {
        throw error;
      }
    }
    
    console.log('\n🎉 All tests passed! All-in game implementation is working correctly.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  }
}

// Run the test
testAllInGameFlow()
  .then(() => {
    console.log('\n✅ Integration test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Integration test failed:', error);
    process.exit(1);
  });
import { storage } from './storage';

export class SeasonService {
  // Get the current month name for the season
  static getCurrentSeasonName(): string {
    const now = new Date();
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${monthNames[now.getMonth()]} Season`;
  }

  // Get the current month identifier (YYYY-MM format)
  static getCurrentSeasonId(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  // Get the end date of the current month (last day at 23:59:59)
  static getSeasonEndDate(): Date {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    // Create date for first day of next month, then subtract 1 second
    const nextMonth = new Date(year, month + 1, 1);
    const endOfMonth = new Date(nextMonth.getTime() - 1000);
    
    return endOfMonth;
  }

  // Calculate time remaining until end of season
  static getTimeUntilSeasonEnd(): { days: number; hours: number; minutes: number } {
    const now = new Date();
    const endDate = this.getSeasonEndDate();
    const timeDiff = endDate.getTime() - now.getTime();

    if (timeDiff <= 0) {
      return { days: 0, hours: 0, minutes: 0 };
    }

    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

    return { days, hours, minutes };
  }

  // Check if we need to reset the season
  static async shouldResetSeason(): Promise<{ shouldReset: boolean; isFirstTime: boolean; needsInitialization: boolean }> {
    try {
      // Get the current season from database
      const currentSeason = await storage.getCurrentSeason();
      
      if (!currentSeason) {
        // No season exists, we need to create one (first time initialization - NO RESET)
        return { shouldReset: false, isFirstTime: true, needsInitialization: true };
      }

      // Check if the stored season identifier matches current month
      const currentSeasonId = this.getCurrentSeasonId();
      
      if (currentSeason.seasonIdentifier !== currentSeasonId) {
        // We're in a new month, need to reset
        console.log(`🔄 Season change detected: ${currentSeason.seasonIdentifier} → ${currentSeasonId}`);
        return { shouldReset: true, isFirstTime: false, needsInitialization: false };
      }

      return { shouldReset: false, isFirstTime: false, needsInitialization: false };
    } catch (error) {
      console.error('Error checking season reset:', error);
      return { shouldReset: false, isFirstTime: false, needsInitialization: false };
    }
  }

  // Perform complete season reset (only resets user progress if not first time)
  static async resetSeason(isFirstTime: boolean = false): Promise<void> {
    try {
      const currentSeasonId = this.getCurrentSeasonId();
      const currentSeasonName = this.getCurrentSeasonName();

      if (isFirstTime) {
        // First time initialization - just create the season, don't reset users
        console.log('🆕 First time season initialization...');
        await storage.createOrUpdateSeason(currentSeasonId, currentSeasonName);
        console.log(`✅ Created initial season: ${currentSeasonName} (${currentSeasonId})`);
      } else {
        // Month transition - reset season progress only (NOT permanent stats)
        console.log('🔄 Starting season reset for month transition...');
        
        // 1. Reset all user season progress (level and seasonXP for battle pass)
        await storage.resetAllUserSeasonProgress();
        console.log('✅ Reset all user levels and seasonXP to 0');

        // 2. Clear all battle pass rewards
        await storage.clearBattlePassRewards();
        console.log('✅ Cleared all battle pass rewards');

        // 3. Reset premium streak leaderboard
        await storage.resetPremiumStreakLeaderboard();
        console.log('✅ Reset premium streak leaderboard');

        // 3b. Reset animal ranks (season-scoped hands-won counter) in the same cycle,
        // so the rank countdown always matches the Battle Pass one exactly.
        await storage.resetAllUserRanks();
        await storage.clearRankRewardsClaimed();
        console.log('✅ Reset animal ranks and cleared claimed rank rewards');

        // 4. Update or create the new season
        await storage.createOrUpdateSeason(currentSeasonId, currentSeasonName);
        console.log(`✅ Created new season: ${currentSeasonName} (${currentSeasonId})`);

        console.log('🎉 Season reset complete! (Permanent stats preserved)');
      }
    } catch (error) {
      console.error('❌ Error during season reset:', error);
      throw error;
    }
  }

  // Check and perform reset if needed (call this on app init or periodically)
  static async checkAndResetIfNeeded(): Promise<{ reset: boolean; seasonName: string; seasonId: string }> {
    const { shouldReset, isFirstTime, needsInitialization } = await this.shouldResetSeason();
    
    // Create/update season if needed (either first time or month transition)
    if (needsInitialization || shouldReset) {
      await this.resetSeason(isFirstTime);
    }

    return {
      reset: shouldReset,
      seasonName: this.getCurrentSeasonName(),
      seasonId: this.getCurrentSeasonId()
    };
  }
}

import { db } from '../db';
import { users } from '../../shared/schema';
import { eq, sql } from 'drizzle-orm';

// Filleul : crédité immédiatement à la saisie du code (voir POST /api/referral/submit-code).
export const REFEREE_SIGNUP_REWARD_COINS = 250;
// Parrain : crédité seulement au premier achat en argent réel du filleul (cette fonction).
export const REFERRER_PURCHASE_REWARD_COINS = 500;

/**
 * Distribue la récompense de parrainage au PARRAIN (500 coins) quand son filleul effectue
 * son premier achat en argent réel dans l'app. Le filleul, lui, reçoit déjà ses 250 coins
 * immédiatement à la saisie du code (voir POST /api/referral/submit-code) — cette fonction
 * ne récompense donc plus que le parrain, une seule fois par filleul.
 *
 * ⚠️ STUB — il n'existe pas encore de système de paiement réel (IAP Apple/Stripe/etc.) dans
 * le code. Cette fonction est prête mais n'est appelée par aucune route pour l'instant :
 * l'exposer via une route publique avant qu'un vrai paiement soit vérifié serait exploitable
 * (n'importe qui pourrait se faire créditer des coins sans rien payer). Brancher l'appel ici
 * depuis le futur handler de confirmation d'achat (après validation du reçu App Store /
 * webhook Stripe côté serveur), une fois ce système construit.
 *
 * @param userId ID de l'utilisateur qui vient de faire son premier achat (le filleul)
 * @returns Résultat de la distribution avec détails
 */
export async function awardFirstPurchaseReferralBonus(userId: string): Promise<{
  distributed: boolean;
  referrerAmount?: number;
  referrerId?: string;
}> {
  try {
    const user = await db
      .select({
        id: users.id,
        referredBy: users.referredBy,
        referralRewardClaimed: users.referralRewardClaimed,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length === 0) {
      return { distributed: false };
    }

    const currentUser = user[0];

    // Pas de parrain, ou récompense déjà distribuée pour ce filleul (une seule fois, au
    // premier achat) : rien à faire.
    if (!currentUser.referredBy || currentUser.referralRewardClaimed) {
      return { distributed: false };
    }

    await db.transaction(async (tx: any) => {
      // Revérifier dans la transaction pour éviter une double distribution en cas d'appels
      // concurrents (ex : deux achats presque simultanés). On marque referralRewardClaimed
      // sur le filleul (userId) même si c'est le parrain qui est payé — c'est ce flag,
      // scopé par filleul, qui garantit que chaque filleul ne déclenche ce bonus qu'une fois.
      const checkUser = await tx
        .select({ referralRewardClaimed: users.referralRewardClaimed })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (checkUser[0]?.referralRewardClaimed) {
        throw new Error('Rewards already claimed');
      }

      await tx
        .update(users)
        .set({ referralRewardClaimed: true })
        .where(eq(users.id, userId));

      // Coins au parrain — un parrain peut avoir plusieurs filleuls, chacun déclenche sa
      // propre récompense indépendamment.
      await tx
        .update(users)
        .set({
          coins: sql`${users.coins} + ${REFERRER_PURCHASE_REWARD_COINS}`,
        })
        .where(eq(users.id, currentUser.referredBy!));
    });

    console.log(`✨ Referral purchase reward distributed to referrer ${currentUser.referredBy} (${REFERRER_PURCHASE_REWARD_COINS} coins), triggered by ${userId}'s first purchase`);

    return {
      distributed: true,
      referrerAmount: REFERRER_PURCHASE_REWARD_COINS,
      referrerId: currentUser.referredBy,
    };
  } catch (error: any) {
    if (error.message === 'Rewards already claimed') {
      return { distributed: false };
    }
    console.error('Error distributing referral purchase rewards:', error);
    throw error;
  }
}

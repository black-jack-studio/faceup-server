/**
 * Supabase Adapters - Centralized data access layer
 * All database operations go through Supabase only (no Neon/PG)
 */

export * as ProfileAdapter from './profile';
export * as StatsAdapter from './stats';
export * as FriendsAdapter from './friends';
export * as InventoryAdapter from './inventory';
export * as GemsAdapter from './gems';

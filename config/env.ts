/**
 * Centralized environment configuration for FaceUp
 * This file manages all environment-specific URLs and settings
 */

// API Base URL - defaults to localhost in development
export const API_URL = process.env.API_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://faceup-server.onrender.com'
    : 'http://localhost:5000');

// Supabase Configuration - supports both VITE_ prefixed and standard env vars
export const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

// Allowed CORS Origins for Capacitor mobile app and development
export const ALLOWED_ORIGINS = [
  'capacitor://localhost',              // iOS Capacitor
  'http://localhost',                   // Android Capacitor (various ports)
  'http://localhost:5173',              // Vite dev server
  'http://localhost:5000',              // Production local
  'https://faceup-server.onrender.com', // Production Render URL
];

// Database Configuration
export const DATABASE_URL = process.env.DATABASE_URL || '';

// Feature Flags
export const USE_SUPABASE = process.env.USE_SUPABASE === 'true';

// Port Configuration
export const PORT = parseInt(process.env.PORT || '5000', 10);

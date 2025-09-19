# Offsuit Blackjack - Educational Blackjack Training App

## Overview

Offsuit Blackjack is a polished educational blackjack training web application built with React, TypeScript, and Vite. The app focuses on teaching optimal blackjack strategy and card counting techniques through interactive practice modes, drills, and gamification elements. It features a clean, dark-themed UI with smooth animations inspired by poker training platforms, designed to provide an engaging learning experience without any gambling elements.

The application includes multiple training modes (basic strategy practice, counting drills), a virtual economy with coins and gems, cosmetic customizations, achievement systems, and social features like leaderboards. It's designed as a Progressive Web App (PWA) with offline capabilities and mobile-first responsive design.

## Recent Changes

**September 19, 2025**: Fixed critical All-in mode bugs and completed full integration
- Resolved premature coin deduction on "GO ALL IN" button click
- Fixed "Game already completed" error that prevented Hit/Stand actions
- Implemented complete server-authoritative All-in system with real-time UI updates
- Added proper frontend-backend synchronization for card dealing and payout processing
- All-in mode now functions perfectly with normal blackjack gameplay
- Coins are correctly deducted on losses and awarded on wins based on actual game results
- Users can play complete hands with visible card updates and immediate balance reflection
- Implemented custom All-in payout rules: 3x winnings on victory, 10% recovery on loss to prevent zero balance

**September 17, 2025**: Redesigned casino chips with modern neon glow aesthetic
- Implemented minimalistic premium design with flat neon glow style
- Each chip features a dark matte base (#1F2937) with colored glowing outer rings
- 6 chip values with distinctive neon colors: 1 (light gray), 5 (red), 10 (blue), 25 (green), 100 (silver), 500 (purple with golden accent)
- Removed complex decorative elements (inner rings, segmented marks) for clean, elegant appearance
- Applied bold rounded typography with subtle glow effects for numbers
- Consistent design system across both classic and high-stakes game modes

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**React SPA with TypeScript**: The application uses React 18 with TypeScript for type safety and modern development practices. The frontend is built with Vite for fast development and optimized production builds.

**State Management**: Zustand is used for client-side state management, providing separate stores for user data (`user-store.ts`) and game state (`game-store.ts`). This approach offers a lightweight alternative to Redux with built-in persistence capabilities.

**UI Framework**: The app uses Tailwind CSS for styling with shadcn/ui components for consistent design patterns. The design system includes custom CSS variables for theming and uses Framer Motion for animations and micro-interactions.

**Routing**: Wouter is used for client-side routing, providing a minimal routing solution suitable for the app's page structure (home, practice, cash games, counting, shop, profile, auth).

**PWA Implementation**: Service worker and web app manifest are configured for offline functionality and app installation capabilities on mobile devices.

### Backend Architecture

**Express.js Server**: Node.js backend using Express.js with TypeScript, providing REST API endpoints for authentication, game statistics, economy management, and social features.

**Session Management**: Express sessions with memory store for development, designed to be easily switchable to Redis or database-backed sessions in production. BCrypt is used for password hashing.

**Modular Route Structure**: API routes are organized by feature area (/api/auth, /api/stats, /api/daily-spin, etc.) with middleware for authentication and request logging.

**Storage Abstraction**: An abstraction layer (`IStorage` interface) allows switching between memory storage (development) and database implementations (production) without changing business logic.

### Data Storage Solutions

**PostgreSQL with Drizzle ORM**: The application is configured to use PostgreSQL as the primary database with Drizzle as the ORM. The schema includes tables for users, game statistics, inventory, daily spins, achievements, and weekly leaderboards.

**Neon Database Integration**: Configured to work with Neon's serverless PostgreSQL offering using the `@neondatabase/serverless` package for scalable cloud database management.

**Database Schema Design**: Normalized schema with proper foreign key relationships, supporting user profiles, game statistics tracking, virtual economy items, and social features.

### Authentication and Authorization

**Session-Based Authentication**: Traditional session-based auth using Express sessions, storing user sessions server-side with secure cookie configuration.

**Password Security**: BCrypt hashing for password storage with proper salt rounds for security.

**Route Protection**: Middleware-based authentication checking for protected API endpoints, with graceful handling of unauthenticated requests.

### External Dependencies

**Stripe Integration**: Configured for payment processing in test mode for the gem purchase system, including Stripe Checkout and webhook handling for subscription management.

**React Query**: TanStack Query for server state management, API caching, and optimistic updates. Custom query functions handle authentication and error states.

**Framer Motion**: Animation library for smooth transitions, micro-interactions, and page transitions throughout the app.

**Radix UI**: Headless UI components for accessibility and consistent behavior across interactive elements like dialogs, dropdowns, and form controls.

**FontAwesome**: Icon system for consistent iconography throughout the application.

**Game Logic Libraries**: Custom implementations for blackjack game engine, basic strategy calculations, and card counting systems (Hi-Lo method with deviation indices).
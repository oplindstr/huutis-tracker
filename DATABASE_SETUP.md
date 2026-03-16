# Huutopussi Database Setup

## Environment Variables

Create a `.env.local` file in the root directory with:

```
POSTGRES_URL=your_vercel_postgres_connection_string
```

## Vercel Postgres Setup (Current - Deprecated)

1. Go to your Vercel project dashboard
2. Navigate to the "Storage" tab
3. Create a new Postgres database
4. Copy the connection string to your `.env.local` file

## Migration to Neon (Recommended for New Projects)

Vercel Postgres is deprecated in favor of Neon. For new projects:

1. Create a Neon database at https://neon.tech/
2. Get the connection string
3. Update the imports in the API routes:
   - Replace `import { sql } from '@vercel/postgres'`
   - Use a standard PostgreSQL client like `pg` or `@neondatabase/serverless`

## Database Schema

The database schema will be automatically created when the first API request is made. The tables include:

- `players` - Permanent player records
- `games` - Game sessions with metadata
- `game_rounds` - Individual round data for each game
- Views for player statistics

## Features

### Quick Games

- Manual player entry
- Local storage persistence
- No database interaction

### Tracked Games

- Uses permanent players from database
- Saves all game data and statistics
- Real-time statistics tracking
- Game history preservation

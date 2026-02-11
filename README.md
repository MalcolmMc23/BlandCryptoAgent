# Bland Crypto Agent Demo (Web Only)

This project is a Next.js web app with API routes and a basic browser UI for:

- new user
- get fake prices (BTC/ETH/SOL)
- buy
- sell
- check balance (by username)

## Setup

1. Install:

```bash
npm install
```

2. Create `/Users/malcolm/NewDocs/BlandCryptoAgent/apps/server/.env`:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DBNAME?sslmode=require"
```

3. Run this SQL once on your Postgres DB:

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  phone_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS accounts (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  usd_balance_cents INT NOT NULL
);

CREATE TABLE IF NOT EXISTS holdings (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL CHECK (symbol IN ('BTC', 'ETH', 'SOL')),
  amount NUMERIC(32, 12) NOT NULL,
  PRIMARY KEY (user_id, symbol)
);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('BUY', 'SELL')),
  symbol TEXT NOT NULL CHECK (symbol IN ('BTC', 'ETH', 'SOL')),
  price_usd NUMERIC(20, 8) NOT NULL,
  qty NUMERIC(32, 12) NOT NULL,
  usd_amount NUMERIC(20, 8) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

4. Start dev server:

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Endpoints

- `GET /api/health`
- `POST /api/users` (body: `{ username: string, phone_number: string }`)
- `PUT /api/users` (body: `{ username: string, phone_number: string }`)
- `GET /api/users/:username`
- `GET /api/users/by-phone?phone=<phone_number>`
- `GET /api/prices`
- `GET /api/balance/:username`
- `POST /api/trade/buy`
- `POST /api/trade/sell`

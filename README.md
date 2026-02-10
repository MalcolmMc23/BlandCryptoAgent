# Bland Crypto Agent Demo

Monorepo with:
- Next.js API server (`apps/server`)
- React Native app via Expo (`apps/mobile`)
- Postgres via plain `pg` (no Prisma)

## 1) Install dependencies

```bash
npm install
```

## 2) Configure environment

Create `/Users/malcolm/NewDocs/BlandCryptoAgent/apps/server/.env`:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DBNAME?sslmode=require"
```

Create `/Users/malcolm/NewDocs/BlandCryptoAgent/apps/mobile/.env`:

```bash
EXPO_PUBLIC_API_URL="http://localhost:3000"
```

For physical device testing, use your machine LAN IP for `EXPO_PUBLIC_API_URL`, e.g. `http://192.168.1.12:3000`.

## 3) Initialize DB tables

Run this once against your Postgres database:

```sql
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
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

If `gen_random_uuid()` is unavailable, enable pgcrypto:

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

## 4) Start server

```bash
npm run dev:server
```

Server runs on `http://localhost:3000`.

## 5) Start React Native app

```bash
npm run dev:mobile
```

## Endpoint set implemented

- `GET /api/health`
- `POST /api/users`
- `GET /api/users/:username`
- `GET /api/prices`
- `GET /api/balance/:username`
- `POST /api/trade/buy`
- `POST /api/trade/sell`

## Notes

- New users start with `$10,000` (`1,000,000` cents).
- Prices are deterministic fake values for `BTC`, `ETH`, and `SOL`.
- Buy/sell are paper trades and update balances + holdings.
- Transactions are recorded in `transactions`.

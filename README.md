# Bland Crypto Agent Demo

Monorepo with:
- Next.js API server (`apps/server`)
- React Native app via Expo (`apps/mobile`)
- Postgres via Prisma

## 1) Install dependencies

```bash
npm install
```

## 2) Configure environment

Create `apps/server/.env`:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DBNAME?schema=public"
```

Create `apps/mobile/.env`:

```bash
EXPO_PUBLIC_API_URL="http://localhost:3000"
```

For physical device testing, use your machine LAN IP for `EXPO_PUBLIC_API_URL`, e.g. `http://192.168.1.12:3000`.

## 3) Run Prisma

```bash
npm run prisma:generate
npm run prisma:migrate -- --name init
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

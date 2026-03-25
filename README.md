# Designer Resale Dashboard

Internal operations platform for a designer bag resale business. Tracks inventory from purchase through authentication, listing, and sale — with per-role access controls, photo uploads, reporting, and optional Shopify integration.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TailwindCSS, React Query, Zustand, React Router v6, Recharts |
| Backend | Node.js, Express, TypeScript |
| Database | SQLite via Prisma ORM |
| Auth | JWT (stored in localStorage), bcrypt |
| File uploads | Multer (local disk) |
| Shopify | Shopify REST Admin API via axios |
| CI/CD | GitHub Actions |
| Hosting | AWS EC2 (backend) + S3 + CloudFront (frontend) |

---

## User Roles

| Role | Description |
|---|---|
| **ADMIN** | Full access — manage users, promote/change roles, all inventory and reports |
| **MANAGER** | Operations access — advance stages, update listings, view all reports. Can be designated as Buying, Selling, or Both |
| **BUYER** | Sourcing — add and manage bags they purchase |
| **SELLER** | Sales — view all inventory, manage their assigned listings, view their own sales history |

---

## Bag Pipeline

```
PURCHASED → AUTHENTICATED → LISTED → SOLD
```

Each stage transition is recorded in an append-only audit log with timestamp and the user who made the change. When a bag reaches **LISTED**, it is automatically pushed to Shopify (if enabled).

---

## Project Structure

```
designer_resale_dashboard/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── seed.ts          # 2 years of dummy data (~2,400 bags, ~$10M profit)
│   │   └── migrations/
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/      # authenticate, authorize, errorHandler
│   │   ├── routes/
│   │   ├── services/        # bags, users, reports, shopify, dashboard
│   │   └── index.ts
│   └── uploads/             # photo storage (gitignored)
├── frontend/
│   └── src/
│       ├── api/             # axios API clients
│       ├── components/      # AppShell, Sidebar, TopBar
│       ├── pages/           # all page components
│       ├── store/           # Zustand auth store
│       └── types/           # shared TypeScript types
├── .github/workflows/       # CI, deploy-prod, deploy-dev
├── scripts/
│   └── setup-ec2.sh         # one-command server bootstrap
├── infra/
│   └── nginx.conf
└── DEPLOYMENT.md            # full AWS + GitHub setup guide
```

---

## Local Development

### Prerequisites

- Node.js 20+
- npm

### Backend

```bash
cd backend
npm install
cp .env.example .env          # edit values as needed
npx prisma migrate dev        # create the SQLite database
npm run db:seed               # load 2 years of dummy data (optional)
npm run dev                   # starts on http://localhost:4000
```

### Frontend

```bash
cd frontend
npm install
npm run dev                   # starts on http://localhost:5173
```

The frontend proxies `/api` requests to `localhost:4000` in development.

---

## Environment Variables

### `backend/.env`

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | SQLite file path | `file:../data/resale.db` |
| `JWT_SECRET` | Secret for signing JWTs — **change before production** | — |
| `JWT_EXPIRES_IN` | Token lifetime | `8h` |
| `PORT` | Backend port | `4000` |
| `UPLOAD_DIR` | Photo upload directory | `./uploads/photos` |
| `MAX_PHOTO_SIZE_MB` | Max photo upload size | `10` |
| `CORS_ORIGIN` | Allowed origins (comma-separated) | `http://localhost:5173` |
| `SHOPIFY_STORE_DOMAIN` | `your-store.myshopify.com` | — |
| `SHOPIFY_ACCESS_TOKEN` | Shopify Admin API token | — |
| `SHOPIFY_ENABLED` | Set to `true` to activate Shopify sync | `false` |

### `frontend/.env` (production)

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Full URL of the backend (e.g. `https://api.yourdomain.com`) |

---

## Test Accounts (seed data)

After running `npm run db:seed`:

| Email | Password | Role |
|---|---|---|
| admin@example.com | admin123 | ADMIN |
| manager@example.com | manager123 | MANAGER |
| buyer@example.com | buyer123 | BUYER |
| seller@example.com | seller123 | SELLER |

---

## Key Features

- **Inventory management** — full CRUD with photos, condition, serial number, purchase/listing/sale prices
- **Role-based access** — field-level permission enforcement in the service layer
- **Stage pipeline** — advance bags through stages with a full audit trail
- **Photo uploads** — multi-photo support with primary photo designation
- **Reporting** — P&L (12-month chart), inventory by brand, sales velocity, buy vs. sell analysis, CSV export
- **Dashboard** — KPI cards, pipeline overview, top buyers/sellers leaderboard
- **User management** — admin can create users, change roles, designate manager types (Buying/Selling/Both), deactivate accounts
- **User profiles** — clickable profiles showing individual buy/sell history and stats
- **Shopify sync** — bags pushed to Shopify automatically when advanced to LISTED stage
- **Seller view** — sellers can browse all inventory with "My Bags" and "My Sales" tab filters

---

## Shopify Integration

Set `SHOPIFY_ENABLED=true` and fill in `SHOPIFY_STORE_DOMAIN` and `SHOPIFY_ACCESS_TOKEN` to activate. When a bag is advanced to the **LISTED** stage, it is pushed to Shopify as a product. The Shopify product ID and URL are stored on the bag record. The sync is fire-and-forget and does not block the API response.

---

## Deployment

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for the full step-by-step guide covering:

- EC2 setup (Node.js, PM2, nginx reverse proxy)
- S3 + CloudFront for the frontend
- GitHub Actions secrets configuration
- Production and dev environment setup

### CI/CD overview

| Trigger | Action |
|---|---|
| PR to `main` or `dev` | TypeScript typecheck |
| Push to `main` | Deploy to production EC2 + S3/CloudFront |
| Push to `dev` | Deploy to dev EC2 + S3/CloudFront |

---

## Database

SQLite is used for simplicity. The Prisma schema uses `String` fields in place of enums (SQLite does not support Prisma enum types). All migrations are in `backend/prisma/migrations/`.

To open Prisma Studio (visual DB browser):

```bash
cd backend && npm run db:studio
```

---

## Security Notes

- Generate a strong `JWT_SECRET` before production: `openssl rand -hex 32`
- The `backend/.env` file is gitignored — never commit it
- All secrets in CI/CD are stored as GitHub repository secrets
- Photo uploads are served as static files and scoped to the `uploads/` directory

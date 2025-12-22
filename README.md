# Card Inventory Management System

A full-stack application for managing baseball card inventory, including checklist uploads, consignment tracking for autographs, PSA/BGS grading submissions, and sales analytics.

## Features

- **Product Line Management** - Track Topps, Bowman, and other brands/sets
- **Checklist Upload** - Import CSV/Excel checklists with smart column detection
- **Inventory Tracking** - Track cards by signed/unsigned, raw/slabbed status
- **Consignment Management** - Track cards sent to graphers for autographs
- **Grading Submissions** - Track PSA, BGS, SGC submissions and grades
- **Financial Tracking** - Record purchases, sales, and profit analytics
- **Cost Basis Tracking** - Automatic cost basis calculation including consignment fees and grading costs

## Tech Stack

- **Frontend**: React 18, TypeScript, TanStack Query, Tailwind CSS
- **Backend**: FastAPI, SQLAlchemy 2.0 (async), Pydantic
- **Database**: PostgreSQL 16 with uuid-ossp and pg_trgm extensions

## Quick Start

### Using Docker Compose (Recommended)

```bash
# Clone and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Access the app
# Frontend: http://localhost:5173
# API Docs: http://localhost:8000/docs
```

### Manual Setup

#### Database

```bash
# Start PostgreSQL (or use existing instance)
createdb cardinventory

# Run schema
psql cardinventory < database/schema_v2.sql
```

#### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export DATABASE_URL="postgresql+asyncpg://user:pass@localhost:5432/cardinventory"
export DATABASE_URL_SYNC="postgresql://user:pass@localhost:5432/cardinventory"

# Run server
uvicorn app.main:app --reload
```

#### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Set API URL
export VITE_API_URL="http://localhost:8000/api"

# Run dev server
npm run dev
```

## Project Structure

```
card-inventory/
├── backend/
│   ├── app/
│   │   ├── routes/          # API endpoints
│   │   │   ├── products.py      # Brands & product lines
│   │   │   ├── checklists.py    # Card checklists & players
│   │   │   ├── inventory.py     # Inventory management
│   │   │   ├── financial.py     # Purchases & sales
│   │   │   ├── consignments.py  # Autograph consignments
│   │   │   └── grading.py       # PSA/BGS submissions
│   │   ├── services/        # Business logic
│   │   │   ├── checklist_parser.py
│   │   │   ├── inventory_service.py
│   │   │   ├── consignment_service.py
│   │   │   └── grading_service.py
│   │   ├── models.py        # SQLAlchemy models
│   │   ├── schemas.py       # Pydantic schemas
│   │   ├── database.py      # DB connection
│   │   ├── config.py        # Settings
│   │   └── main.py          # FastAPI app
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/           # React page components
│   │   │   ├── Dashboard.tsx
│   │   │   ├── ProductLines.tsx
│   │   │   ├── Checklists.tsx
│   │   │   ├── ChecklistUpload.tsx
│   │   │   ├── Inventory.tsx
│   │   │   ├── Consigners.tsx
│   │   │   ├── Consignments.tsx
│   │   │   ├── GradingSubmissions.tsx
│   │   │   ├── Purchases.tsx
│   │   │   └── Sales.tsx
│   │   ├── api/
│   │   │   └── client.ts    # API client
│   │   ├── types/
│   │   │   └── index.ts     # TypeScript types
│   │   └── App.tsx
│   ├── package.json
│   └── Dockerfile.dev
├── database/
│   └── schema_v2.sql        # PostgreSQL schema
└── docker-compose.yml
```

## API Endpoints

### Brands & Products
- `GET /api/brands` - List all brands
- `GET /api/product-lines` - List product lines with stats
- `POST /api/product-lines` - Create product line

### Checklists
- `GET /api/checklists` - Search/filter checklists
- `POST /api/checklists/upload/preview` - Preview CSV upload
- `POST /api/checklists/upload` - Import checklist

### Inventory
- `GET /api/inventory` - Search inventory
- `GET /api/inventory/analytics` - Dashboard stats
- `GET /api/inventory/players` - Player summaries
- `POST /api/inventory/bulk` - Bulk add items
- `POST /api/inventory/{id}/adjust` - Adjust quantity

### Consignments
- `GET /api/consigners` - List consigners
- `GET /api/consigners/{id}/stats` - Consigner performance
- `POST /api/consigners` - Create consigner
- `GET /api/consignments` - List consignments
- `POST /api/consignments` - Create consignment
- `POST /api/consignments/{id}/return` - Process return
- `POST /api/consignments/{id}/mark-paid` - Mark fee paid

### Grading
- `GET /api/grading/companies` - List grading companies with service levels
- `GET /api/grading/submissions` - List submissions
- `GET /api/grading/submissions/stats` - Grade statistics
- `POST /api/grading/submissions` - Create submission
- `PATCH /api/grading/submissions/{id}/status` - Update status
- `POST /api/grading/submissions/{id}/grades` - Enter grades

### Financial
- `GET /api/purchases` - List purchases
- `POST /api/purchases` - Record purchase (auto-adds to inventory)
- `GET /api/sales` - List sales
- `POST /api/sales` - Record sale (auto-removes from inventory)
- `GET /api/sales/analytics` - Revenue/profit analytics

## Inventory Status Model

Each inventory record tracks three dimensions:

| is_signed | is_slabbed | Example |
|-----------|------------|---------|
| false | false | Raw unsigned card |
| true | false | Raw signed card (from consignment) |
| false | true | Slabbed unsigned (PSA 10) |
| true | true | Slabbed auto (PSA 10 Auto 10) |

## Key Workflows

### 1. Adding New Product Line
1. Create product line (brand, name, year)
2. Upload checklist CSV/Excel
3. System auto-detects columns and creates cards/players

### 2. Consignment Flow
1. Create consignment with cards from inventory
2. Cards are removed from unsigned inventory
3. When returned, mark each card as signed/refused/lost
4. Signed cards move to signed inventory with fee added to cost

### 3. Grading Flow
1. Create submission with raw cards
2. Update status as it progresses (shipped → received → grading)
3. Enter grades when returned
4. Slabbed cards created with grade and cert number

### 4. Sales Flow
1. Record sale with items from inventory
2. System auto-calculates cost basis (purchase + consignment fees + grading fees)
3. Profit tracked per item and in aggregate

## Environment Variables

### Backend
- `DATABASE_URL` - Async PostgreSQL connection string
- `DATABASE_URL_SYNC` - Sync PostgreSQL connection string  
- `DEBUG` - Enable debug mode (default: false)
- `CORS_ORIGINS` - Allowed CORS origins (JSON array)

### Frontend
- `VITE_API_URL` - Backend API URL (default: http://localhost:8000/api)

## License

MIT

# Deployment Guide

Deploy the Card Inventory System:
- **Railway**: PostgreSQL database + FastAPI backend
- **Cloudflare Pages**: React frontend

---

## Step 1: Push to GitHub

```powershell
cd C:\Users\Brian\Desktop\IDGAS
git init
git add .
git commit -m "Initial commit"
```

Create a new repo on GitHub, then:
```powershell
git remote add origin https://github.com/YOUR_USERNAME/card-inventory.git
git branch -M main
git push -u origin main
```

---

## Step 2: Railway - Database & Backend

### 2a. Create Project

1. Go to [railway.app](https://railway.app)
2. Sign in with GitHub
3. Click **New Project**

### 2b. Add PostgreSQL

1. Click **Add Service** → **Database** → **PostgreSQL**
2. Wait for it to provision (takes ~30 seconds)
3. Click on the PostgreSQL service → **Data** tab → **Query**
4. Copy the entire contents of `database/schema_v2.sql`
5. Paste into the query editor → Click **Run Query**
6. Should see "Commands completed successfully"

### 2c. Add Backend

1. Click **Add Service** → **GitHub Repo**
2. Select your `card-inventory` repository
3. Click **Add Root Directory** → type `backend`
4. Wait for initial deploy (will fail - that's okay, we need to add variables)

5. Click on the backend service → **Variables** tab
6. Add these variables:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `CORS_ORIGINS` | `["https://YOUR-SITE.pages.dev"]` |
| `DEBUG` | `false` |

> ⚠️ Leave `CORS_ORIGINS` as placeholder for now. Update after Cloudflare deploy.

7. Railway will auto-redeploy with the new variables

### 2d. Get Backend URL

1. Click on backend service → **Settings** → **Networking**
2. Click **Generate Domain**
3. Copy the URL (e.g., `https://card-inventory-backend-production.up.railway.app`)
4. Test it: visit `https://YOUR-BACKEND.up.railway.app/docs` - should see Swagger UI

---

## Step 3: Cloudflare Pages - Frontend

### 3a. Connect to Cloudflare

1. Go to [pages.cloudflare.com](https://pages.cloudflare.com)
2. Sign in / create account
3. Click **Create a project** → **Connect to Git**
4. Select your GitHub repository

### 3b. Configure Build

Set these build settings:

| Setting | Value |
|---------|-------|
| **Project name** | `card-inventory` (or whatever you want) |
| **Production branch** | `main` |
| **Framework preset** | `None` |
| **Root directory** | `frontend` |
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |

### 3c. Add Environment Variable

Before clicking deploy, expand **Environment variables** and add:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://YOUR-BACKEND.up.railway.app/api` |

> Replace `YOUR-BACKEND` with your actual Railway backend URL from Step 2d.

### 3d. Deploy

1. Click **Save and Deploy**
2. Wait for build to complete (~1-2 minutes)
3. Get your Cloudflare Pages URL (e.g., `https://card-inventory.pages.dev`)

---

## Step 4: Update CORS on Railway

Now that you have the Cloudflare URL, update the backend:

1. Go to Railway → Backend service → **Variables**
2. Update `CORS_ORIGINS`:
   ```
   ["https://card-inventory.pages.dev"]
   ```
   (Use your actual Cloudflare Pages URL)
3. Railway will auto-redeploy

---

## Step 5: Verify Everything Works

1. Visit your Cloudflare Pages URL
2. Should see the Card Inventory dashboard
3. Try creating a product line to verify API connection

---

## Environment Variables Summary

### Railway Backend
| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `CORS_ORIGINS` | `["https://your-site.pages.dev"]` |
| `DEBUG` | `false` |

### Cloudflare Pages Frontend
| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://your-backend.up.railway.app/api` |

---

## Custom Domains (Optional)

### Railway Backend
1. Backend service → **Settings** → **Networking**
2. Add custom domain (e.g., `api.yourcards.com`)

### Cloudflare Pages Frontend
1. Project → **Custom domains**
2. Add domain (e.g., `yourcards.com`)
3. Update DNS records as instructed

After adding custom domains, update:
- Railway `CORS_ORIGINS` with new frontend domain
- Cloudflare `VITE_API_URL` with new backend domain

---

## Troubleshooting

### Backend won't start on Railway
- Check **Deployments** → click failed deploy → **View Logs**
- Verify `DATABASE_URL` uses `${{Postgres.DATABASE_URL}}` syntax
- Make sure schema was run in PostgreSQL

### Frontend shows "Network Error" or CORS errors
- Check browser DevTools → Console for exact error
- Verify `CORS_ORIGINS` on Railway includes your exact Cloudflare URL
- Make sure URL includes `https://` and no trailing slash

### API calls fail with 404
- Check `VITE_API_URL` ends with `/api`
- Example: `https://backend.up.railway.app/api` ✅
- Not: `https://backend.up.railway.app` ❌

### Pages shows blank or routing errors
- The `_redirects` file in `public/` folder handles SPA routing
- Make sure build output includes this file

### Database connection errors on Railway
- The `${{Postgres.DATABASE_URL}}` syntax auto-references your PostgreSQL service
- Railway handles the postgres:// → postgresql:// conversion

---

## Costs

### Railway
- Free tier: $5/month credit (enough for small projects)
- PostgreSQL + Backend typically ~$5-7/month for low usage

### Cloudflare Pages
- **Free tier**: 500 builds/month, unlimited bandwidth
- Perfect for static frontend hosting

---

## Updating the App

After pushing changes to GitHub:

- **Backend**: Railway auto-deploys on push to `main`
- **Frontend**: Cloudflare Pages auto-deploys on push to `main`

No manual deployment needed!

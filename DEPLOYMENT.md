# InfixMart — Hostinger Deployment Guide

Push to GitHub → Connect to Hostinger → Add env vars → Done.

---

## Prerequisites

- Hostinger **Business/Cloud** plan (Node.js support required)
- A MySQL database created in Hostinger hPanel
- A domain pointed to your Hostinger account
- GitHub repository with this code

---

## Step 1 — Prepare GitHub

```bash
# On your local machine:
npm run check:production
npm run build
git add .
git commit -m "chore: prepare for production"
git push origin main
```

Make sure `.env.local` is **NOT** committed (it's in `.gitignore`).
The production env preflight above should pass before you push.

---

## Step 2 — Create MySQL Database on Hostinger

1. hPanel → **Databases** → **MySQL Databases**
2. Create a new database, e.g. `infixmart_db`
3. Create a database user with a **strong password**
4. Assign the user to the database (All Privileges)
5. Note the **hostname** (usually `localhost`), **database name**, **username**, **password**

---

## Step 3 — Set Up Node.js App on Hostinger

1. hPanel → **Website** → **Node.js**
2. Click **Create Application**
3. Set:
   - **Node.js version**: `20.x` (LTS)
   - **Application root**: `/` (repo root)
   - **Application startup file**: `node_modules/.bin/next` *(or use PM2 — see Step 5)*
   - **Application URL**: your domain

---

## Step 4 — Connect GitHub Repository

1. In hPanel → **Git** (or the Node.js app settings)
2. Connect your GitHub repository
3. Select branch: `main`
4. Enable **Auto-deploy on push** (optional but recommended)

Hostinger will automatically run:
```
npm install
npm run build
npm start
```

Do not commit `.next/` from your local machine. Let Hostinger build the app from source on the server so the generated chunks, CSS files, and manifests match the production environment.

Do not keep a static-hosting fallback file like `public/_redirects` with `/* /index.html 200` in this project. That rule is for SPA/static hosting and can break Next.js asset requests such as `/_next/static/...` on platforms that honor it.

---

## Step 5 — Add Environment Variables

In hPanel → **Node.js** → your app → **Environment Variables**, add:

```
NODE_ENV=production
PORT=3000

DB_HOST=localhost
DB_PORT=3306
DB_NAME=your_database_name
DB_USER=your_database_username
DB_PASSWORD=your_strong_password

JWT_SECRET=<generate: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
JWT_SECRET_ACCESS_TOKEN=<generate another>
JWT_SECRET_REFRESH_TOKEN=<generate another>
PAYMENT_STATE_SECRET=<generate another>

SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=support@yourdomain.com
SMTP_PASS=your_email_password

FRONTEND_URL=https://www.yourdomain.com
FRONTEND_URL_WWW=https://yourdomain.com

ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=YourVeryStrongAdminPassword@2024
ADMIN_NAME=Admin

RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret

NEXT_PUBLIC_API_URL=https://www.yourdomain.com
NEXT_PUBLIC_SITE_URL=https://www.yourdomain.com
NEXT_PUBLIC_SITE_NAME=InfixMart Wholesale
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxx
```

> **Generate JWT secrets** (run in any terminal with Node.js):
> ```
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```
> Run this 4 times, and use a different value for each secret above.

---

## Step 6 — Deploy & Build

1. In hPanel → **Node.js** → click **Restart** or **Deploy**
2. Wait for build to complete (2–5 minutes for `next build`)
3. Check logs for any errors

---

## Step 7 — Create Admin User

After the first successful deploy, run the admin creation script **once**:

In hPanel → **Node.js** → **Terminal** (or SSH):
```bash
npm run create-admin
```

This creates the admin account using `ADMIN_EMAIL` and `ADMIN_PASSWORD` from your env vars.

Admin panel: `https://www.yourdomain.com/admin`

---

## Step 8 — Verify Deployment

Check these URLs:
- `https://www.yourdomain.com` — Homepage
- `https://www.yourdomain.com/api/health` — API health (should return `{"status":"ok"}`)
- `https://www.yourdomain.com/admin` — Admin login

---

## Updating the App

```bash
# Make your changes locally, then:
git add .
git commit -m "feat: your change description"
git push origin main
```

If auto-deploy is enabled, Hostinger will rebuild automatically.  
Otherwise, go to hPanel → Node.js → **Restart**.

---

## Uploads / User Files

Uploaded images are stored in the `uploads/` directory on the server.
They persist between deploys as long as you don't delete the app.

> **Important:** If you reset/delete the Node.js app, uploaded files will be lost.
> Consider backing up the `uploads/` folder periodically via FTP/SFTP.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| App won't start | Check Node.js logs in hPanel; ensure all env vars are set |
| Database connection error | Verify DB_HOST, DB_NAME, DB_USER, DB_PASSWORD in env vars |
| 502 Bad Gateway | App is starting — wait 30s and refresh; or check build errors |
| Emails not sending | Verify SMTP_USER and SMTP_PASS; test via `/api/admin/test-email` |
| Razorpay payment fails | Ensure live keys match and Razorpay auto-capture is enabled for the account |
| CORS errors | Add your domain to FRONTEND_URL and FRONTEND_URL_WWW env vars |
| Admin login fails | Run `npm run create-admin` again after ensuring ADMIN_* env vars are set |

---

## Security Checklist

- [ ] `.env.local` is NOT in git history
- [ ] `npm run check:production` passes with your real production env values
- [ ] JWT and payment secrets are all unique random 64-byte hex strings  
- [ ] DB password is strong (16+ chars, mixed case, numbers, symbols)
- [ ] Admin password is changed from default
- [ ] Razorpay live keys are used (not test keys)
- [ ] HTTPS is enabled (Hostinger provides free SSL)
- [ ] Google OAuth authorized domains include your production domain

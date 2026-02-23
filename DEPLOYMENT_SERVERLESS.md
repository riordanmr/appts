# Deployment Guide: Azure Static Web Apps + Functions

## Architecture Overview

This application uses a **true serverless architecture** optimized for cost and simplicity:

```
Azure Static Web Apps (Frontend) - FREE
├── Serves HTML/CSS/JS from global CDN
├── Auto-routes /api/* to Azure Functions
├── Handles HTTPS, HTTP/2, caching
└── GitHub Actions auto-deploy

Azure Functions (Backend) - PAY-PER-USE
├── HTTP triggers for API endpoints
├── Timer trigger for reminders
└── Only costs when functions execute

Azure Table Storage (Database) - MINIMAL
├── NoSQL data persistence
└── Free tier available
```

### Cost Breakdown
- **Static Web Apps**: $0/month (free tier)
- **Functions**: ~$0-1/month (1M executions free)
- **Table Storage**: $0/month (free tier for small volume)
- **Total**: **$0-1/month** for typical salon ✓

## Prerequisites
- Azure account (free tier available at https://azure.microsoft.com/en-us/free/)
- GitHub account
- Node.js 18+ (for local testing)

## Deployment Steps (Recommended: GitHub Actions)

### 1. Create Azure Static Web App

1. Go to https://portal.azure.com
2. Click "+ Create Resource" → Search "Static Web App"
3. Fill in:
   - **Name**: `appts-salon` (or your choice)
   - **Free plan**: Select this ✓
   - **Region**: East US (or closest to you)
   - **Sign in with GitHub**: Click to authorize
4. Select your GitHub repository and branch
5. Build details:
   - **Framework preset**: None (custom)
   - **App location**: `./public`
   - **API location**: (leave blank)
   - **Output location**: (leave blank)
6. Click "Review + Create" → "Create"

**GitHub Actions is automatically configured!** Each push will deploy.

### 2. Create Azure Storage Account

1. Click "+ Create Resource" → Search "Storage Account"
2. Fill in:
   - **Name**: `appts<random>` (must be globally unique, lowercase alphanumeric only)
   - **Region**: Same as Static Web App
   - **Performance**: Standard
   - **Redundancy**: LRS (Locally Redundant Storage)
3. Click "Review + Create" → "Create"
4. After creation:
   - Go to "Access Keys" (in left sidebar)
   - Copy **Connection String** (save this)

### 3. Create Azure Function App

1. Click "+ Create Resource" → Search "Function App"
2. Fill in:
   - **Name**: `appts-functions` (or your choice)
   - **Runtime**: Node.js 18 LTS
   - **Region**: Same as other resources
   - **Plan type**: **Consumption (Serverless)** ✓
   - **Storage account**: Select the one from Step 2
3. Click "Review + Create" → "Create"

### 4. Configure Function App

After creation:

1. Go to Function App → **Configuration** (left sidebar)
2. Click **+ New application setting** and add each of these:

```
AZURE_STORAGE_CONNECTION_STRING=<paste-connection-string-from-step-2>
JWT_SECRET=<generate-below>
BUSINESS_HOURS_START=9
BUSINESS_HOURS_END=18
```

Optional (for notifications):
```
EMAIL_API_KEY=<sendgrid-api-key>
EMAIL_FROM=noreply@yoursalon.com
TWILIO_ACCOUNT_SID=<twilio-sid>
TWILIO_AUTH_TOKEN=<twilio-auth-token>
TWILIO_PHONE_NUMBER=+1234567890
BUSINESS_NAME=Your Salon Name
```

**Generate secure JWT_SECRET:**
```bash
# Mac/Linux
openssl rand -base64 32

# Or Python
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

Click **Save** after each addition.

### 5. Link Functions to Static Web App

1. Go to Static Web App → **API configuration** (left sidebar)
2. Fill in:
   - **Backend resource type**: Function App
   - **Subscription**: Select your subscription
   - **Backend resource name**: `appts-functions`
   - **Backend path**: `/api`
3. Click **Save**

### 6. Deploy Functions Code

The code is deployed when you push to GitHub. Make sure your repo structure is:

```
/public/           (already in repo)
/src/functions/    (already in repo)
/staticwebapp.config.json  (already in repo)
package.json       (already in repo)
```

Push any changes:
```bash
git add .
git commit -m "Deploy to Azure"
git push origin main
```

Check deployment:
1. Go to Static Web App → **Workflows** (in GitHub settings)
2. Should see successful workflow run

### 7. Verify Deployment

After 2-3 minutes:

1. Go to Static Web App → **Overview**
2. Click the **URL** (something like `https://kind-river-abc123.azurestaticapps.net`)
3. You should see the customer portal

**Test the system:**
- Login: `admin@salon.com` / `admin123`
- Check `/stylist` page
- Check `/api/health` should return `{"status":"healthy"}`

## Optional: Set Up Notifications

### SendGrid (Email)

1. Sign up at https://sendgrid.com (free tier: 100 emails/day)
2. Create API key:
   - Settings → API Keys → Create Key
   - Select "Mail Send" permission only
   - Copy the key
3. Add to Function App settings:
   ```
   EMAIL_API_KEY=<your-key>
   EMAIL_FROM=noreply@yoursalon.com
   ```

### Twilio (SMS)

1. Sign up at https://twilio.com (pay-as-you-go)
2. Get credentials from Dashboard:
   - Account SID
   - Auth Token
   - Buy/verify a phone number
3. Add to Function App settings:
   ```
   TWILIO_ACCOUNT_SID=<sid>
   TWILIO_AUTH_TOKEN=<token>
   TWILIO_PHONE_NUMBER=+1234567890
   ```

## Post-Deployment

### ⚠️ Change Default Admin Password

Default credentials are:
- Email: `admin@salon.com`
- Password: `admin123`

**You MUST change this!** 
- Log in to stylist portal
- There's no password change UI yet—manually update in Table Storage via Azure Portal

### Add Stylists

Currently no admin UI for adding stylists. Manual options:

**Option 1: Azure Portal**
1. Go to Storage Account → Tables
2. Find `stylists` table
3. Add entity with properties:
   - `partitionKey`: STYLIST
   - `rowKey`: stylist-{uniqueid}
   - `name`: Stylist name
   - `bio`: Bio (optional)
   - `active`: true

**Option 2: Code solution** (future enhancement)
- Add admin panel to `/admin` route
- Add stylists UI before deployment

## Troubleshooting

### Static Web App returns 404

**Cause**: `staticwebapp.config.json` not deployed

**Fix**:
1. Verify file is in repo root
2. Push changes: `git add . && git commit -m "fix" && git push`
3. Check GitHub Actions workflow succeeds

### Can't log in / Functions error

**Cause**: Missing environment variables

**Fix**:
1. Go to Function App → Configuration
2. Verify all `AZURE_STORAGE_CONNECTION_STRING` and `JWT_SECRET` are set
3. Click **Save**
4. Go to Overview → **Restart**

### High Azure bill

**Cause**: Usually API spam or infinite loops

**Fix**:
1. Check Function App → Monitor
2. See which function is executing most
3. Check logs: Function App → Log Stream
4. First 1M executions/month are free

## Local Development & Testing

For testing locally before deploying:

```bash
# 1. Install dependencies
npm install
npm install -g azure-functions-core-tools@4
npm install -g azurite

# 2. Create .env file
cat > src/functions/.env << EOF
AZURE_STORAGE_CONNECTION_STRING=UseDevelopmentStorage=true
JWT_SECRET=dev-secret-key
BUSINESS_HOURS_START=9
BUSINESS_HOURS_END=18
EOF

# 3. Start local storage (Terminal 1)
azurite --silent --location ./azurite-data

# 4. Start Functions (Terminal 2)
npm start

# 5. Serve static files (Terminal 3)
npx http-server ./public -p 8080

# 6. Open browsers
# Customer: http://localhost:8080
# Stylist: http://localhost:8080/stylist
# API: http://localhost:7071/api/health
```

## Monitoring & Logs

### View Function Logs

1. Go to Function App → **Log Stream**
2. See real-time output:
   ```
   [INFO] Running reminder check...
   [INFO] Sent 3 reminder(s)
   ```

### View Static Web App Logs

1. Go to Static Web App → **Build history**
2. Click latest workflow
3. See deployment logs

## Need Help?

- **Azure Support**: portal.azure.com → Help + Support
- **GitHub Actions Logs**: Your repo → Actions → Latest run
- **Function Logs**: Function App → Log Stream
- **Documentation**: https://learn.microsoft.com/en-us/azure/azure-functions/

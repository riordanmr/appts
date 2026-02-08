# Deployment Guide for Azure Functions (Serverless)

## Architecture Overview

This application uses a **serverless architecture** with Azure Functions and Azure Table Storage - **no continuously running services** required!

### Services Used
- **Azure Functions**: Event-driven compute (HTTP triggers + Timer trigger)
- **Azure Table Storage**: NoSQL storage for all data
- **SendGrid**: Email notifications (100 free emails/day)
- **Twilio**: SMS notifications (pay-per-use)

### Cost Advantages
- ✅ **No always-on compute costs** - only pay when functions execute
- ✅ **Automatic scaling** - handles traffic spikes without manual intervention
- ✅ **Zero-cost Table Storage tier** available with consumption plan
- ✅ **1 million free function executions per month**

## Prerequisites
- Azure account
- Azure CLI installed (optional, can use Azure Portal)
- Node.js 18+ installed locally for testing

## Deployment Steps

### Option 1: Azure Portal Deployment

#### 1. Create Azure Storage Account
1. Go to Azure Portal (portal.azure.com)
2. Create new Storage Account
   - Performance: Standard
   - Replication: LRS (Locally-Redundant Storage)
   - Account kind: StorageV2
3. After creation, go to "Access keys" and copy the connection string

#### 2. Create Azure Function App
1. Create new Function App
   - Runtime: Node.js 18 LTS
   - Operating System: Linux
   - Plan type: **Consumption (Serverless)**
   - Storage: Use the storage account created above
2. After creation, go to Configuration → Application settings

#### 3. Configure Environment Variables
Add these application settings:

```
AZURE_STORAGE_CONNECTION_STRING=<your-storage-connection-string>
JWT_SECRET=<your-secure-random-string>
EMAIL_API_KEY=<your-sendgrid-api-key>
EMAIL_FROM=noreply@yourdomain.com
TWILIO_ACCOUNT_SID=<your-twilio-account-sid>
TWILIO_AUTH_TOKEN=<your-twilio-auth-token>
TWILIO_PHONE_NUMBER=+1234567890
BUSINESS_NAME=Your Salon Name
BUSINESS_HOURS_START=9
BUSINESS_HOURS_END=18
```

#### 4. Deploy Code
Option A - Via GitHub:
1. Go to Deployment Center in Function App
2. Choose GitHub as source
3. Authorize and select repository
4. Choose branch and save
5. Deployment happens automatically

Option B - Via VS Code:
1. Install Azure Functions extension
2. Sign in to Azure
3. Right-click on Function App
4. Select "Deploy to Function App"

#### 5. Configure CORS (for local testing)
1. Go to Function App → CORS
2. Add `http://localhost:7071` for local testing
3. Add your custom domain when deployed

### Option 2: Azure CLI Deployment

```bash
# Login to Azure
az login

# Create resource group
az group create --name appts-rg --location eastus

# Create storage account
az storage account create \
  --name apptstorageacct \
  --resource-group appts-rg \
  --location eastus \
  --sku Standard_LRS

# Get storage connection string
STORAGE_CONNECTION=$(az storage account show-connection-string \
  --name apptstorageacct \
  --resource-group appts-rg \
  --query connectionString -o tsv)

# Create Function App (Consumption Plan)
az functionapp create \
  --name appts-func \
  --resource-group appts-rg \
  --consumption-plan-location eastus \
  --runtime node \
  --runtime-version 18 \
  --functions-version 4 \
  --storage-account apptstorageacct

# Configure app settings
az functionapp config appsettings set \
  --name appts-func \
  --resource-group appts-rg \
  --settings \
    AZURE_STORAGE_CONNECTION_STRING="$STORAGE_CONNECTION" \
    JWT_SECRET="your-secret" \
    EMAIL_API_KEY="your-sendgrid-key" \
    EMAIL_FROM="noreply@yourdomain.com" \
    TWILIO_ACCOUNT_SID="your-sid" \
    TWILIO_AUTH_TOKEN="your-token" \
    TWILIO_PHONE_NUMBER="+1234567890" \
    BUSINESS_NAME="Your Salon"

# Deploy code (from repository root)
func azure functionapp publish appts-func
```

## Local Development

### 1. Install Azure Functions Core Tools
```bash
npm install -g azure-functions-core-tools@4
```

### 2. Create local.settings.json
```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AZURE_STORAGE_CONNECTION_STRING": "UseDevelopmentStorage=true",
    "JWT_SECRET": "test-secret",
    "BUSINESS_NAME": "Test Salon",
    "BUSINESS_HOURS_START": "9",
    "BUSINESS_HOURS_END": "18"
  }
}
```

### 3. Install Azurite (Storage Emulator)
```bash
npm install -g azurite
```

### 4. Run Locally
```bash
# Terminal 1: Start Azurite
azurite --silent --location ./azurite --debug ./azurite/debug.log

# Terminal 2: Start Functions
npm start
# or
func start

# Access at http://localhost:7071
```

## Third-Party Services Setup

### SendGrid (Email)
1. Sign up at sendgrid.com
2. Create API key with "Mail Send" permissions
3. Verify sender email
4. Add API key to Azure Function App settings

### Twilio (SMS)
1. Sign up at twilio.com
2. Get account SID and auth token
3. Get a Twilio phone number
4. Add credentials to Azure Function App settings

## Cost Breakdown (Serverless) 💰

### Azure Services
- **Azure Functions**: 
  - First 1M executions/month: FREE
  - Typical usage for small salon: ~50K executions/month
  - Cost: $0/month (within free tier)
  
- **Azure Table Storage**:
  - First 100GB: FREE with consumption plan
  - Typical usage: < 1GB
  - Cost: $0/month

- **Bandwidth**:
  - First 100GB outbound: FREE
  - Cost: $0/month

### Third-Party Services
- **SendGrid**: Free tier (100 emails/day) - $0/month
- **Twilio SMS**: ~$0.0075 per SMS
  - Estimate 100 SMS/month: ~$0.75/month

**Total Estimated Cost: $0-2/month** 🎉

Compare to previous architecture:
- Old: $15-20/month (always-on VM)
- New: $0-2/month (serverless)
- **Savings: ~$200/year!**

## API Endpoints

All functions are accessible via Function App URL:
```
https://<your-function-app>.azurewebsites.net/api/
```

### Authentication
- POST `/api/register` - Register new user
- POST `/api/login` - User login

### Services & Stylists
- GET `/api/services` - List all services
- GET `/api/stylists` - List all stylists

### Appointments
- GET `/api/appointments/availability` - Get available time slots
- POST `/api/appointments` - Create appointment (requires auth)
- GET `/api/appointments/my-appointments` - Get user's appointments (requires auth)
- GET `/api/appointments/stylist-appointments` - Get stylist's appointments (requires stylist auth)
- PUT `/api/appointments/{id}` - Update appointment (requires stylist auth)
- DELETE `/api/appointments/{id}` - Delete appointment (requires stylist auth)

### Scheduled Functions
- Timer trigger: Runs hourly to send appointment reminders

## Monitoring

### View Logs
1. Go to Function App in Azure Portal
2. Select "Log stream" to see real-time logs
3. Or use Application Insights for detailed analytics

### Enable Application Insights (Recommended)
1. Go to Function App → Application Insights
2. Click "Turn on Application Insights"
3. Create new instance or use existing
4. View metrics, logs, and performance data

## Troubleshooting

### Functions not executing
- Check Application Settings are configured
- Verify Storage Account connection string
- Review Function App logs

### Table Storage errors
- Ensure AZURE_STORAGE_CONNECTION_STRING is set
- Verify storage account is accessible
- Check firewall rules if using network restrictions

### Email/SMS not sending
- Verify SendGrid API key and sender verification
- Check Twilio credentials and phone number
- Review function logs for specific errors

## Scaling

The serverless architecture automatically scales:
- **Automatic**: Azure manages scaling based on load
- **No configuration needed**: Works out of the box
- **Cost-effective**: Only pay for actual usage
- **Handles spikes**: Can scale to thousands of concurrent requests

## Security

- ✅ HTTPS enforced by default on Azure Functions
- ✅ Managed service updates (no VM patching required)
- ✅ Environment variables stored securely in App Settings
- ✅ Optional: Enable authentication/authorization in Function App settings
- ✅ Optional: Integrate with Azure AD for enterprise auth

## Backup & Disaster Recovery

### Data Backup
Azure Table Storage provides:
- Built-in redundancy (LRS/GRS)
- Point-in-time restore (if enabled)
- Export data using Azure Storage Explorer

### Function Code
- Stored in GitHub (version controlled)
- Automated deployment from repository
- Easy rollback to previous versions

## Next Steps

After deployment:
1. Test all endpoints using the Function App URL
2. Set up monitoring alerts in Application Insights
3. Configure custom domain (optional)
4. Enable authentication providers (optional)
5. Set up staging slots for testing (optional)

## Support

For issues or questions:
1. Check function logs in Azure Portal
2. Review Application Insights for errors
3. Verify environment variables are set correctly
4. Test locally with Azurite for debugging

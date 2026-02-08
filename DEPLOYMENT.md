# Deployment Guide for Azure App Service

## Prerequisites
- Azure account
- Azure CLI installed (optional, can use Azure Portal)
- Node.js 18+ installed locally for testing

## Deployment Steps

### Option 1: Azure Portal Deployment

1. **Create Azure App Service**
   - Go to Azure Portal (portal.azure.com)
   - Create new Web App
   - Choose Runtime: Node 18 LTS
   - Choose Basic B1 tier (cost-effective for small business)
   - Operating System: Linux

2. **Configure Environment Variables**
   Go to Configuration → Application settings and add:
   ```
   JWT_SECRET=your-secure-random-string
   EMAIL_API_KEY=your-sendgrid-api-key
   EMAIL_FROM=noreply@yourdomain.com
   TWILIO_ACCOUNT_SID=your-twilio-account-sid
   TWILIO_AUTH_TOKEN=your-twilio-auth-token
   TWILIO_PHONE_NUMBER=+1234567890
   BUSINESS_NAME=Your Salon Name
   BUSINESS_HOURS_START=9
   BUSINESS_HOURS_END=18
   NODE_ENV=production
   ```

3. **Deploy Code**
   - Go to Deployment Center
   - Choose GitHub as source
   - Authorize and select repository
   - Choose branch: main (or your branch)
   - Save

4. **Database Persistence**
   - The SQLite database will be stored in the app's filesystem
   - For production, consider Azure SQL Database for better reliability
   - Add mount storage in Configuration → Path mappings if needed

### Option 2: Azure CLI Deployment

```bash
# Login to Azure
az login

# Create resource group
az group create --name appts-rg --location eastus

# Create App Service plan
az appservice plan create --name appts-plan --resource-group appts-rg --sku B1 --is-linux

# Create web app
az webapp create --resource-group appts-rg --plan appts-plan --name your-app-name --runtime "NODE:18-lts"

# Configure environment variables
az webapp config appsettings set --resource-group appts-rg --name your-app-name --settings \
  JWT_SECRET="your-secret" \
  EMAIL_API_KEY="your-sendgrid-key" \
  EMAIL_FROM="noreply@yourdomain.com" \
  TWILIO_ACCOUNT_SID="your-sid" \
  TWILIO_AUTH_TOKEN="your-token" \
  TWILIO_PHONE_NUMBER="+1234567890" \
  BUSINESS_NAME="Your Salon" \
  NODE_ENV="production"

# Deploy from local git
az webapp deployment source config-local-git --name your-app-name --resource-group appts-rg

# Push code
git remote add azure <deployment-url>
git push azure main
```

## Third-Party Services Setup

### SendGrid (Email)
1. Sign up at sendgrid.com
2. Create API key
3. Verify sender email
4. Add API key to Azure environment variables

### Twilio (SMS)
1. Sign up at twilio.com
2. Get account SID and auth token
3. Get a Twilio phone number
4. Add credentials to Azure environment variables

## Cost Optimization

This setup is designed to be cost-effective:
- **App Service**: Basic B1 tier (~$13/month)
- **Database**: SQLite (free, included)
- **SendGrid**: Free tier (100 emails/day)
- **Twilio**: Pay-as-you-go (low cost for small volume)

**Estimated monthly cost: ~$15-20**

## Default Credentials

**Admin Account**:
- Email: admin@salon.com
- Password: admin123

**Note**: Change this password immediately after first login!

## Setting Up Stylists

To add stylists:
1. Create a user account with stylist role in the database
2. Or use the admin account to manage stylists (future feature)

For now, to create a stylist:
```sql
-- Insert a stylist user
INSERT INTO users (email, phone, password, name, role) 
VALUES ('stylist@salon.com', '+1234567890', '<bcrypt-hash>', 'Jane Stylist', 'stylist');

-- Get the user ID and create stylist profile
INSERT INTO stylists (user_id, bio, active) 
VALUES (2, 'Professional stylist with 10 years experience', 1);
```

## Testing Locally

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your values
nano .env

# Start server
npm start

# Access at http://localhost:3000
```

## Troubleshooting

1. **Database not initializing**: Check write permissions
2. **Emails not sending**: Verify SendGrid API key and sender verification
3. **SMS not sending**: Verify Twilio credentials and phone number format
4. **App not starting**: Check application logs in Azure Portal

## Monitoring

- View logs in Azure Portal → Log Stream
- Set up Application Insights for detailed monitoring (optional)
- Monitor costs in Cost Management

## Security Notes

- Always use HTTPS in production (enabled by default on Azure)
- Change default admin password
- Keep JWT_SECRET secure and random
- Regularly update dependencies
- Consider implementing rate limiting for production

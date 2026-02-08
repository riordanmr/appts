# Hair Salon Appointment Management System (Serverless)

A **serverless**, cost-optimized Azure application for managing appointments at small haircut businesses using Azure Functions and Azure Table Storage.

## 🎯 Key Features

**No services running all the time!** This app uses Azure Functions (serverless compute) and Azure Table Storage instead of always-on VMs or databases.

### Architecture Highlights
- ⚡ **Event-driven**: Functions only run when triggered (HTTP requests or scheduled times)
- 💰 **Cost-effective**: $0-2/month vs $15-20/month for VM-based solutions
- 📈 **Auto-scaling**: Automatically handles traffic spikes
- 🔒 **Secure**: Managed Azure services with built-in security

## Features

### Customer Portal
- User registration and login
- Browse services (haircut, coloring, highlights, etc.)
- Select stylist or choose "Any Available"
- View available time slots on calendar
- Book appointments
- Automatic email and SMS confirmation
- Reminder notifications 1 day before appointment
- View appointment history

### Stylist Portal
- Secure login for stylists and admin
- View all upcoming appointments
- Edit appointment details (date, time, status)
- Delete appointments
- See customer contact information
- Update appointment status (scheduled, completed, cancelled, no-show)

## Technology Stack

- **Compute**: Azure Functions (serverless)
- **Database**: Azure Table Storage (NoSQL, serverless)
- **Authentication**: JWT (JSON Web Tokens)
- **Email**: SendGrid (100 free emails/day)
- **SMS**: Twilio (pay-as-you-go)
- **Frontend**: Vanilla JavaScript, HTML5, CSS3

## Cost Breakdown 💰

### Monthly Costs
- **Azure Functions**: $0 (1M free executions/month)
- **Azure Table Storage**: $0 (100GB free with consumption plan)
- **SendGrid**: $0 (free tier: 100 emails/day)
- **Twilio SMS**: ~$0.75-2/month (pay-per-SMS)

**Total: $0-2/month** 🎉

### Comparison
- **Previous (VM-based)**: $15-20/month
- **New (Serverless)**: $0-2/month  
- **Annual Savings**: ~$200/year

## Quick Start

### Local Development

1. **Install prerequisites**:
```bash
# Install Azure Functions Core Tools
npm install -g azure-functions-core-tools@4

# Install Azurite (storage emulator)
npm install -g azurite

# Install dependencies
npm install
```

2. **Create local.settings.json**:
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

3. **Run locally**:
```bash
# Terminal 1: Start storage emulator
azurite

# Terminal 2: Start functions
npm start

# Access at http://localhost:7071
```

## Deployment to Azure

See [DEPLOYMENT_SERVERLESS.md](DEPLOYMENT_SERVERLESS.md) for complete deployment instructions.

### Quick Deploy (Azure CLI)
```bash
# Create Function App
az functionapp create \
  --name your-app-name \
  --resource-group your-rg \
  --consumption-plan-location eastus \
  --runtime node \
  --runtime-version 18 \
  --functions-version 4 \
  --storage-account your-storage

# Deploy code
func azure functionapp publish your-app-name
```

## Project Structure

```
appts/
├── src/
│   ├── functions/
│   │   ├── auth.js              # Registration & login
│   │   ├── appointments.js      # Appointment CRUD
│   │   ├── services.js          # Service listings
│   │   ├── stylists.js          # Stylist listings
│   │   ├── reminders.js         # Timer-triggered reminders
│   │   └── static.js            # Serve HTML/CSS/JS
│   └── shared/
│       ├── tableStorage.js      # Azure Table Storage operations
│       └── utils/
│           ├── auth.js          # JWT authentication
│           └── notifications.js # Email & SMS
├── public/
│   ├── index.html               # Customer portal
│   ├── stylist.html             # Stylist portal
│   ├── css/
│   │   └── style.css            # Styles
│   └── js/
│       ├── app.js               # Customer portal logic
│       └── stylist.js           # Stylist portal logic
├── host.json                    # Azure Functions config
├── package.json                 # Dependencies
└── .env.example                 # Configuration template
```

## Why Serverless?

Traditional VM-based apps:
- ❌ Pay for idle time (24/7 even with zero traffic)
- ❌ Manual scaling configuration
- ❌ Server maintenance and patching
- ❌ Higher complexity

Serverless apps:
- ✅ Pay only for execution time
- ✅ Automatic scaling
- ✅ Zero maintenance
- ✅ Simpler deployment

Perfect for small businesses with variable traffic patterns!

## License

See [LICENSE](LICENSE) file for details.

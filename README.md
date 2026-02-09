# Hair Salon Appointments - Serverless Edition

**Pure serverless appointment booking system** using Azure Static Web Apps (frontend), Azure Functions (backend), and Table Storage (database). Zero servers, zero database management, minimal cost.

## Architecture

- **Frontend**: Static HTML/CSS/JS hosted on **Azure Static Web Apps** (free tier, CDN-backed)
- **Backend**: Azure Functions for API endpoints (HTTP triggers)
- **Database**: Azure Table Storage (NoSQL)
- **Notifications**: SendGrid (email) + Twilio (SMS)

## Cost Efficiency

- ✅ **$0-1/month** for typical salon (free static hosting + consumption Functions)
- ✅ **No servers to manage** - fully managed platform
- ✅ **Auto-scaling** - handles traffic spikes automatically
- ✅ **Global CDN** - static files cached worldwide
- ✅ **1M free function executions/month**

## Project Structure

```
/public/                    # Static frontend files
  /css/style.css           # Styling
  /js/app.js               # Customer portal logic
  /js/stylist.js           # Stylist portal logic
  /js/auth-utils.js        # Shared authentication utilities
  index.html               # Customer booking page
  stylist.html             # Stylist management page

/src/
  /functions/              # Azure Functions (HTTP triggers)
    appointments.js        # Appointment CRUD operations
    auth.js                # Login/register with JWT
    services.js            # Get available services
    stylists.js            # Get available stylists
    reminders.js           # Timer trigger for SMS/email reminders
  
  /shared/
    tableStorage.js        # Azure Table Storage operations
    /utils/
      auth.js              # JWT authentication middleware
      notifications.js     # SendGrid & Twilio integration
```

## Local Development

### Prerequisites
- Node.js 18+
- Azure Functions Core Tools: `npm install -g azure-functions-core-tools@4`
- Azure Storage Emulator (Azurite): `npm install -g azurite`

**Note:** For local static file serving during development, use a simple HTTP server:
```bash
npm install -g http-server
# In another terminal:
http-server ./public -p 8080
```
Then visit `http://localhost:8080/` while Functions run on `http://localhost:7071/api/`.

### Setup

1. **Clone and install dependencies**
   ```bash
   npm install
   ```

2. **Create `.env` file** (or local.settings.json for Azure Functions)
   ```env
   AZURE_STORAGE_CONNECTION_STRING=UseDevelopmentStorage=true
   JWT_SECRET=your-dev-secret-key-change-in-production
   BUSINESS_HOURS_START=9
   BUSINESS_HOURS_END=18
   ```

3. **Start Azurite (local storage emulator)**
   ```bash
   azurite --silent --location ./azurite-data --debug ./azurite-debug.log
   ```

4. **Run Azure Functions locally**
   ```bash
   npm start
   # Functions will be available at http://localhost:7071
   ```

### Serve Static Files

During local development, you need to serve the static files separately:

**Option 1: Using http-server (simplest)**
```bash
npx http-server ./public -p 8080
# Open http://localhost:8080
```

**Option 2: Using Node.js built-in server (Node 17+)**
```bash
npx http-server ./public -p 8080
```

The Functions will run on `http://localhost:7071/api/*` - both will work together since the frontend JavaScript makes API calls to `/api/`.

## Deployment

See [DEPLOYMENT_SERVERLESS.md](DEPLOYMENT_SERVERLESS.md) for complete Azure deployment instructions.

### Quick Deploy to Azure

1. **Create Azure Static Web Apps resource**
   - Select repository & branch
   - Set build path to `/public` (or leave empty if pre-built)
   - Leave API location as `api` (default)

2. **Create Azure Function App** (Consumption plan, Linux)

3. **Create Azure Storage Account** for Table Storage

4. **Link them together** in Static Web Apps → API Configuration
   - Backend resource: Your Function App
   - Path: `/api`

5. **Set environment variables** in Function App Configuration:
   ```
   AZURE_STORAGE_CONNECTION_STRING=<your-connection-string>
   JWT_SECRET=<generate-secure-key>
   (+ other optional vars for email/SMS)
   ```

6. **GitHub Actions auto-deploys** on every push!

## Security Features

✅ **JWT authentication** with no default secrets (enforced)  
✅ **Bcrypt password hashing** (12 rounds)  
✅ **Input validation** (email, phone, password strength)  
✅ **XSS prevention** (no innerHTML, sanitized output)  
✅ **SQL injection proof** (NoSQL Azure Tables)  
✅ **Time slot overlap checking** (prevents double-booking)  

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create customer account
- `POST /api/auth/login` - Login (returns JWT token)

### Services & Stylists
- `GET /api/services` - List all services
- `GET /api/stylists` - List all stylists

### Appointments
- `GET /api/appointments/availability` - Get available time slots
- `POST /api/appointments` - Book appointment (auth required)
- `GET /api/appointments/my-appointments` - Get customer's appointments
- `GET /api/appointments/stylist-appointments` - Get stylist's schedule (auth required)
- `PUT /api/appointments/:id` - Update appointment (stylist/admin only)
- `DELETE /api/appointments/:id` - Cancel appointment (stylist/admin only)

### Static Files
- `GET /` - Customer portal
- `GET /stylist` - Stylist portal
- `GET /css/*` - CSS files
- `GET /js/*` - JavaScript files

## Environment Variables

### Required
- `JWT_SECRET` - Secret key for JWT tokens (generate with `openssl rand -base64 32`)
- `AZURE_STORAGE_CONNECTION_STRING` - Azure Storage connection string

### Optional (Notifications)
- `EMAIL_API_KEY` - SendGrid API key (100 free emails/day)
- `EMAIL_FROM` - Sender email address
- `TWILIO_ACCOUNT_SID` - Twilio account SID
- `TWILIO_AUTH_TOKEN` - Twilio auth token
- `TWILIO_PHONE_NUMBER` - Twilio phone number
- `BUSINESS_NAME` - Salon name for notifications
- `BUSINESS_HOURS_START` - Opening hour (default: 9)
- `BUSINESS_HOURS_END` - Closing hour (default: 18)

## Default Admin User

After first deployment, a default admin user is created:
- Email: `admin@salon.com`
- Password: `admin123`
- **Change this immediately in production!**

## Features

### Customer Portal
- Register/login
- Browse services and stylists
- View available time slots
- Book appointments
- View appointment history
- Email & SMS confirmations

### Stylist Portal
- Login (stylist/admin only)
- View scheduled appointments
- Edit appointment details
- Update appointment status
- Cancel/reschedule appointments
- View customer contact info

### Automated Reminders
- Timer function runs hourly
- Sends reminders 24 hours before appointment
- Email + SMS notifications
- Marks reminders as sent to avoid duplicates

## License

ISC

## Support

For deployment issues, see [DEPLOYMENT_SERVERLESS.md](DEPLOYMENT_SERVERLESS.md).

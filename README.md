# Hair Salon Appointment Management System

A cost-effective Azure web application for managing appointments for small haircut businesses.

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

- **Backend**: Node.js + Express
- **Database**: SQLite (lightweight, cost-effective)
- **Authentication**: JWT (JSON Web Tokens)
- **Email**: SendGrid (100 free emails/day)
- **SMS**: Twilio (pay-as-you-go)
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Hosting**: Azure App Service

## Quick Start

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd appts
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start the server:
```bash
npm start
```

5. Access the application:
- Customer portal: http://localhost:3000
- Stylist portal: http://localhost:3000/stylist

## Default Credentials

**Admin/Testing Account**:
- Email: admin@salon.com
- Password: admin123

**Adding Stylists**:

To add a new stylist, use the included script:
```bash
node add-stylist.js
```

Or add directly via SQL:
```bash
# Connect to the database and insert a user, then a stylist profile
# See add-stylist.js for example code
```

**Important**: Change default passwords in production!

## Configuration

Edit `.env` file to configure:
- Server port
- JWT secret
- Email settings (SendGrid)
- SMS settings (Twilio)
- Business hours
- Business name

See `.env.example` for all available options.

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed Azure deployment instructions.

### Quick Deploy to Azure

1. Create Azure App Service (Node 18, Linux)
2. Configure environment variables
3. Deploy via GitHub Actions or Azure CLI
4. Set up SendGrid and Twilio accounts

Estimated cost: **~$15-20/month**

## Project Structure

```
appts/
├── database/
│   └── db.js              # Database setup and initialization
├── middleware/
│   └── auth.js            # Authentication middleware
├── routes/
│   ├── auth.js            # Authentication routes
│   ├── appointments.js    # Appointment management routes
│   ├── services.js        # Service listing routes
│   └── stylists.js        # Stylist management routes
├── services/
│   └── notifications.js   # Email and SMS notifications
├── public/
│   ├── index.html         # Customer portal
│   ├── stylist.html       # Stylist portal
│   ├── css/
│   │   └── style.css      # Styles
│   └── js/
│       ├── app.js         # Customer portal logic
│       └── stylist.js     # Stylist portal logic
├── server.js              # Main application entry point
├── package.json           # Dependencies
└── .env.example           # Environment configuration template
```

## Features in Detail

### Appointment Booking Flow
1. Customer creates account or logs in
2. Selects service from available options
3. Chooses preferred stylist or "Any Available"
4. Picks date and time from available slots
5. Receives instant confirmation via email and SMS
6. Gets reminder 24 hours before appointment

### Stylist Management
1. Stylist logs in to dedicated portal
2. Views all upcoming appointments organized by date
3. Can edit appointment details
4. Can mark appointments as completed, cancelled, or no-show
5. Can delete appointments if needed

### Notification System
- Automatic confirmation on booking
- Reminder sent 24 hours before appointment
- Uses email (SendGrid) and SMS (Twilio)
- Cron job runs hourly to check for reminders

## Cost Breakdown

- **Azure App Service B1**: ~$13/month
- **SendGrid Free Tier**: 100 emails/day (free)
- **Twilio SMS**: ~$0.0075 per SMS (pay-as-you-go)
- **Total**: ~$15-20/month for typical small salon

## Security Features

- Password hashing with bcrypt
- JWT authentication
- Protected API endpoints
- Role-based access control
- SQL injection prevention
- HTTPS enforced on Azure

## Future Enhancements

Potential additions:
- Admin panel for managing stylists
- Calendar integration (Google Calendar, Outlook)
- Payment processing
- Multi-location support
- Customer reviews and ratings
- Appointment history and analytics
- Mobile app

## Support

For issues or questions:
1. Check [DEPLOYMENT.md](DEPLOYMENT.md) for deployment help
2. Review application logs
3. Check environment variables are set correctly
4. Verify third-party service credentials

## License

See [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

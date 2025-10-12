# Safe Frontend-Backend

A production-ready full-stack application built with React frontend and Express.js backend, featuring user authentication, organization management, and modern development practices.

## 🚀 Features

- **User Authentication**: Secure login/register with bcrypt password hashing
- **Organization Management**: Create and validate organizations
- **Modern Frontend**: React with TypeScript, modern UI components
- **Production Ready**: Security middleware, input validation, logging, error handling
- **Database**: MongoDB with Mongoose ODM
- **API Documentation**: RESTful API endpoints with proper documentation

## 📋 Prerequisites

- Node.js (>= 16.0.0)
- npm (>= 8.0.0)
- MongoDB (running locally or MongoDB Atlas)

## 🛠️ Installation

### Quick Setup

```bash
# Clone the repository
git clone <repository-url>
cd safe-frontend-backend

# Install all dependencies (backend + frontend)
npm run setup

# Start MongoDB (if running locally)
mongod

# Start the application
npm run dev
```

### Manual Setup

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd front-end/safe-front-end
npm install
cd ../..
```

## 🏃‍♂️ Running the Application

### Development Mode

```bash
# Start backend server (with auto-reload)
npm run dev

# In another terminal, start frontend
npm run dev:frontend
```

### Production Mode

```bash
# Build frontend
npm run build

# Start production server
npm start
```

## 🌐 Application URLs

- **Backend API**: http://localhost:8000
- **Frontend**: http://localhost:5173 (dev) or http://localhost:5174
- **Health Check**: http://localhost:8000/health

## 📚 API Endpoints

### Authentication
- `POST /login` - User login with database validation
- `POST /auth/register` - User registration
- `POST /auth/logout` - User logout

### Organization Management
- `POST /validate-organization` - Create new organization
- `POST /validate-signin-organization` - Validate existing organization

### System
- `GET /health` - Health check endpoint
- `GET /debug/users` - Debug endpoint (development only)

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=8000
NODE_ENV=development

# Database Configuration
MONGO_URI=mongodb://localhost:27017/safe-frontend-backend

# Frontend Configuration
FRONTEND_URL=http://localhost:5173

# Security Configuration
JWT_SECRET=your-super-secret-jwt-key-here
BCRYPT_ROUNDS=12

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 🏗️ Project Structure

```
safe-frontend-backend/
├── config/                 # Configuration files
│   └── index.js           # Centralized configuration
├── front-end/             # React frontend
│   └── safe-front-end/    # Frontend application
├── models/                # Database models
│   └── User.js           # User model
├── router/                # Express routers
│   ├── fileRouter.js     # File operations
│   └── loginRouter.js    # Authentication routes
├── utils/                 # Utility functions
│   ├── logger.js         # Logging utility
│   └── validation.js     # Input validation
├── logs/                  # Application logs
├── server.js             # Main server file
├── db.js                 # Database connection
└── package.json          # Dependencies and scripts
```

## 🔒 Security Features

- **Helmet.js**: Security headers
- **CORS**: Cross-origin resource sharing protection
- **Rate Limiting**: Prevent abuse and DoS attacks
- **Input Validation**: Comprehensive input sanitization
- **Password Hashing**: bcrypt with configurable rounds
- **Environment Variables**: Secure configuration management

## 📝 Logging

The application includes comprehensive logging:

- **Console Logging**: Colored output for development
- **File Logging**: Daily log files in `logs/` directory
- **Log Levels**: ERROR, WARN, INFO, DEBUG
- **HTTP Request Logging**: All API requests with response times
- **Authentication Logging**: Login attempts and results

## 🧪 Development

### Available Scripts

```bash
npm run dev              # Start development server
npm run dev:frontend     # Start frontend development server
npm run build            # Build frontend for production
npm run clean            # Clean log files
npm run setup            # Full setup (install all dependencies)
```

### Code Quality

- **ESLint**: Code linting (configure as needed)
- **Input Validation**: Comprehensive validation for all user inputs
- **Error Handling**: Centralized error handling with proper HTTP status codes
- **TypeScript**: Frontend uses TypeScript for type safety

## 🚀 Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure secure `JWT_SECRET`
- [ ] Set up MongoDB Atlas or secure local MongoDB
- [ ] Configure CORS origins for production domains
- [ ] Set up SSL/HTTPS
- [ ] Configure reverse proxy (nginx/Apache)
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy

### Docker Deployment (Optional)

```dockerfile
# Example Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 8000
CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- **Vikalp Parashar** - Initial work

## 🙏 Acknowledgments

- Express.js community
- React team
- MongoDB and Mongoose
- All open source contributors

## 📞 Support

For support, email support@example.com or create an issue in the repository.

---

**Built with ❤️ using modern web technologies**

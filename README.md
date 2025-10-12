# Safe Frontend-Backend

A production-ready full-stack application built with React frontend and Express.js backend, featuring comprehensive user authentication, organization management, **asymmetric key management system**, and modern development practices.

## 🚀 Features

### 🔐 **Advanced Authentication & Security**
- **JWT Authentication**: Access tokens with refresh token rotation
- **Role-Based Access Control**: Admin, Manager, Employee, Guest roles
- **Permission-Based Authorization**: Granular permission system
- **Password Security**: bcrypt hashing with comprehensive frontend validation
- **Session Management**: Secure token blacklisting and logout

### 🔑 **Asymmetric Key Management System**
- **RSA 2048-bit Key Generation**: Automatic during user registration
- **Organization-First Association**: Keys tied to Organization → User hierarchy
- **Secure Private Key Storage**: Encrypted in IndexedDB with PBKDF2 + AES-GCM
- **Public Key Management**: Server-side storage with comprehensive API
- **Key Fingerprinting**: SHA-256 fingerprints for uniqueness validation
- **Transaction-Based Registration**: All-or-nothing key generation process

### 🏢 **Comprehensive Organization & User Management**
- **Multi-Organization Support**: Users can belong to different organizations
- **Comprehensive User Registration**: 15+ fields including personal info, role, preferences
- **Organization Validation**: Secure organization creation and validation
- **User-Organization Association**: Proper relational data modeling

### 🎨 **Modern Frontend Experience**
- **React with TypeScript**: Type-safe development
- **Responsive Design**: Mobile-first approach with professional UI
- **Real-Time Status Updates**: Live feedback during registration and key generation
- **Comprehensive Forms**: Multi-step registration with validation
- **Professional Landing Page**: Clean, modern design

### 🛡️ **Production-Ready Security**
- **Helmet.js**: Security headers
- **CORS Protection**: Configurable cross-origin resource sharing
- **Rate Limiting**: Prevent abuse and DoS attacks
- **Input Validation**: Comprehensive sanitization with Joi
- **Environment Variables**: Secure configuration management
- **Structured Logging**: Winston-based logging with multiple levels

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

### Authentication & Authorization
- `POST /login` - User login with comprehensive validation
- `POST /auth/register` - User registration with key generation
- `POST /auth/logout` - Secure logout with token blacklisting
- `POST /auth/refresh` - Refresh access token
- `GET /auth/me` - Get current user details

### 🔑 **Key Management API**
- `POST /api/keys/public` - Upload public key for user/organization
- `GET /api/keys/organization/:orgId` - Get all keys for organization
- `GET /api/keys/user/:userId/org/:orgId` - Get user's key in organization
- `GET /api/keys/public/:keyId` - Get public key by ID
- `GET /api/keys/my-keys` - Get current user's keys across organizations
- `PUT /api/keys/public/:keyId` - Update public key
- `DELETE /api/keys/public/:keyId` - Deactivate public key

### Organization Management
- `POST /validate-organization` - Create new organization
- `POST /validate-signin-organization` - Validate existing organization

### Protected Routes (Examples)
- `GET /api/protected` - Example protected route
- `GET /api/admin` - Admin-only route
- `GET /api/user-management` - Permission-based route

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
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here
BCRYPT_ROUNDS=12

# Token Configuration
ACCESS_TOKEN_EXPIRES_IN=24h
REFRESH_TOKEN_EXPIRES_IN=7d

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 🏗️ Project Structure

```
safe-frontend-backend/
├── config/                     # Configuration files
│   └── index.js                   # Centralized configuration
├── controller/                    # Express controllers
│   ├── fileController.js         # File upload/management logic
│   └── loginController.js        # Authentication logic
├── front-end/                     # React frontend
│   └── safe-front-end/            # Frontend application
│       ├── src/
│       │   ├── components/        # React components
│       │   │   ├── AccountCreatedSuccess.tsx    # Account creation success
│       │   │   ├── AccountCreatedSuccess.css
│       │   │   ├── CreateAccount.tsx            # User registration with key generation
│       │   │   ├── CreateAccount.css
│       │   │   ├── OrganizationRegistration.tsx  # Organization creation form
│       │   │   ├── RegistrationForm.tsx         # Comprehensive registration form
│       │   │   ├── RegistrationForm.css
│       │   │   ├── RegistrationSuccess.tsx      # Registration success page
│       │   │   ├── RegistrationSuccess.css
│       │   │   ├── SignIn.tsx                   # Sign-in page
│       │   │   ├── SignIn.css
│       │   │   ├── SignInCredentials.tsx        # Login with key management
│       │   │   ├── SignInCredentials.css
│       │   │   ├── WelcomeScreen.tsx            # Welcome/landing screen
│       │   │   ├── WelcomeScreen.css
│       │   │   └── ui/                          # Reusable UI components
│       │   │       ├── accordion.tsx
│       │   │       ├── alert-dialog.tsx
│       │   │       ├── alert.tsx
│       │   │       ├── avatar.tsx
│       │   │       ├── badge.tsx
│       │   │       ├── button.tsx
│       │   │       ├── card.tsx
│       │   │       ├── checkbox.tsx
│       │   │       ├── collapsible.tsx
│       │   │       ├── dialog.tsx
│       │   │       ├── form.tsx
│       │   │       ├── input-otp.tsx
│       │   │       ├── input.tsx
│       │   │       ├── label.tsx
│       │   │       ├── pagination.tsx
│       │   │       ├── popover.tsx
│       │   │       ├── progress.tsx
│       │   │       ├── radio-group.tsx
│       │   │       ├── resizable.tsx
│       │   │       ├── select.tsx
│       │   │       ├── table.tsx
│       │   │       ├── tabs.tsx
│       │   │       ├── textarea.tsx
│       │   │       ├── toggle-group.tsx
│       │   │       ├── toggle.tsx
│       │   │       ├── use-mobile.ts
│       │   │       └── utils.ts
│       │   ├── pages/             # Page components
│       │   │   ├── CreateAccountPage.tsx
│       │   │   ├── HomePage.tsx
│       │   │   ├── LandingPage.tsx
│       │   │   ├── LandingPage.css
│       │   │   ├── OrganizationRegistrationPage.tsx
│       │   │   ├── SignInCredentialsPage.tsx
│       │   │   └── SignInPage.tsx
│       │   ├── services/          # Frontend services
│       │   │   ├── authService.ts      # Authentication & key management
│       │   │   └── cryptoService.ts    # Cryptographic operations
│       │   ├── contexts/           # React contexts (if any)
│       │   ├── assets/             # Static assets
│       │   │   └── react.svg
│       │   ├── App.tsx             # Main App component
│       │   ├── App.css
│       │   ├── main.tsx            # Application entry point
│       │   ├── index.css           # Global styles
│       │   ├── vite.config.ts      # Vite configuration
│       │   ├── tsconfig.json       # TypeScript configuration
│       │   ├── tsconfig.app.json
│       │   ├── tsconfig.node.json
│       │   └── eslint.config.js    # ESLint configuration
│       ├── public/                 # Public assets
│       │   └── vite.svg
│       ├── package.json           # Frontend dependencies
│       ├── package-lock.json
│       └── README.md
├── middleware/                    # Express middleware
│   └── auth.js                   # JWT authentication & authorization
├── models/                        # Database models
│   ├── User.js                   # Comprehensive user model
│   ├── PublicKey.js              # Public key management model
│   └── File.js                   # File model
├── router/                        # Express routers
│   ├── fileRouter.js             # File operations
│   ├── loginRouter.js            # Authentication routes
│   └── keyRouter.js              # Key management routes
├── utils/                         # Utility functions
│   ├── logger.js                 # Structured logging
│   └── validation.js             # Input validation & sanitization
├── file_encryption/               # Reference encryption implementation
│   ├── app.js                    # File encryption app
│   ├── crypto-utils.js           # Cryptographic utilities
│   ├── demo.txt                  # Demo file
│   ├── index.html                # Encryption demo page
│   ├── package.json              # Encryption dependencies
│   ├── package-lock.json
│   └── README.md
├── IPFS/                         # IPFS integration (if used)
│   ├── docker-compose.yml
│   ├── Dockerfile
│   ├── front-end/
│   │   └── index.html
│   ├── ipfs_data/                # IPFS data storage
│   ├── ipfs_data_local/          # Local IPFS data
│   ├── ipfs_data_remote/         # Remote IPFS data
│   ├── minio_data/               # MinIO data storage
│   └── node_app/                 # Node.js IPFS app
│       ├── before_iteration_server.js
│       ├── server.js
│       ├── test-connection.js
│       ├── sample.txt
│       ├── uploads/              # File uploads
│       ├── package.json
│       ├── package-lock.json
│       └── node_modules/
├── public/                       # Static files
│   ├── fileUpload.html
│   ├── index.html
│   └── js/
│       ├── fileUpload.js
│       └── main.js
├── logs/                         # Application logs
│   └── app-2025-10-12.log
├── server.js                     # Main server file
├── db.js                         # Database connection & organization model
├── package.json                  # Dependencies and scripts
├── package-lock.json
├── README.md                     # Project documentation
└── CONNECTION_SETUP.md           # Connection setup guide
```

## 🔒 Security Features

### **Authentication & Authorization**
- **JWT Tokens**: Access + refresh token pattern
- **Token Blacklisting**: Secure logout with token invalidation
- **Role-Based Access**: Admin, Manager, Employee, Guest roles
- **Permission System**: Granular permissions (read, write, delete, admin, manage_users, etc.)
- **Password Security**: bcrypt with configurable rounds + frontend validation

### **Key Management Security**
- **Private Key Protection**: Never leaves client, encrypted with PBKDF2 + AES-GCM
- **Key Fingerprinting**: SHA-256 fingerprints for uniqueness
- **Organization Isolation**: Keys are organization-scoped
- **Secure Storage**: IndexedDB with password-derived encryption

### **General Security**
- **Helmet.js**: Security headers
- **CORS Protection**: Configurable cross-origin resource sharing
- **Rate Limiting**: Prevent abuse and DoS attacks
- **Input Validation**: Joi-based validation with comprehensive sanitization
- **Environment Variables**: Secure configuration management

## 📝 Logging

The application includes comprehensive structured logging:

- **Console Logging**: Colored output for development
- **File Logging**: Daily log files in `logs/` directory
- **Log Levels**: ERROR, WARN, INFO, DEBUG
- **HTTP Request Logging**: All API requests with response times
- **Authentication Logging**: Login attempts, key operations, and security events
- **Key Management Logging**: Key generation, upload, and access events

## 🧪 Development

### Available Scripts

```bash
npm run dev              # Start development server with auto-reload
npm run dev:frontend     # Start frontend development server
npm run build            # Build frontend for production
npm run clean            # Clean log files
npm run setup            # Full setup (install all dependencies)
```

### Code Quality

- **ESLint**: Code linting and formatting
- **TypeScript**: Frontend type safety
- **Input Validation**: Comprehensive validation for all user inputs
- **Error Handling**: Centralized error handling with proper HTTP status codes
- **Security Best Practices**: Following OWASP guidelines

## 🔑 **Key Management System Details**

### **Registration Flow**
1. **Generate RSA Key Pair**: 2048-bit RSA-OAEP with SHA-256
2. **Create User Account**: Comprehensive user data with organization association
3. **Upload Public Key**: Server-side storage with organization context
4. **Store Private Key**: Encrypted storage in IndexedDB with user password
5. **Complete Registration**: All-or-nothing transaction-based process

### **Key Storage Architecture**
- **Public Keys**: Stored in MongoDB with organization-first association
- **Private Keys**: Encrypted and stored locally in IndexedDB
- **Key Metadata**: Fingerprints, creation dates, organization context
- **Access Control**: Organization-scoped key access

### **Security Considerations**
- **Key Generation**: Uses Web Crypto API for cryptographically secure random generation
- **Encryption**: PBKDF2 key derivation with 100,000 iterations
- **Storage**: AES-GCM encryption for private key protection
- **Transmission**: All API calls use HTTPS in production

## 🚀 Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure secure `JWT_SECRET` and `JWT_REFRESH_SECRET`
- [ ] Set up MongoDB Atlas or secure local MongoDB
- [ ] Configure CORS origins for production domains
- [ ] Set up SSL/HTTPS for secure key transmission
- [ ] Configure reverse proxy (nginx/Apache)
- [ ] Set up monitoring and structured logging
- [ ] Configure backup strategy for key data
- [ ] Test key generation and storage in production environment
- [ ] Implement key rotation strategy

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

## 🔄 **User Registration Process**

### **Comprehensive User Data Collection**
- **Authentication**: Username, email, password with validation
- **Personal Information**: First name, last name, phone, job title, department
- **Role & Permissions**: Role selection with automatic permission assignment
- **Organization**: Required organization selection and validation
- **Preferences**: Contact preferences, timezone, language settings
- **Security**: Password requirements, confirmation validation

### **Real-Time Feedback**
- **Key Generation Status**: Live updates during RSA key pair generation
- **Registration Progress**: Step-by-step status updates
- **Error Handling**: Comprehensive error messages with specific guidance
- **Success Confirmation**: Clear success indicators with next steps

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
- **Sunil Gundala** - Asymmetric key management system, comprehensive authentication, and security enhancements

## 🙏 Acknowledgments

- Express.js community
- React team
- MongoDB and Mongoose
- Web Crypto API specifications
- All open source contributors

## 📞 Support

For support, email support@example.com or create an issue in the repository.

---

**Built with ❤️ using modern web technologies and enterprise-grade security practices**

## 🔒 **Security Notice**

This application implements a comprehensive asymmetric key management system. Ensure you understand the security implications before deploying to production:

- Private keys are stored encrypted on the client side
- Public keys are stored on the server with organization association
- All cryptographic operations use industry-standard algorithms
- Regular security audits and key rotation are recommended for production use
# 🛡️ AI4SIM Dashboard
## Security Testing and Attack Simulation Management Platform

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-blue.svg)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-5.0+-green.svg)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**AI4SIM Dashboard** is a comprehensive web platform designed for managing and executing cybersecurity tests and attack simulations. This full-stack solution combines an intuitive user interface with a robust backend to orchestrate automated penetration testing campaigns.

 ⚠️ **Important Note: For Educational and Research Purposes**

This project is designed **solely for educational and research purposes**. It's intended for use in controlled environments to study and understand cybersecurity principles, perform security testing, and simulate attacks in a **safe and ethical manner**. **Under no circumstances should this software be used for malicious activities or without explicit authorization.** Users are solely responsible for ensuring their actions comply with all applicable laws and ethical guidelines.

## 🚀 Key Features

- **🎯 Project Management**: Hierarchical organization with team-based access control
- **⚡ Automated Execution**: Configurable attack scenarios with sequential/parallel execution
- **📊 Real-Time Monitoring**: Live surveillance via WebSocket connections
- **🔐 Advanced Security**: Granular permission system with comprehensive audit trails
- **📱 Modern Interface**: Responsive design with dark/light mode support
- **🔧 Integrated Tools**: Native support for Caldera, MAIP, Shennina, and Kali Linux tools
- **📈 Detailed Reports**: Automatic PDF report generation with comprehensive analysis

## 🏗️ Architecture

### Technology Stack

**Backend**
- Node.js 18+ with TypeScript
- Express.js for REST API
- MongoDB with Mongoose ODM
- WebSockets (Socket.io + ws)
- JWT authentication with bcryptjs
- Winston logging framework

**Frontend**
- React 18 with TypeScript
- Vite build tool
- Tailwind CSS for styling
- Zustand + MobX for state management
- Framer Motion for animations

### System Requirements

- **Node.js** 18.0.0 or higher
- **MongoDB** 5.0 or higher
- **npm** or **yarn** package manager
- **Git** version control

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone https://github.com/Montimage/ai4sim.git
cd ai4sim
```

### 2. Install Dependencies

```bash
# Install all dependencies (root, frontend, backend)
npm run install:all
```

### 3. Environment Configuration

Create a `.env` file in the `backend/` directory:

```env
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/ai4sim-dashboard

# Security Settings
JWT_SECRET=your-very-secure-secret-key-change-this
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=3000
WS_PORT=9090
HOST=localhost

# Environment
NODE_ENV=development

# Logging
LOG_LEVEL=info
```

### 4. Start MongoDB

```bash
# Linux/macOS
sudo systemctl start mongod

# Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Windows
net start MongoDB
```

### 5. Initialize Super Administrator

```bash
cd backend
npm run init-super-admin
```

**Default Credentials:**
- Username: `superadmin`
- Email: `admin@ai4sim-dashboard.com`
- Password: `SuperAdmin123!`

⚠️ **Important**: Change the default password on first login!

## 🚀 Getting Started

### Development Mode

```bash
# Start both backend and frontend simultaneously
npm run dev

# Or separately:
npm run dev:backend    # Backend on http://localhost:3000
npm run dev:frontend   # Frontend on http://localhost:5173
```

### Production Mode

```bash
# Build applications
npm run build

# Start in production
cd backend && npm start
```

## 📖 Usage Guide

### 1. Initial Setup

1. Navigate to `http://localhost:5173`
2. Login with super admin credentials
3. Change the default password
4. Create your first users and projects

### 2. Project Creation

1. Click "New Project" in the dashboard
2. Enter project name and description
3. Configure team access permissions
4. Create your first campaigns

### 3. Scenario Configuration

1. Select a project and campaign
2. Create a new scenario
3. Configure targets (hosts, ports, protocols)
4. Add attacks with their parameters
5. Launch execution and monitor in real-time

## 🔧 Available Scripts

```bash
# Installation
npm run install:all          # Install all dependencies

# Development
npm run dev                   # Launch backend + frontend
npm run dev:backend          # Launch backend only
npm run dev:frontend         # Launch frontend only

# Production
npm run build                # Build backend + frontend
npm start                    # Start in production mode

# Administration
npm run init-super-admin     # Initialize super admin
npm run reset-users          # Reset user database
```

## 🛡️ Security & Permissions

### Role-Based Access Control

- **super_admin**: Complete system access and user management
- **admin**: User administration and system configuration
- **project_manager**: Project and team management
- **security_analyst**: Test analysis and execution
- **user**: Standard user with limited access
- **viewer**: Read-only access to assigned projects

### Security Features

- JWT-based secure authentication
- bcrypt password hashing
- Session management with IP tracking
- Automatic lockout after failed attempts
- Comprehensive user action auditing
- Strict input validation and sanitization

## 📊 API Documentation

The REST API is available at `http://localhost:3000/api`

### Main Endpoints

- `POST /api/auth/login` - User authentication
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `GET /api/scenarios` - List scenarios
- `POST /api/executions` - Launch execution
- `GET /api/metrics` - System metrics

## 🔌 Tool Integration

AI4SIM Dashboard supports integration with various security tools:

### Currently Supported Tools
- **Caldera**: Adversary simulation framework
- **MAIP**: Montimage Attack Injection Platform
- **Shennina**: Specialized security testing tool

## 🐛 Troubleshooting

### Common Issues

**MongoDB Connection Issues**
```bash
# Check MongoDB status
sudo systemctl status mongod

# Restart MongoDB service
sudo systemctl restart mongod
```

**Port Already in Use**
```bash
# Find process using the port
lsof -i :3000
kill -9 <PID>
```

**Permission Errors**
```bash
# Reset user permissions
npm run reset-users
npm run init-super-admin
```

## 📝 Logging

Logs are available in:
- `backend/server.log` - General server logs
- `backend/error.log` - Error logs
- Console output during development

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 👥 Development Team

**AI4SIM Dashboard** is developed by Montimage as part of the AI4SIM project, focusing on advanced cybersecurity simulation and testing capabilities.

## 📞 Support & Information

For technical information and updates, visit the [Montimage AI4SIM repository](https://github.com/Montimage/ai4sim).

---

**Version**: 1.0.0  
**Status**: Production Ready  
**Organization**: [Montimage](https://github.com/Montimage)  
**Last Updated**: June 2025 

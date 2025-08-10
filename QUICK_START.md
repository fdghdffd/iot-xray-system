# 🚀 Quick Start Guide - IoT X-Ray System

Get up and running with the IoT X-Ray Data Management System in minutes!

## ⚡ 5-Minute Setup

### 1. Prerequisites Check

Ensure you have:
- ✅ Node.js (v18+)
- ✅ Yarn
- ✅ Docker & Docker Compose
- ✅ Git

### 2. Clone & Install

```bash
git clone https://github.com/BTF-Kabir-2020/iot-xray-system.git
cd iot-xray-system
yarn install
```

### 3. Environment Setup

```bash
cp .env.example .env
# Edit .env if needed (defaults work for local development)
```

### 4. Start Everything

```bash
yarn dev:setup
```

### 5. Access the System

- **🌐 Application**: http://localhost:3000
- **📚 API Docs**: http://localhost:3000/api
- **🐰 RabbitMQ**: http://localhost:15672 (guest/guest)
- **🗄️ MongoDB**: mongodb://localhost:27017/iot-xray

## 🎯 Quick Test

### Generate Test Data

1. Go to http://localhost:3000/api
2. Find **🤖 Producer - IoT Device Simulation**
3. Click `POST /producer/send-single`
4. Click **Try it out**
5. Enter:
```json
{
  "deviceId": "66bb584d4ae73e488c30a072"
}
```
6. Click **Execute**

### View Data

1. Find **📊 Signals - X-Ray Data Management**
2. Click `GET /signals`
3. Click **Try it out**
4. Click **Execute**
5. See your data!

## 🔧 Common Commands

```bash
# Start services only
yarn docker:up

# Start app only
yarn start:dev

# Start everything
yarn dev:setup

# Stop everything
yarn docker:down

# View logs
yarn docker:logs

# Run tests
yarn test

# Restart services
yarn docker:restart
```

## 🛠️ Troubleshooting

### Port 3000 Already in Use
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <process_id> /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9
```

### Docker Issues
```bash
# Restart Docker
docker-compose down
docker-compose up -d

# Clear everything
docker-compose down -v
docker system prune -a
yarn dev:setup
```

### Test Issues
```bash
# Clear cache
yarn jest --clearCache

# Run with verbose output
yarn test --verbose
```

### MongoDB Connection Issues
```bash
# Check MongoDB status
docker-compose logs mongodb

# Restart MongoDB
docker-compose restart mongodb

# Reset MongoDB data
docker-compose down -v
docker-compose up -d
```

### RabbitMQ Connection Issues
```bash
# Check RabbitMQ status
docker-compose logs rabbitmq

# Restart RabbitMQ
docker-compose restart rabbitmq

# Access RabbitMQ Management
# Open: http://localhost:15672
# Username: guest
# Password: guest
```

## 📊 What You'll See

### Sample Data Structure
```json
{
  "deviceId": "66bb584d4ae73e488c30a072",
  "timestamp": 1735683480000,
  "dataLength": 3,
  "averageSpeed": 1.62482,
  "coordinates": [51.339774, 12.33921],
  "data": [
    [762, [51.339764, 12.339223, 1.2038]],
    [1766, [51.339777, 12.339211, 1.531604]],
    [2763, [51.339782, 12.339196, 2.13906]]
  ]
}
```

### API Response Format
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { /* your data */ },
  "timestamp": "2025-01-08T10:00:00.000Z"
}
```

## 🎮 Try These Endpoints

### Producer (Generate Data)
- `GET /producer/devices` - List available devices
- `POST /producer/send-single` - Send one message
- `POST /producer/send-bulk` - Send multiple messages
- `POST /producer/send-random` - Generate random data

### Signals (View Data)
- `GET /signals` - Get all records
- `GET /signals/statistics` - View statistics
- `GET /signals/device/{deviceId}` - Device-specific data
- `POST /signals` - Create new record manually

## 📱 Curl Commands

### Quick API Testing

```bash
# Health check
curl http://localhost:3000/health

# Get all signals
curl http://localhost:3000/signals

# Get device-specific signals
curl http://localhost:3000/signals/device/66bb584d4ae73e488c30a072

# Get statistics
curl http://localhost:3000/signals/statistics

# Send single message
curl -X POST http://localhost:3000/producer/send-single \
  -H "Content-Type: application/json" \
  -d '{"deviceId": "66bb584d4ae73e488c30a072"}'

# Send bulk messages
curl -X POST http://localhost:3000/producer/send-bulk \
  -H "Content-Type: application/json" \
  -d '{"deviceIds": ["66bb584d4ae73e488c30a072"], "count": 5}'

# Create signal manually
curl -X POST http://localhost:3000/signals \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "66bb584d4ae73e488c30a072",
    "timestamp": 1735683480000,
    "data": [
      [762, [51.339764, 12.339223, 1.2038]],
      [1766, [51.339777, 12.339211, 1.531604]]
    ],
    "dataLength": 2,
    "dataVolume": 6,
    "averageSpeed": 1.3677,
    "maxSpeed": 1.531604,
    "minSpeed": 1.2038,
    "coordinates": [51.33977, 12.339217]
  }'
```

## 🔍 System Status

### Check Service Health

```bash
# Application status
curl http://localhost:3000/health

# MongoDB status
docker exec mongodb mongosh --eval "db.adminCommand('ping')"

# RabbitMQ status
curl -u guest:guest http://localhost:15672/api/overview

# Docker services status
docker-compose ps
```

### View Logs

```bash
# Application logs
yarn start:dev

# Docker logs
docker-compose logs -f

# Specific service logs
docker-compose logs -f mongodb
docker-compose logs -f rabbitmq
```

## 📸 Screenshots

### Swagger UI Interface
```
┌─────────────────────────────────────────────────────────┐
│ 📚 Swagger UI - IoT X-Ray System                        │
├─────────────────────────────────────────────────────────┤
│ 🤖 Producer - IoT Device Simulation                     │
│ ├─ GET /producer/devices                                 │
│ ├─ POST /producer/send-single                           │
│ ├─ POST /producer/send-bulk                             │
│ └─ POST /producer/simulate                              │
│                                                         │
│ 📊 Signals - X-Ray Data Management                      │
│ ├─ GET /signals                                         │
│ ├─ POST /signals                                        │
│ ├─ GET /signals/statistics                              │
│ └─ GET /signals/device/{deviceId}                       │
└─────────────────────────────────────────────────────────┘
```

### RabbitMQ Management
```
┌─────────────────────────────────────────────────────────┐
│ 🐰 RabbitMQ Management                                  │
├─────────────────────────────────────────────────────────┤
│ Overview | Connections | Channels | Exchanges | Queues  │
│                                                         │
│ Queue: x-ray-queue                                      │
│ ├─ Messages: 0                                          │
│ ├─ Consumers: 1                                         │
│ └─ Status: Running                                      │
└─────────────────────────────────────────────────────────┘
```

## 🚨 Common Error Solutions

### "Cannot connect to MongoDB"
```bash
# Solution 1: Restart MongoDB
docker-compose restart mongodb

# Solution 2: Check if MongoDB is running
docker-compose ps

# Solution 3: Reset MongoDB
docker-compose down -v
docker-compose up -d
```

### "Cannot connect to RabbitMQ"
```bash
# Solution 1: Restart RabbitMQ
docker-compose restart rabbitmq

# Solution 2: Check RabbitMQ logs
docker-compose logs rabbitmq

# Solution 3: Reset RabbitMQ
docker-compose down -v
docker-compose up -d
```

### "Port already in use"
```bash
# Solution 1: Find and kill process
netstat -ano | findstr :3000
taskkill /PID <process_id> /F

# Solution 2: Change port in .env
PORT=3001

# Solution 3: Stop all containers
docker-compose down
```

### "Validation failed" in POST /signals
```bash
# Solution: Check data format
# Ensure deviceId is 24-character hex string
# Ensure data array has correct structure
# Ensure all required fields are present
```

## 🔄 Reset Everything

### Complete Reset
```bash
# Stop all services
docker-compose down -v

# Remove all containers and volumes
docker system prune -a

# Reinstall dependencies
rm -rf node_modules
yarn install

# Start fresh
yarn dev:setup
```

### Data Reset Only
```bash
# Clear MongoDB data
docker-compose down -v
docker-compose up -d

# Restart application
yarn start:dev
```

## 📞 Need Help?

- **Full Documentation**: [README.md](README.md)
- **Issues**: [GitHub Issues](https://github.com/BTF-Kabir-2020/iot-xray-system/issues)

### Quick Debug Commands
```bash
# Check system status
yarn docker:logs

# Test API endpoints
curl http://localhost:3000/health

# Check database
docker exec mongodb mongosh iot-xray --eval "db.signals.find().count()"

# Check queue
curl -u guest:guest http://localhost:15672/api/queues
```

---

**Happy IoT Data Management! 🚀**

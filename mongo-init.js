// MongoDB initialization script
db = db.getSiblingDB('iot-xray');

// Create collections
db.createCollection('signals');

// Create indexes for better performance
db.signals.createIndex({ "deviceId": 1 });
db.signals.createIndex({ "timestamp": 1 });
db.signals.createIndex({ "createdAt": 1 });
db.signals.createIndex({ "deviceId": 1, "timestamp": 1 });

print('MongoDB initialized successfully for IoT X-Ray System');

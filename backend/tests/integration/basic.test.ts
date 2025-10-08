import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../../src/app';

let mongoServer: MongoMemoryServer;
let app: any;

beforeAll(async () => {
  // Ensure we're completely disconnected from production database
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  
  // Create isolated test database
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  
  // Connect to test database only
  await mongoose.connect(uri, {
    dbName: 'test_database' // Explicitly use test database name
  });
  
  // Create app without starting the server
  const appSetup = createApp();
  app = appSetup.app;
});

afterAll(async () => {
  if (mongoServer) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
  }
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

describe('Integration Tests', () => {
  describe('Health Check', () => {
    test('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body).toHaveProperty('status');
    });
  });

  describe('API Root', () => {
    test('should return welcome message', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);
      
      expect(response.body).toHaveProperty('message');
      expect(response.body.status).toBe('running');
    });
  });

  describe('Authentication', () => {
    test('should reject requests without auth token', async () => {
      const response = await request(app)
        .get('/api/projects')
        .expect(401);
      
      expect(response.body).toHaveProperty('message');
    });
  });
});
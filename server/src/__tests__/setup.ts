// fake settings so the tests never need a real .env file
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-123456';
process.env.MONGO_URI = process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/syncdoc-test';
process.env.CLIENT_ORIGIN = 'http://localhost:5173';

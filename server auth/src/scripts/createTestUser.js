require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user.model');

const createTestUser = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/oz-auth', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        // Create test user
        const testUser = new User({
            email: 'user1@gmail.com',
            password: 'user1',
            name: 'Test User 1'
        });

        await testUser.save();
        console.log('Test user created successfully!');
        console.log('Email: user1@gmail.com');
        console.log('Password: user1');

    } catch (error) {
        console.error('Error creating test user:', error);
    } finally {
        // Close the database connection
        await mongoose.connection.close();
    }
};

// Run the function
createTestUser(); 
/**
 * Seed Script — Populates the database with sample test data.
 * Run with: node seed.js
 *
 * Creates:
 * - 2 donors, 2 receivers, 2 volunteers
 * - 4 food listings from donors
 *
 * Default password for all users: "password123"
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const FoodListing = require('./models/FoodListing');
const Request = require('./models/Request');
const Delivery = require('./models/Delivery');

dotenv.config();

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await FoodListing.deleteMany({});
    await Request.deleteMany({});
    await Delivery.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Create users
    const users = await User.create([
      {
        name: 'Rajesh Kumar (Restaurant Owner)',
        email: 'donor1@test.com',
        password: 'password123',
        role: 'donor',
        phone: '9876543210',
        location: { address: 'Connaught Place, New Delhi', lat: 28.6315, lng: 77.2167 },
      },
      {
        name: 'Priya Sharma (Home Cook)',
        email: 'donor2@test.com',
        password: 'password123',
        role: 'donor',
        phone: '9876543211',
        location: { address: 'Lajpat Nagar, New Delhi', lat: 28.5700, lng: 77.2400 },
      },
      {
        name: 'Hope Foundation NGO',
        email: 'receiver1@test.com',
        password: 'password123',
        role: 'receiver',
        phone: '9876543220',
        location: { address: 'Karol Bagh, New Delhi', lat: 28.6519, lng: 77.1907 },
      },
      {
        name: 'City Shelter Home',
        email: 'receiver2@test.com',
        password: 'password123',
        role: 'receiver',
        phone: '9876543221',
        location: { address: 'Paharganj, New Delhi', lat: 28.6448, lng: 77.2120 },
      },
      {
        name: 'Amit Volunteer',
        email: 'volunteer1@test.com',
        password: 'password123',
        role: 'volunteer',
        phone: '9876543230',
        location: { address: 'Rajiv Chowk, New Delhi', lat: 28.6328, lng: 77.2197 },
      },
      {
        name: 'Sneha Delivery Partner',
        email: 'volunteer2@test.com',
        password: 'password123',
        role: 'volunteer',
        phone: '9876543231',
        location: { address: 'India Gate, New Delhi', lat: 28.6129, lng: 77.2295 },
      },
    ]);

    console.log(`👤 Created ${users.length} users`);

    const donor1 = users[0];
    const donor2 = users[1];

    // Create food listings
    const foods = await FoodListing.create([
      {
        donorId: donor1._id,
        foodType: 'Cooked Meals (Rice, Dal, Sabzi)',
        quantity: '50 plates',
        description: 'Fresh home-style cooked meals from our restaurant. Best consumed within 4 hours.',
        expiryTime: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours from now
        location: donor1.location,
        status: 'available',
      },
      {
        donorId: donor1._id,
        foodType: 'Bread & Bakery Items',
        quantity: '30 packets',
        description: 'Assorted bread, buns, and pastries from today\'s batch.',
        expiryTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        location: donor1.location,
        status: 'available',
      },
      {
        donorId: donor2._id,
        foodType: 'Fresh Fruits & Vegetables',
        quantity: '20 kg',
        description: 'Mixed seasonal fruits and vegetables, slightly overripe but perfectly edible.',
        expiryTime: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours from now
        location: donor2.location,
        status: 'available',
      },
      {
        donorId: donor2._id,
        foodType: 'Packaged Snacks',
        quantity: '100 packets',
        description: 'Biscuits, chips, and namkeen packets nearing best-before date.',
        expiryTime: new Date(Date.now() + 72 * 60 * 60 * 1000), // 72 hours from now
        location: donor2.location,
        status: 'available',
      },
    ]);

    console.log(`🍽️  Created ${foods.length} food listings`);

    console.log('\n📋 Test Credentials:');
    console.log('───────────────────────────────────');
    console.log('Donors:');
    console.log('  donor1@test.com / password123');
    console.log('  donor2@test.com / password123');
    console.log('Receivers:');
    console.log('  receiver1@test.com / password123');
    console.log('  receiver2@test.com / password123');
    console.log('Volunteers:');
    console.log('  volunteer1@test.com / password123');
    console.log('  volunteer2@test.com / password123');
    console.log('───────────────────────────────────');

    console.log('\n✅ Seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
};

seedData();

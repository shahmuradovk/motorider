/**
 * Seed script - Admin user yaratmaq üçün
 * Usage: node seed.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/motoride';

const adminUser = {
  email: 'admin@motoride.az',
  password: 'Admin123!',
  name: 'Kanan Admin',
  userType: 'rider',
  age: 28,
  bio: 'MotoRide Admin - Motosiklet icması lideri 🏍️',
  motorcycle: {
    brand: 'Kawasaki',
    model: 'Ninja ZX-10R',
    year: 2025,
    engineCC: 998,
    color: 'Yaşıl'
  }
};

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB bağlantısı uğurlu');

    // Check if admin already exists
    const existing = await User.findOne({ email: adminUser.email });
    if (existing) {
      console.log('⚠️  Admin user artıq mövcuddur:');
      console.log(`   Email: ${existing.email}`);
      console.log(`   Name:  ${existing.name}`);
      console.log(`   Type:  ${existing.userType}`);
    } else {
      const user = new User(adminUser);
      await user.save();
      console.log('✅ Admin user uğurla yaradıldı!');
    }

    console.log('\n╔══════════════════════════════════════════╗');
    console.log('║       🏍️  Admin User Məlumatları         ║');
    console.log('╠══════════════════════════════════════════╣');
    console.log(`║  Email:    ${adminUser.email}      ║`);
    console.log(`║  Şifrə:   ${adminUser.password}              ║`);
    console.log(`║  Ad:      ${adminUser.name}            ║`);
    console.log(`║  Tip:     ${adminUser.userType}                    ║`);
    console.log('╚══════════════════════════════════════════╝');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Xəta:', err.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seed();

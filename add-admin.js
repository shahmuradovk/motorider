const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function addAdmin() {
  const sql = neon(process.env.DATABASE_URL);
  
  // bcrypt hash for '123456'
  const hash = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';

  try {
    // Delete if exists
    await sql`DELETE FROM users WHERE email = 'shahmuradovk@gmail.com'`;
    
    // Insert admin user
    const result = await sql`
      INSERT INTO users (first_name, last_name, email, phone, password_hash, birth_date, moto_brand, moto_model, moto_cc, avatar_color, bio, is_verified, total_rides, total_km)
      VALUES ('Shah', 'Muradov', 'shahmuradovk@gmail.com', '+994501234567', ${hash}, '1998-01-01', 'Yamaha', 'MT-07', 689, '#ff6b35', 'MotoRiders Admin', true, 42, 1250)
      RETURNING id, email
    `;
    
    console.log('✅ Admin istifadəçi yaradıldı:', result[0].email);
    console.log('   ID:', result[0].id);
    console.log('   Şifrə: 123456');
  } catch (err) {
    console.error('❌ Xəta:', err.message);
  }
}

addAdmin();

const { getDb, respond } = require('./db');
const bcrypt = require('bcryptjs');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return respond(200, {});
  if (event.httpMethod !== 'POST') return respond(405, { error: 'Method not allowed' });
  
  try {
    const { firstName, lastName, email, phone, password, birthDate, motoBrand, motoModel, motoCc } = JSON.parse(event.body);
    
    if (!firstName || !lastName || !email || !password) {
      return respond(400, { error: 'Bütün sahələr tələb olunur' });
    }
    
    const sql = getDb();
    
    // Check if email exists
    const existing = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase()}`;
    if (existing.length > 0) return respond(409, { error: 'Bu email artıq qeydiyyatdan keçib' });
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    // Generate verification code
    const verificationCode = String(Math.floor(100000 + Math.random() * 900000));
    
    // Random avatar color
    const colors = ['#ff6b35', '#3366ff', '#00d68f', '#ff3333', '#ffaa00', '#9966ff'];
    const avatarColor = colors[Math.floor(Math.random() * colors.length)];
    
    // Insert user
    const result = await sql`
      INSERT INTO users (first_name, last_name, email, phone, password_hash, birth_date, moto_brand, moto_model, moto_cc, avatar_color, verification_code, is_verified)
      VALUES (${firstName}, ${lastName}, ${email.toLowerCase()}, ${phone || null}, ${passwordHash}, ${birthDate || null}, ${motoBrand || null}, ${motoModel || null}, ${motoCc ? parseInt(motoCc) : null}, ${avatarColor}, ${verificationCode}, false)
      RETURNING id, email, verification_code
    `;
    
    // In production, send email here. For now, return the code.
    return respond(201, { 
      message: 'Qeydiyyat uğurlu. Email təsdiq kodunu daxil edin.',
      userId: result[0].id,
      verificationCode: result[0].verification_code // Remove this in production!
    });
  } catch (err) {
    console.error('Register error:', err);
    return respond(500, { error: 'Server xətası' });
  }
};

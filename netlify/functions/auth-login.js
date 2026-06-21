const { getDb, respond, createToken } = require('./db');
const bcrypt = require('bcryptjs');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return respond(200, {});
  if (event.httpMethod !== 'POST') return respond(405, { error: 'Method not allowed' });
  
  try {
    const { email, password } = JSON.parse(event.body);
    if (!email || !password) return respond(400, { error: 'Email və şifrə tələb olunur' });
    
    const sql = getDb();
    const users = await sql`SELECT * FROM users WHERE email = ${email.toLowerCase()}`;
    
    if (users.length === 0) return respond(401, { error: 'Email və ya şifrə yanlışdır' });
    
    const user = users[0];
    if (!user.is_verified) return respond(401, { error: 'Email təsdiqlənməyib' });
    
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) return respond(401, { error: 'Email və ya şifrə yanlışdır' });
    
    // Update last_seen
    await sql`UPDATE users SET last_seen = NOW() WHERE id = ${user.id}`;
    
    const token = createToken(user.id);
    const { password_hash, verification_code, ...safeUser } = user;
    
    return respond(200, { token, user: safeUser });
  } catch (err) {
    console.error('Login error:', err);
    return respond(500, { error: 'Server xətası' });
  }
};

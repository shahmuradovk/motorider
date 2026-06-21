const { getDb, respond, createToken } = require('./db');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return respond(200, {});
  if (event.httpMethod !== 'POST') return respond(405, { error: 'Method not allowed' });
  
  try {
    const { userId, code } = JSON.parse(event.body);
    if (!userId || !code) return respond(400, { error: 'ID və kod tələb olunur' });
    
    const sql = getDb();
    const users = await sql`SELECT * FROM users WHERE id = ${userId} AND verification_code = ${code}`;
    
    if (users.length === 0) return respond(400, { error: 'Yanlış təsdiq kodu' });
    
    await sql`UPDATE users SET is_verified = true, verification_code = null WHERE id = ${userId}`;
    
    const user = users[0];
    const token = createToken(user.id);
    const { password_hash, verification_code, ...safeUser } = user;
    safeUser.is_verified = true;
    
    return respond(200, { token, user: safeUser, message: 'Email təsdiqləndi!' });
  } catch (err) {
    console.error('Verify error:', err);
    return respond(500, { error: 'Server xətası' });
  }
};

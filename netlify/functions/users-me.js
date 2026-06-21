const { getDb, respond, getUserIdFromEvent } = require('./db');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return respond(200, {});
  
  const userId = getUserIdFromEvent(event);
  if (!userId) return respond(401, { error: 'Giriş tələb olunur' });
  
  try {
    const sql = getDb();
    const users = await sql`SELECT id, first_name, last_name, email, phone, birth_date, moto_brand, moto_model, moto_cc, avatar_color, bio, is_verified, total_rides, total_km, created_at, last_seen FROM users WHERE id = ${userId}`;
    
    if (users.length === 0) return respond(404, { error: 'İstifadəçi tapılmadı' });
    
    return respond(200, { user: users[0] });
  } catch (err) {
    console.error('Users-me error:', err);
    return respond(500, { error: 'Server xətası' });
  }
};

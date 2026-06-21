const { getDb, respond, getUserIdFromEvent } = require('./db');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return respond(200, {});
  
  const userId = getUserIdFromEvent(event);
  if (!userId) return respond(401, { error: 'Giriş tələb olunur' });
  
  try {
    const sql = getDb();
    const query = event.queryStringParameters?.q || '';
    
    let users;
    if (query) {
      users = await sql`
        SELECT id, first_name, last_name, email, moto_brand, moto_model, moto_cc, avatar_color, bio, last_seen
        FROM users 
        WHERE id != ${userId} 
        AND is_verified = true
        AND (LOWER(first_name) LIKE ${`%${query.toLowerCase()}%`} OR LOWER(last_name) LIKE ${`%${query.toLowerCase()}%`} OR LOWER(email) LIKE ${`%${query.toLowerCase()}%`})
        LIMIT 20
      `;
    } else {
      users = await sql`
        SELECT id, first_name, last_name, email, moto_brand, moto_model, moto_cc, avatar_color, bio, last_seen
        FROM users 
        WHERE id != ${userId} AND is_verified = true
        ORDER BY last_seen DESC
        LIMIT 50
      `;
    }
    
    return respond(200, { users });
  } catch (err) {
    console.error('Users-list error:', err);
    return respond(500, { error: 'Server xətası' });
  }
};

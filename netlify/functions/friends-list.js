const { getDb, respond, getUserIdFromEvent } = require('./db');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return respond(200, {});
  
  const userId = getUserIdFromEvent(event);
  if (!userId) return respond(401, { error: 'Giriş tələb olunur' });
  
  try {
    const sql = getDb();
    
    // Get accepted friends (both directions)
    const friends = await sql`
      SELECT u.id, u.first_name, u.last_name, u.email, u.moto_brand, u.moto_model, u.moto_cc, u.avatar_color, u.bio, u.last_seen
      FROM users u
      WHERE u.id IN (
        SELECT friend_id FROM friendships WHERE user_id = ${userId} AND status = 'accepted'
        UNION
        SELECT user_id FROM friendships WHERE friend_id = ${userId} AND status = 'accepted'
      )
    `;
    
    // Get pending requests (received)
    const requests = await sql`
      SELECT f.id as request_id, f.created_at as requested_at, u.id, u.first_name, u.last_name, u.moto_brand, u.moto_cc, u.avatar_color
      FROM friendships f
      JOIN users u ON f.user_id = u.id
      WHERE f.friend_id = ${userId} AND f.status = 'pending'
    `;
    
    return respond(200, { friends, requests });
  } catch (err) {
    console.error('Friends-list error:', err);
    return respond(500, { error: 'Server xətası' });
  }
};

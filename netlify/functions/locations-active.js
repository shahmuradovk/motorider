const { getDb, respond, getUserIdFromEvent } = require('./db');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return respond(200, {});
  
  const userId = getUserIdFromEvent(event);
  if (!userId) return respond(401, { error: 'Giriş tələb olunur' });
  
  try {
    const sql = getDb();
    const locations = await sql`
      SELECT l.*, u.first_name, u.last_name, u.avatar_color, u.moto_brand, u.moto_model, u.moto_cc
      FROM locations l
      JOIN users u ON l.user_id = u.id
      WHERE l.updated_at > NOW() - INTERVAL '30 minutes'
      ORDER BY l.updated_at DESC
    `;
    
    return respond(200, { locations });
  } catch (err) {
    console.error('Locations-active error:', err);
    return respond(500, { error: 'Server xətası' });
  }
};

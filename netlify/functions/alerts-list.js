const { getDb, respond, getUserIdFromEvent } = require('./db');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return respond(200, {});
  
  const userId = getUserIdFromEvent(event);
  if (!userId) return respond(401, { error: 'Giriş tələb olunur' });
  
  try {
    const sql = getDb();
    const alerts = await sql`
      SELECT a.*, u.first_name, u.last_name, u.avatar_color
      FROM alerts a
      JOIN users u ON a.creator_id = u.id
      WHERE a.expires_at > NOW()
      ORDER BY a.created_at DESC
    `;
    
    return respond(200, { alerts });
  } catch (err) {
    console.error('Alerts-list error:', err);
    return respond(500, { error: 'Server xətası' });
  }
};

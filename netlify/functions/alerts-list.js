const { getDb, respond, getUserIdFromEvent } = require('./db');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return respond(200, {});
  
  try {
    const sql = getDb();
    const alerts = await sql`
      SELECT a.*, u.first_name, u.last_name, u.avatar_color
      FROM alerts a
      LEFT JOIN users u ON a.creator_id = u.id
      ORDER BY a.created_at DESC
      LIMIT 50
    `;
    
    return respond(200, { alerts });
  } catch (err) {
    console.error('Alerts-list error:', err);
    return respond(500, { error: 'Server xətası' });
  }
};

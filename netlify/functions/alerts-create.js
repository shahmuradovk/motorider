const { getDb, respond, getUserIdFromEvent } = require('./db');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return respond(200, {});
  if (event.httpMethod !== 'POST') return respond(405, { error: 'Method not allowed' });
  
  const userId = getUserIdFromEvent(event);
  if (!userId) return respond(401, { error: 'Giriş tələb olunur' });
  
  try {
    const { type, description, lat, lng } = JSON.parse(event.body);
    
    if (!type || !lat || !lng) return respond(400, { error: 'Tip və lokasiya tələb olunur' });
    
    const sql = getDb();
    const result = await sql`
      INSERT INTO alerts (creator_id, type, description, lat, lng, expires_at)
      VALUES (${userId}, ${type}, ${description || ''}, ${lat}, ${lng}, NOW() + INTERVAL '2 hours')
      RETURNING *
    `;
    
    return respond(201, { alert: result[0], message: 'Xəbərdarlıq yaradıldı!' });
  } catch (err) {
    console.error('Alerts-create error:', err);
    return respond(500, { error: 'Server xətası' });
  }
};

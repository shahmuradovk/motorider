const { getDb, respond } = require('./db');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return respond(200, {});
  
  try {
    const sql = getDb();
    const locations = await sql`
      SELECT l.*, u.first_name, u.last_name, u.avatar_color, u.moto_brand, u.moto_model
      FROM locations l
      LEFT JOIN users u ON l.user_id = u.id
      WHERE l.updated_at > NOW() - INTERVAL '30 minutes'
      ORDER BY l.updated_at DESC
    `;
    
    return respond(200, { locations });
  } catch (err) {
    console.error('Locations-active error:', err);
    return respond(500, { error: 'Server xətası', details: err.message });
  }
};

const { getDb, respond } = require('./db');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return respond(200, {});
  if (event.httpMethod !== 'POST') return respond(405, { error: 'Method not allowed' });
  
  try {
    const { userId, action, lat, lng, name, message, shareMode, isRiding } = JSON.parse(event.body);
    if (!userId) return respond(400, { error: 'userId tələb olunur' });
    
    const sql = getDb();
    
    if (action === 'stop') {
      await sql`DELETE FROM locations WHERE user_id = ${userId}`;
      return respond(200, { message: 'Dayandırıldı' });
    }
    
    // Upsert location
    await sql`
      INSERT INTO locations (user_id, lat, lng, message, share_mode, is_riding)
      VALUES (${userId}, ${lat || 0}, ${lng || 0}, ${message || null}, ${shareMode || 'community'}, ${isRiding || false})
      ON CONFLICT (user_id) DO UPDATE SET
        lat = ${lat || 0}, lng = ${lng || 0}, message = ${message || null},
        share_mode = ${shareMode || 'community'}, is_riding = ${isRiding || false},
        updated_at = NOW()
    `;
    
    return respond(200, { message: 'Lokasiya paylaşıldı' });
  } catch (err) {
    console.error('Locations-share error:', err);
    return respond(500, { error: 'Server xətası', details: err.message });
  }
};

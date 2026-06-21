const { getDb, respond, getUserIdFromEvent } = require('./db');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return respond(200, {});
  if (event.httpMethod !== 'POST') return respond(405, { error: 'Method not allowed' });
  
  const userId = getUserIdFromEvent(event);
  if (!userId) return respond(401, { error: 'Giriş tələb olunur' });
  
  try {
    const { action, lat, lng, message, shareMode, isRiding, routeData, distanceKm, speed } = JSON.parse(event.body);
    const sql = getDb();
    
    if (action === 'stop') {
      await sql`DELETE FROM locations WHERE user_id = ${userId}`;
      return respond(200, { message: 'Lokasiya paylaşması dayandırıldı' });
    }
    
    if (action === 'update') {
      await sql`
        UPDATE locations SET lat = ${lat}, lng = ${lng}, distance_km = ${distanceKm || 0}, speed = ${speed || 0}, route_data = ${JSON.stringify(routeData || [])}, updated_at = NOW()
        WHERE user_id = ${userId}
      `;
      return respond(200, { message: 'Lokasiya yeniləndi' });
    }
    
    // Start sharing (upsert)
    await sql`
      INSERT INTO locations (user_id, lat, lng, message, share_mode, is_riding, distance_km, speed, route_data)
      VALUES (${userId}, ${lat}, ${lng}, ${message || null}, ${shareMode || 'community'}, ${isRiding || false}, ${distanceKm || 0}, ${speed || 0}, ${JSON.stringify(routeData || [])})
      ON CONFLICT (user_id) DO UPDATE SET
        lat = ${lat}, lng = ${lng}, message = ${message || null}, share_mode = ${shareMode || 'community'},
        is_riding = ${isRiding || false}, distance_km = ${distanceKm || 0}, speed = ${speed || 0},
        route_data = ${JSON.stringify(routeData || [])}, updated_at = NOW()
    `;
    
    return respond(200, { message: 'Lokasiya paylaşıldı' });
  } catch (err) {
    console.error('Locations-share error:', err);
    return respond(500, { error: 'Server xətası' });
  }
};

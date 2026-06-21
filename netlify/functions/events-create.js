const { getDb, respond, getUserIdFromEvent } = require('./db');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return respond(200, {});
  if (event.httpMethod !== 'POST') return respond(405, { error: 'Method not allowed' });
  
  const userId = getUserIdFromEvent(event);
  if (!userId) return respond(401, { error: 'Giriş tələb olunur' });
  
  try {
    const { title, description, eventDate, startLocation, startLat, startLng, endLocation, endLat, endLng, shareMode } = JSON.parse(event.body);
    
    if (!title || !eventDate) return respond(400, { error: 'Başlıq və tarix tələb olunur' });
    
    const sql = getDb();
    const result = await sql`
      INSERT INTO events (creator_id, title, description, event_date, start_location, start_lat, start_lng, end_location, end_lat, end_lng, share_mode)
      VALUES (${userId}, ${title}, ${description || ''}, ${eventDate}, ${startLocation || ''}, ${startLat || null}, ${startLng || null}, ${endLocation || ''}, ${endLat || null}, ${endLng || null}, ${shareMode || 'community'})
      RETURNING *
    `;
    
    // Auto-join creator
    await sql`INSERT INTO event_participants (event_id, user_id) VALUES (${result[0].id}, ${userId})`;
    
    return respond(201, { event: result[0], message: 'Tədbir yaradıldı!' });
  } catch (err) {
    console.error('Events-create error:', err);
    return respond(500, { error: 'Server xətası' });
  }
};

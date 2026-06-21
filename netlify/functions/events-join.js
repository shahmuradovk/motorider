const { getDb, respond, getUserIdFromEvent } = require('./db');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return respond(200, {});
  if (event.httpMethod !== 'POST') return respond(405, { error: 'Method not allowed' });
  
  const userId = getUserIdFromEvent(event);
  if (!userId) return respond(401, { error: 'Giriş tələb olunur' });
  
  try {
    const { eventId, action, comment } = JSON.parse(event.body);
    const sql = getDb();
    
    if (action === 'join') {
      await sql`INSERT INTO event_participants (event_id, user_id) VALUES (${eventId}, ${userId}) ON CONFLICT DO NOTHING`;
      return respond(200, { message: 'Tədbirə qoşuldunuz!' });
    } else if (action === 'leave') {
      await sql`DELETE FROM event_participants WHERE event_id = ${eventId} AND user_id = ${userId}`;
      return respond(200, { message: 'Tədbirdən ayrıldınız' });
    } else if (action === 'comment' && comment) {
      await sql`INSERT INTO messages (sender_id, context_type, context_id, content) VALUES (${userId}, 'event', ${eventId}, ${comment})`;
      return respond(201, { message: 'Şərh əlavə edildi' });
    }
    
    return respond(400, { error: 'Yanlış əməliyyat' });
  } catch (err) {
    console.error('Events-join error:', err);
    return respond(500, { error: 'Server xətası' });
  }
};

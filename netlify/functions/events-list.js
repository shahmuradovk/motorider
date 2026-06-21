const { getDb, respond, getUserIdFromEvent } = require('./db');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return respond(200, {});
  
  const userId = getUserIdFromEvent(event);
  if (!userId) return respond(401, { error: 'Giriş tələb olunur' });
  
  try {
    const sql = getDb();
    const filter = event.queryStringParameters?.filter || 'all';
    
    let events;
    if (filter === 'mine') {
      events = await sql`
        SELECT e.*, u.first_name as creator_first_name, u.last_name as creator_last_name, u.avatar_color as creator_avatar_color, u.moto_brand as creator_moto_brand
        FROM events e
        JOIN users u ON e.creator_id = u.id
        WHERE e.creator_id = ${userId} OR e.id IN (SELECT event_id FROM event_participants WHERE user_id = ${userId})
        ORDER BY e.event_date ASC
      `;
    } else if (filter === 'upcoming') {
      events = await sql`
        SELECT e.*, u.first_name as creator_first_name, u.last_name as creator_last_name, u.avatar_color as creator_avatar_color, u.moto_brand as creator_moto_brand
        FROM events e
        JOIN users u ON e.creator_id = u.id
        WHERE e.event_date > NOW()
        ORDER BY e.event_date ASC
      `;
    } else {
      events = await sql`
        SELECT e.*, u.first_name as creator_first_name, u.last_name as creator_last_name, u.avatar_color as creator_avatar_color, u.moto_brand as creator_moto_brand
        FROM events e
        JOIN users u ON e.creator_id = u.id
        ORDER BY e.event_date ASC
      `;
    }
    
    // Get participants for each event
    for (let ev of events) {
      const participants = await sql`
        SELECT u.id, u.first_name, u.last_name, u.avatar_color, u.moto_brand
        FROM event_participants ep
        JOIN users u ON ep.user_id = u.id
        WHERE ep.event_id = ${ev.id}
      `;
      ev.participants = participants;
      ev.isJoined = participants.some(p => p.id === userId);
      
      // Get comments
      const comments = await sql`
        SELECT m.*, u.first_name, u.last_name, u.avatar_color
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.context_type = 'event' AND m.context_id = ${ev.id}
        ORDER BY m.created_at ASC
      `;
      ev.comments = comments;
    }
    
    return respond(200, { events });
  } catch (err) {
    console.error('Events-list error:', err);
    return respond(500, { error: 'Server xətası' });
  }
};

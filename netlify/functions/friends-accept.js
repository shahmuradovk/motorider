const { getDb, respond, getUserIdFromEvent } = require('./db');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return respond(200, {});
  if (event.httpMethod !== 'POST') return respond(405, { error: 'Method not allowed' });
  
  const userId = getUserIdFromEvent(event);
  if (!userId) return respond(401, { error: 'Giriş tələb olunur' });
  
  try {
    const { requestId, action } = JSON.parse(event.body);
    if (!requestId || !action) return respond(400, { error: 'ID və əməliyyat tələb olunur' });
    
    const sql = getDb();
    
    if (action === 'accept') {
      await sql`UPDATE friendships SET status = 'accepted' WHERE id = ${requestId} AND friend_id = ${userId}`;
      return respond(200, { message: 'Dostluq qəbul edildi!' });
    } else if (action === 'reject') {
      await sql`DELETE FROM friendships WHERE id = ${requestId} AND friend_id = ${userId}`;
      return respond(200, { message: 'Sorğu rədd edildi' });
    } else if (action === 'remove') {
      await sql`DELETE FROM friendships WHERE id = ${requestId} AND (user_id = ${userId} OR friend_id = ${userId})`;
      return respond(200, { message: 'Dost silindi' });
    }
    
    return respond(400, { error: 'Yanlış əməliyyat' });
  } catch (err) {
    console.error('Friends-accept error:', err);
    return respond(500, { error: 'Server xətası' });
  }
};

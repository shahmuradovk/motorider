const { getDb, respond, getUserIdFromEvent } = require('./db');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return respond(200, {});
  if (event.httpMethod !== 'POST') return respond(405, { error: 'Method not allowed' });
  
  const userId = getUserIdFromEvent(event);
  if (!userId) return respond(401, { error: 'Giriş tələb olunur' });
  
  try {
    const { friendId } = JSON.parse(event.body);
    if (!friendId) return respond(400, { error: 'Dost ID tələb olunur' });
    if (friendId === userId) return respond(400, { error: 'Özünüzə sorğu göndərə bilməzsiniz' });
    
    const sql = getDb();
    
    // Check if already friends or pending
    const existing = await sql`
      SELECT * FROM friendships 
      WHERE (user_id = ${userId} AND friend_id = ${friendId}) 
      OR (user_id = ${friendId} AND friend_id = ${userId})
    `;
    
    if (existing.length > 0) {
      return respond(409, { error: 'Dostluq sorğusu artıq mövcuddur' });
    }
    
    await sql`INSERT INTO friendships (user_id, friend_id, status) VALUES (${userId}, ${friendId}, 'pending')`;
    
    return respond(201, { message: 'Dostluq sorğusu göndərildi' });
  } catch (err) {
    console.error('Friends-request error:', err);
    return respond(500, { error: 'Server xətası' });
  }
};

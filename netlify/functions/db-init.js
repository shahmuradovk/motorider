const { getDb, respond } = require('./db');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return respond(200, {});
  
  try {
    const sql = getDb();
    
    // Create tables
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        first_name TEXT DEFAULT '',
        last_name TEXT DEFAULT '',
        phone TEXT DEFAULT '',
        bio TEXT DEFAULT '',
        birth_date TEXT DEFAULT '',
        moto_brand TEXT DEFAULT '',
        moto_model TEXT DEFAULT '',
        moto_cc INTEGER DEFAULT 0,
        avatar_url TEXT DEFAULT '',
        avatar_color TEXT DEFAULT '#ff6b35',
        role TEXT DEFAULT 'user',
        is_verified BOOLEAN DEFAULT false,
        verification_code TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS locations (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        lat DOUBLE PRECISION NOT NULL,
        lng DOUBLE PRECISION NOT NULL,
        message TEXT,
        share_mode TEXT DEFAULT 'community',
        is_riding BOOLEAN DEFAULT false,
        distance_km DOUBLE PRECISION DEFAULT 0,
        speed DOUBLE PRECISION DEFAULT 0,
        route_data JSONB DEFAULT '[]',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id)
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        date TIMESTAMPTZ NOT NULL,
        location TEXT DEFAULT '',
        lat DOUBLE PRECISION,
        lng DOUBLE PRECISION,
        max_participants INTEGER DEFAULT 0,
        creator_id TEXT REFERENCES users(id),
        participants TEXT[] DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS alerts (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        type TEXT NOT NULL,
        description TEXT DEFAULT '',
        lat DOUBLE PRECISION NOT NULL,
        lng DOUBLE PRECISION NOT NULL,
        creator_id TEXT REFERENCES users(id),
        votes_up INTEGER DEFAULT 0,
        votes_down INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS friends (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id TEXT NOT NULL REFERENCES users(id),
        friend_id TEXT NOT NULL REFERENCES users(id),
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, friend_id)
      )
    `;

    return respond(200, { 
      success: true, 
      message: 'Bütün cədvəllər yaradıldı!',
      tables: ['users', 'locations', 'events', 'alerts', 'friends']
    });

  } catch (err) {
    console.error('DB Init error:', err);
    return respond(500, { error: 'DB init xətası', details: err.message });
  }
};

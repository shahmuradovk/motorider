const { neon } = require('@neondatabase/serverless');

let sql;

function getDb() {
  if (!sql) {
    sql = neon(process.env.DATABASE_URL);
  }
  return sql;
}

// Helper to create standard JSON response
function respond(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    },
    body: JSON.stringify(body)
  };
}

// JWT helper
const jwt = require('jsonwebtoken');

function createToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'motoriders-secret-2026', { expiresIn: '30d' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'motoriders-secret-2026');
  } catch (e) {
    return null;
  }
}

function getUserIdFromEvent(event) {
  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded ? decoded.userId : null;
}

module.exports = { getDb, respond, createToken, verifyToken, getUserIdFromEvent };

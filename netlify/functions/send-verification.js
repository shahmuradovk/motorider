const { Resend } = require('resend');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { email, code } = JSON.parse(event.body);

    if (!email || !code) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email və kod tələb olunur' })
      };
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const { data, error } = await resend.emails.send({
      from: 'MotoRiders <onboarding@resend.dev>',
      to: [email],
      subject: `MotoRiders Təsdiq Kodu: ${code}`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 480px; margin: 0 auto; background: #0a0a0f; border-radius: 16px; overflow: hidden; border: 1px solid #2a2a3a;">
          
          <div style="background: linear-gradient(135deg, #ff6b35, #ff3333); padding: 32px; text-align: center;">
            <h1 style="color: #fff; margin: 0; font-size: 28px; font-weight: 800;">🏍️ MotoRiders</h1>
            <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">Bakı Moto Birliyi</p>
          </div>
          
          <div style="padding: 32px; text-align: center;">
            <h2 style="color: #ffffff; margin: 0 0 8px; font-size: 20px;">Email Təsdiqi</h2>
            <p style="color: #8888aa; margin: 0 0 24px; font-size: 14px; line-height: 1.5;">
              MotoRiders-ə qoşulmaq üçün aşağıdakı kodu daxil edin:
            </p>
            
            <div style="background: #13131a; border: 2px solid #ff6b35; border-radius: 12px; padding: 20px; margin: 0 auto 24px; display: inline-block;">
              <span style="font-size: 36px; font-weight: 800; letter-spacing: 12px; color: #ff6b35; font-family: monospace;">${code}</span>
            </div>
            
            <p style="color: #8888aa; font-size: 12px; margin: 0; line-height: 1.5;">
              Bu kod 10 dəqiqə ərzində etibarlıdır.<br>
              Əgər siz bu sorğunu göndərməmisinizsə, bu emaili iqnor edin.
            </p>
          </div>
          
          <div style="padding: 16px 32px; border-top: 1px solid #2a2a3a; text-align: center;">
            <p style="color: #555; font-size: 11px; margin: 0;">© 2026 MotoRiders — Birlikdə sürək, birlikdə yaşayaq</p>
          </div>
        </div>
      `
    });

    if (error) {
      console.error('Resend error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Email göndərilə bilmədi', details: error.message })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'Təsdiq kodu göndərildi' })
    };

  } catch (err) {
    console.error('Server error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server xətası', details: err.message })
    };
  }
};

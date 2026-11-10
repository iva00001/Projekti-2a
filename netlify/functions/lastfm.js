// netlify/functions/lastfm.js
// Netlify-funktio: toimii välityspalvelimena Last.fm API:lle

exports.handler = async (event) => {
  // Salli CORS-pyynnöt
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Käsittele OPTIONS-esipyyntö (CORS-preflight)
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Hae polun parametrit (method, artist, album)
  const { method, artist, album, limit } = event.queryStringParameters || {};

  // Validoi pakolliset parametrit
  if (!method) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'method-parametri vaaditaan' })
    };
  }

  // API-avain ympäristömuuttujista (ei koskaan kovakoodattuna!)
  const API_KEY = process.env.LASTFM_API_KEY;
  if (!API_KEY) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'API-avain puuttuu' })
    };
  }

  // Rakenna Last.fm API-URL
  const baseUrl = 'https://ws.audioscrobbler.com/2.0/';
  const params = new URLSearchParams({
    method,
    api_key: API_KEY,
    format: 'json'
  });

  // Lisää valinnaiset parametrit
  if (artist) params.append('artist', artist);
  if (album) params.append('album', album);
  if (limit) params.append('limit', limit);

  try {
    // Suorita pyyntö Last.fm API:lle
    const response = await fetch(`${baseUrl}?${params.toString()}`);
    const data = await response.json();

    // Palauta data selaimelle
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data)
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'API-pyyntö epäonnistui', details: error.message })
    };
  }
};
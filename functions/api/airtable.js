/**
 * Cloudflare Pages Function to handle Airtable API requests
 * This runs server-side, so the Airtable token is never exposed to the client
 */

export async function onRequest(context) {
  const { request, env } = context;
  
  // Only allow GET and POST requests
  if (request.method !== 'GET' && request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Get Airtable token from environment variables (set in Cloudflare Pages dashboard)
  const AIRTABLE_TOKEN = env.AIRTABLE_TOKEN;
  const AIRTABLE_BASE_ID = env.AIRTABLE_BASE_ID || 'appOLeQs1TFrsSbe2';

  if (!AIRTABLE_TOKEN) {
    return new Response(
      JSON.stringify({ 
        error: 'Airtable token not configured. Please set AIRTABLE_TOKEN in Cloudflare Pages environment variables.' 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const url = new URL(request.url);
    const tableName = url.searchParams.get('table');
    const recordId = url.searchParams.get('recordId');
    const view = url.searchParams.get('view') || 'Grid view';
    const maxRecords = url.searchParams.get('maxRecords') || '100';
    const filterByFormula = url.searchParams.get('filterByFormula');

    if (!tableName) {
      return new Response(
        JSON.stringify({ error: 'Table name is required. Use ?table=YourTableName' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Build Airtable API URL
    let airtableUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}`;
    
    if (recordId) {
      // Get a specific record
      airtableUrl += `/${recordId}`;
    } else {
      // List records with query parameters
      const params = new URLSearchParams();
      if (view) params.append('view', view);
      if (maxRecords) params.append('maxRecords', maxRecords);
      if (filterByFormula) params.append('filterByFormula', filterByFormula);
      
      const queryString = params.toString();
      if (queryString) {
        airtableUrl += `?${queryString}`;
      }
    }

    // Handle POST requests for creating/updating records
    if (request.method === 'POST') {
      const body = await request.json();
      
      if (recordId) {
        // Update existing record
        const updateResponse = await fetch(airtableUrl, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fields: body.fields || body,
          }),
        });

        if (!updateResponse.ok) {
          const error = await updateResponse.text();
          throw new Error(`Airtable API error: ${error}`);
        }

        const data = await updateResponse.json();
        return new Response(JSON.stringify(data), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        });
      } else {
        // Create new record(s)
        const createResponse = await fetch(airtableUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            records: Array.isArray(body) 
              ? body.map(item => ({ fields: item.fields || item }))
              : [{ fields: body.fields || body }],
          }),
        });

        if (!createResponse.ok) {
          const error = await createResponse.text();
          throw new Error(`Airtable API error: ${error}`);
        }

        const data = await createResponse.json();
        return new Response(JSON.stringify(data), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        });
      }
    }

    // Handle GET requests (list or retrieve records)
    const response = await fetch(airtableUrl, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Airtable API error: ${error}`);
    }

    const data = await response.json();
    
    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error('Airtable API Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to fetch from Airtable',
        details: error.toString()
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}

// Handle OPTIONS for CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}


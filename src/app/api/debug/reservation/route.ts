import { NextRequest, NextResponse } from 'next/server';

const GUESTY_API_URL = 'https://open-api.guesty.com/v1';

async function getToken() {
  if (process.env.GUESTY_ACCESS_TOKEN) {
    return process.env.GUESTY_ACCESS_TOKEN;
  }

  const response = await fetch('https://open-api.guesty.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      scope: 'open-api',
      client_id: process.env.GUESTY_CLIENT_ID!,
      client_secret: process.env.GUESTY_CLIENT_SECRET!,
    }),
  });

  const data = await response.json();
  return data.access_token;
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
  }

  try {
    const token = await getToken();
    const response = await fetch(`${GUESTY_API_URL}/reservations/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    const data = await response.json();

    // Return just the custom fields and some basic info
    return NextResponse.json({
      id: data._id,
      confirmationCode: data.confirmationCode,
      customFields: data.customFields,
      // Also check these fields
      customFieldsRaw: JSON.stringify(data.customFields),
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to fetch reservation',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

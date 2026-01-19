import { NextResponse } from 'next/server';
import { getCustomFields } from '@/lib/guesty';

export async function GET() {
  try {
    const fields = await getCustomFields();
    return NextResponse.json({
      count: fields.length,
      fields: fields.map(f => ({
        id: f._id,
        fieldId: f.fieldId,
        title: f.title,
      }))
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to fetch custom fields',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

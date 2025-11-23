import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const buffer = await req.arrayBuffer();

    const response = await fetch('http://localhost:4000/agent/transcribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'audio/webm',
      },
      body: buffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend transcription error:', errorText);
      return NextResponse.json({ error: 'Transcription failed' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error in transcribe route:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

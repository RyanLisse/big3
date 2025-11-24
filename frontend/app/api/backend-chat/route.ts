import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    // Parse the request body
    const body = await req.json();
    const messages = body.messages || [];

    // Forward the request to the Big3 backend
    const backendResponse = await fetch("http://localhost:4000/agent/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: messages.map((msg: any) => ({
          role: msg.role,
          content: msg.content,
        })),
      }),
    });

    if (!backendResponse.ok) {
      throw new Error(`Backend responded with ${backendResponse.status}`);
    }

    // Stream the response from the backend
    const reader = backendResponse.body?.getReader();
    if (!reader) {
      throw new Error("No response body from backend");
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            // Forward the chunk
            if (value instanceof Uint8Array) {
              controller.enqueue(value);
            } else {
              controller.enqueue(encoder.encode(value));
            }
          }
        } catch (error) {
          console.error("Streaming error:", error);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Backend chat API error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to connect to backend" }),
      { status: 500 }
    );
  }
}

import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { NextRequest } from "next/server";

// Configure Anthropic Claude
const model = anthropic("claude-3-5-sonnet-20241022");

export async function POST(req: NextRequest) {
  try {
    // Parse the request body
    const body = await req.json();
    const messages = body.messages || [];

    // Create a streaming chat completion with Claude
    const result = await streamText({
      model,
      messages: [
        {
          role: "system",
          content: `You are the Big3 Super-Agent, an advanced AI assistant that helps users with coding, automation, and various tasks. 

Key capabilities:
- Code generation and debugging
- Task automation and workflow management
- Multi-agent coordination
- File operations and system integration
- Voice interaction support

Be helpful, concise, and professional. When relevant, suggest specific actions or tools that might help the user.`,
        },
        ...messages,
      ],
      temperature: 0.7,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process chat request" }),
      { status: 500 }
    );
  }
}

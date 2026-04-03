import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, mode, systemPrompt } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    const zai = await ZAI.create();

    // Build the full messages array with system prompts prepended
    // Priority: skill/project systemPrompt → mode-specific prompt → default
    const systemMessages: { role: 'system'; content: string }[] = [];

    // 1. Custom system prompt (from skill or project context)
    if (systemPrompt && systemPrompt.trim()) {
      systemMessages.push({
        role: 'system',
        content: systemPrompt.trim(),
      });
    }

    // 2. Mode-specific system prompt
    const modePrompts: Record<string, string> = {
      summarize: 'You are a text analysis assistant. Summarize the provided text concisely. Be practical and organized.',
      tag: 'You are a text tagging assistant. Suggest 2-4 relevant tags. Return ONLY a comma-separated list of tags, nothing else.',
      rewrite: 'You are a text editing assistant. Rewrite the provided text for clarity, readability, and correct grammar while preserving the original meaning and tone.',
      'extract-tasks': 'You are a task extraction assistant. Extract actionable tasks from the text. List each task with a checkbox [ ] prefix.',
      search: 'You are a research assistant. Identify key topics, themes, and concepts from the provided document.',
      chat: 'You are a helpful AI assistant with access to the user\'s document. Answer questions about the text, suggest edits, explain concepts, and help with writing. Be concise but thorough.',
      skill: 'You are a specialized AI assistant. Follow the skill instructions provided above carefully.',
    };

    if (mode && modePrompts[mode]) {
      systemMessages.push({
        role: 'system',
        content: modePrompts[mode],
      });
    }

    // 3. Default fallback (only if no mode-specific prompt matched)
    if (!mode || !modePrompts[mode]) {
      systemMessages.push({
        role: 'system',
        content: 'You are a helpful text analysis assistant. Be concise and practical.',
      });
    }

    // Build the final messages array
    // For multi-turn conversations, use the last 20 messages to stay within context limits
    const recentMessages = messages.slice(-20);

    const completion = await zai.chat.completions.create({
      messages: [
        ...systemMessages,
        ...recentMessages.map((m: { role: string; content: string }) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ],
    });

    const messageContent = completion.choices[0]?.message?.content ?? 'No response generated.';

    return NextResponse.json({ output: messageContent, mode: mode ?? 'chat' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('AI API error:', message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

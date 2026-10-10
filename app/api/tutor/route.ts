import { streamText } from 'ai';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getModel } from '@/lib/ai';
import { guardAiRequest, safeErrorMessage } from '@/lib/api-guards';
import { tutorSystemPrompt } from '@/lib/prompts';

export const maxDuration = 45;

const requestSchema = z.object({
  targetRole: z.string().min(2).max(120),
  currentModule: z.string().max(200).optional(),
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1).max(4000),
  })).min(1).max(20),
});

export async function POST(request: Request) {
  const blocked = await guardAiRequest();
  if (blocked) return blocked;

  try {
    const input = requestSchema.parse(await request.json());
    const conversation = input.messages
      .slice(-12)
      .map((message) => `${message.role === 'user' ? 'Learner' : 'Mentor'}: ${message.content}`)
      .join('\n\n');

    let streamError: unknown;
    const result = streamText({
      model: getModel(),
      system: tutorSystemPrompt(input.targetRole, input.currentModule),
      prompt: `Continue this tutoring conversation. Use the last learner message as the request and keep continuity with earlier turns.\n\n${conversation}\n\nMentor:`,
      temperature: 0.45,
      onError({ error }) {
        streamError = error;
        console.error('tutor stream error:', error);
      },
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of result.textStream) {
            controller.enqueue(encoder.encode(chunk));
          }
          if (streamError) {
            controller.enqueue(encoder.encode(`\n\nAI tutor error: ${safeErrorMessage(streamError)}`));
          }
        } catch (error) {
          controller.enqueue(encoder.encode(`\n\nAI tutor error: ${safeErrorMessage(error)}`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid tutor request.' }, { status: 400 });
    console.error('tutor error:', error);
    return NextResponse.json({ error: 'The tutor could not respond.', detail: safeErrorMessage(error) }, { status: 500 });
  }
}

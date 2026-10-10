import { generateText, Output } from 'ai';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getModel } from '@/lib/ai';
import { guardAiRequest, safeErrorMessage } from '@/lib/api-guards';
import { quizSystemPrompt } from '@/lib/prompts';
import { quizSchema } from '@/lib/schemas';

export const maxDuration = 45;

const requestSchema = z.object({
  targetRole: z.string().min(2).max(120),
  moduleTitle: z.string().min(2).max(180),
  objective: z.string().min(5).max(1000),
  keyTopics: z.array(z.string().min(1).max(120)).min(2).max(10),
});

export async function POST(request: Request) {
  const blocked = await guardAiRequest();
  if (blocked) return blocked;

  try {
    const input = requestSchema.parse(await request.json());
    const { output } = await generateText({
      model: getModel(),
      system: quizSystemPrompt,
      prompt: `Target job role: ${input.targetRole}\nModule: ${input.moduleTitle}\nObjective: ${input.objective}\nTopics: ${input.keyTopics.join(', ')}\nWrite questions that check practical understanding of this module.`,
      output: Output.object({ schema: quizSchema }),
      temperature: 0.25,
    });

    if (!output) throw new Error('The model did not return a valid quiz.');
    return NextResponse.json(output);
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'The selected module data is incomplete.' }, { status: 400 });
    console.error('quiz error:', error);
    return NextResponse.json({ error: 'Could not create a quiz.', detail: safeErrorMessage(error) }, { status: 500 });
  }
}

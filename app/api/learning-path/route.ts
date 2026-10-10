import { generateText, Output } from 'ai';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getModel } from '@/lib/ai';
import { guardAiRequest, safeErrorMessage } from '@/lib/api-guards';
import { syllabusSystemPrompt } from '@/lib/prompts';
import { syllabusSchema } from '@/lib/schemas';

export const maxDuration = 45;

const requestSchema = z.object({
  background: z.string().min(10).max(2500),
  targetRole: z.string().min(2).max(120),
  currentLevel: z.enum(['Beginner', 'Intermediate', 'Advanced']).default('Beginner'),
  hoursPerWeek: z.number().int().min(2).max(40).default(6),
  focusSkills: z.string().max(500).optional().default(''),
});

export async function POST(request: Request) {
  const blocked = await guardAiRequest();
  if (blocked) return blocked;

  try {
    const input = requestSchema.parse(await request.json());
    const prompt = [
      `Target role: ${input.targetRole}`,
      `Current level: ${input.currentLevel}`,
      `Available study time: ${input.hoursPerWeek} hours per week`,
      `Current background: ${input.background}`,
      `Focus skills or interests: ${input.focusSkills || 'Use the most relevant skills for the target role.'}`,
      'Design the plan to fit the learner’s stated time budget and build toward demonstrable job readiness.',
    ].join('\n');

    const { output } = await generateText({
      model: getModel(),
      system: syllabusSystemPrompt,
      prompt,
      output: Output.object({ schema: syllabusSchema }),
      temperature: 0.35,
    });

    if (!output) throw new Error('The model did not return a valid curriculum. Please try again.');
    return NextResponse.json(output);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Please check your inputs. Background must be at least 10 characters.' }, { status: 400 });
    }
    console.error('learning-path error:', error);
    return NextResponse.json({ error: 'Could not generate the learning path.', detail: safeErrorMessage(error) }, { status: 500 });
  }
}

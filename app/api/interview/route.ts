import { generateText, Output } from 'ai';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getModel } from '@/lib/ai';
import { guardAiRequest, safeErrorMessage } from '@/lib/api-guards';
import { interviewSystemPrompt } from '@/lib/prompts';
import { interviewSchema } from '@/lib/schemas';

export const maxDuration = 45;

export const runtime = 'nodejs';

const requestSchema = z.object({
  targetRole: z.string().min(2).max(120),
  experienceLevel: z
    .enum(['Internship', 'Entry-level', 'Mid-level', 'Senior'])
    .default('Entry-level'),
  question: z.string().min(5).max(1000),
  answer: z.string().min(10).max(5000),
});

export async function POST(request: Request) {
  const blocked = await guardAiRequest();

  if (blocked) {
    return blocked;
  }

  try {
    const body = await request.json();
    const input = requestSchema.parse(body);

    const { output } = await generateText({
      model: getModel(),
      system: interviewSystemPrompt,
      prompt: `
Evaluate the candidate's interview answer fairly.

Target role: ${input.targetRole}
Experience level: ${input.experienceLevel}

Interview question:
${input.question}

Candidate's answer:
${input.answer}

Evaluate the answer based on:
1. Technical correctness.
2. Understanding of the subject.
3. Clarity and relevance.
4. Practical application.
5. Important missing details.

Provide constructive feedback appropriate to the candidate's experience level.
Return the evaluation using the required structured output schema.
      `.trim(),
      output: Output.object({
        schema: interviewSchema,
      }),
      temperature: 0.2,
    });

    if (!output) {
      console.error('Interview evaluation returned an empty output.');

      return NextResponse.json(
        { error: 'The AI model returned an empty evaluation. Please try again.' },
        { status: 502 }
      );
    }

    return NextResponse.json(output);
  } catch (error) {
    console.error('Interview evaluation failed:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error:
            'Invalid request. Enter an interview question and an answer containing at least 10 characters.',
          issues: error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    const detail = safeErrorMessage(error);

    return NextResponse.json(
      {
        error: 'Could not evaluate this answer.',
        detail,
      },
      { status: 500 }
    );
  }
}
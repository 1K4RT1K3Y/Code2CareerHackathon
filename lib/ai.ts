import { createGatewayProvider } from '@ai-sdk/gateway';

export function getModel() {
  const modelId = process.env.AI_GATEWAY_MODEL || 'openai/gpt-4o-mini';
  const apiKey = process.env.AI_GATEWAY_API_KEY;

  if (!apiKey) {
    throw new Error(
      'AI_GATEWAY_API_KEY is missing from the server environment.'
    );
  }

  return createGatewayProvider({ apiKey })(modelId);
}
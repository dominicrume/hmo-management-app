import Anthropic from '@anthropic-ai/sdk';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const models = [
  'claude-3-5-sonnet-20241022',
  'claude-3-5-sonnet-20240620',
  'claude-3-opus-20240229',
  'claude-3-sonnet-20240229',
  'claude-3-haiku-20240307',
  'claude-2.1',
  'claude-instant-1.2'
];

async function test() {
  for (const model of models) {
    try {
      await anthropic.messages.create({
        model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'test' }]
      });
      console.log(`✅ SUCCESS: ${model}`);
    } catch (e) {
      console.log(`❌ FAILED: ${model} -> ${e.status} ${e.error?.error?.type || e.message}`);
    }
  }
}
test();

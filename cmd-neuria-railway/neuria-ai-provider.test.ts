import {test,expect} from 'bun:test';
import {aiConfiguration,aiPublicStatus,aiGenerationOptions} from './neuria-ai-provider.ts';
test('Gemini key with accidental spaces is recognized without exposing it in public status',()=>{
 const env={'    GEMINI_API_KEY':' test-google-key ',NEURIA_AI_MODEL:'old-model',NEURIA_AI_API_KEY:'old-key',NEURIA_AI_ENDPOINT:'https://api.cloudflare.com/test'};
 expect(aiConfiguration(env)).toMatchObject({token:'test-google-key',model:'gemini-3.8-flash',provider:'google'});expect(aiPublicStatus(env).ready).toBe(true);expect(JSON.stringify(aiPublicStatus(env))).not.toContain('test-google-key');
});
test('the existing provider is preserved when Gemini is absent or an unresolved reference',()=>{
 const env={GEMINI_API_KEY:'${{missing}}',NEURIA_AI_API_KEY:'test-key',NEURIA_AI_ENDPOINT:'https://api.cloudflare.com/test',NEURIA_AI_MODEL:'@cf/openai/gpt-oss-120b'};
 expect(aiConfiguration(env).model).toBe('@cf/openai/gpt-oss-120b');expect(aiPublicStatus({}).ready).toBe(false);
});
test('Gemini receives bounded output parameters while existing provider options remain intact',()=>{expect(aiGenerationOptions('google','court').max_tokens).toBe(1024);expect(aiGenerationOptions('google','detaille').max_tokens).toBe(4096);expect(aiGenerationOptions('cloudflare')).toEqual({})});

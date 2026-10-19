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
test('temporary Gemini failure uses GPT OSS without leaking Google credentials to the fallback',async()=>{
 const {fetchAI}=await import('./neuria-ai-provider.ts');const calls=[];
 const env={GEMINI_API_KEY:'test-google',NEURIA_AI_ENDPOINT:'https://api.cloudflare.com/test',NEURIA_AI_API_KEY:'test-cloudflare',NEURIA_AI_MODEL:'@cf/openai/gpt-oss-120b'};
 const request=async(url,options)=>{calls.push({url,options});return calls.length===1?new Response('{}',{status:503}):Response.json({choices:[{message:{content:'Secours'}}]})};
 const response=await fetchAI('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',{body:JSON.stringify({model:'gemini-3.8-flash',messages:[],reasoning_effort:'low'})},env,request);
 expect(response.ok).toBe(true);expect(response.neuriaModel).toBe('@cf/openai/gpt-oss-120b');expect(response.neuriaFallback).toBe(true);expect(calls[1].options.headers.authorization).toBe('Bearer test-cloudflare');expect(calls[1].options.body).not.toContain('test-google');
});
test('authentication errors are reported instead of silently hiding a bad Gemini key',async()=>{
 const {fetchAI}=await import('./neuria-ai-provider.ts');let calls=0;const result=await fetchAI('https://google.test',{}, {GEMINI_API_KEY:'test'},async()=>{calls++;return new Response('{}',{status:403})});expect(result.status).toBe(403);expect(calls).toBe(1);
});
test('a Google network failure falls back while the overall request is still active',async()=>{
 const {fetchAI}=await import('./neuria-ai-provider.ts');let calls=0;
 const result=await fetchAI('https://google.test',{body:'{"model":"gemini-3.8-flash"}'},{GEMINI_API_KEY:'test-google',NEURIA_AI_ENDPOINT:'https://api.cloudflare.com/test',NEURIA_AI_API_KEY:'test-cloudflare',NEURIA_AI_MODEL:'@cf/openai/gpt-oss-120b'},async()=>{calls++;if(calls===1)throw new TypeError('Network unavailable');return Response.json({choices:[{message:{content:'Secours'}}]})});
 expect(calls).toBe(2);expect(result.neuriaFallback).toBe(true);expect(result.neuriaPrimaryStatus).toBe(504);
});

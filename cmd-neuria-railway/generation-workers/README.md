# CMD NEURIA — Real generation workers

The existing Bun API expects two **separate** HTTPS POST endpoints:

- `NEURIA_ORACLE_WORKER_URL`: receives `{prompt,format:"glb"}`, returns binary GLB (`glTF` magic).
- `NEURIA_PULSE_WORKER_URL`: receives `{prompt,format:"wav"}`, returns RIFF/WAVE binary.
- Both require `Authorization: Bearer <NEURIA_GENERATION_WORKER_TOKEN>`.

## Candidate engines (not installed)
- Oracle: open-source text-to-3D / image-to-3D pipeline such as TRELLIS or Hunyuan3D. Check model license, weights, GPU memory, and CPU feasibility before enabling.
- Pulse instrumental: Meta AudioCraft MusicGen, subject to its noncommercial model-weight license. **MusicGen alone does not satisfy sung vocals**. A separately licensed singing-capable generation model is necessary.
- Never present a procedural tone synthesizer as neural music generation or singing.

## Deployment safety
1. Validate model license and memory requirements.
2. Confirm available Railway compute and projected charges. CPU-only Railway cannot be assumed sufficient.
3. Deploy actual worker with health check and authenticated generation endpoint.
4. Generate and validate a GLB and a WAV with vocals before setting worker URLs.
5. Keep routes returning 503 until verified. Do not provision paid GPU automatically.
6. Account quotas must be persistent, atomic, and enforced server-side.

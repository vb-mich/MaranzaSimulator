// Worker thread entry of scripts/autoplay.ts. tsx's preload doesn't reach worker threads, so the
// worker loads the TypeScript through tsx's API instead.
import { tsImport } from 'tsx/esm/api';

await tsImport('./autoplay.ts', import.meta.url);

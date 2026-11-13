import { productionConfig } from './runtime-config.ts';
// Real transport/bootstrap activation is deliberately unavailable until S04c approval.
productionConfig(process.env);
throw new Error('Production activation requires the separate S04c operational gate.');

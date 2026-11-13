// Invented deterministic test keys only. Never imported by production entry points.
import { Store } from '../../server/store.ts';
import { JsonCipher } from '../../server/lifecycle.ts';
import type { Pool } from 'pg';
export const snapshots = new JsonCipher(new Map([['invented-v1',Buffer.alloc(32,17)]]),'invented-v1','snapshot');
export const journalCipher = new JsonCipher(new Map([['invented-j1',Buffer.alloc(32,29)]]),'invented-j1','journal');
export class SyntheticStore extends Store {
 constructor(pool:Pool,owner:string,now=Date.now){super(pool,owner,now);this.snapshotsCipher=snapshots;}
}

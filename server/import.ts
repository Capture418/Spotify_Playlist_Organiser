import type { LibraryItem } from '../src/domain/library.ts';
import type { Session } from './store.ts';
import { Store } from './store.ts';
import { bounded } from './security.ts';
import { requireValue,Fault } from './validation.ts';
export type Page={offset:number;total:number;items:LibraryItem[];next:number|null};
export async function importCollection(store:Store,session:Session,kind:'playlist'|'album',page:(offset:number,signal:AbortSignal)=>Promise<Page>){
 const stamp=await store.beginImport(session,kind),items:LibraryItem[]=[];let offset=0,total:number|undefined;const ids=new Set<string>();
 const signal=AbortSignal.timeout(10000);
 for(let n=0;n<100;n++){
  const response=await bounded(signal,()=>page(offset,signal));
  requireValue(Number.isSafeInteger(response.total)&&response.total>=0&&response.total<=10000&&response.offset===offset&&Array.isArray(response.items)&&response.items.length<=100,'Invalid collection page');
  total??=response.total;requireValue(total===response.total,'Collection changed during refresh');
  for(const item of response.items){requireValue(item.kind===kind&&!ids.has(item.id),'Duplicate or wrong-kind item');ids.add(item.id);items.push(item);}
  requireValue(items.length<=total);if(response.next===null){requireValue(items.length===total,'Incomplete collection');await store.publishImport(session,kind,stamp,items,true);return;}
  requireValue(response.items.length>0&&response.next===offset+response.items.length&&response.next>offset,'Invalid pagination');offset=response.next;
 }
 throw new Fault(422,'Collection page limit exceeded');
}

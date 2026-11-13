import type { TagEdit } from './library.ts';
/** Keeps the opening revision and retry identity independent of background polling. */
export class EditAttempt {
 private openingRevision = '';
 private pending: {requestId:string;revision:string;edit:TagEdit}|null = null;
 begin(revision:string){this.openingRevision=revision;this.pending=null;}
 cancel(){this.pending=null;this.openingRevision='';}
 request(edit:TagEdit,latestRevision:string,reapply=false){
  if(!this.openingRevision)throw Error('Open an editor before saving');
  if(!this.pending||reapply)this.pending={requestId:crypto.randomUUID(),revision:reapply?latestRevision:this.openingRevision,edit:structuredClone(edit)};
  return this.pending;
 }
}

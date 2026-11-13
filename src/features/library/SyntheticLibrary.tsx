import { useEffect,useRef,useState } from 'react';
import type { TagEdit } from '../../domain/library.ts';
import { ApiError,request } from '../../data/remote-library.ts';
import type { LibraryState } from '../../data/remote-library.ts';
import { EditAttempt } from '../../domain/edit-attempt.ts';
import { LibraryScreen } from './LibraryScreen.tsx';
type Preview={id:string;revision:string;tagsAdded:number;tagsRemoved:number;assignmentsAdded:number;assignmentsRemoved:number;affectedItems:number;unavailableItems:number};
export function SyntheticLibrary({harness=false}:{harness?:boolean}){
 const [state,setState]=useState<LibraryState|null>(null),[csrf,setCsrf]=useState(''),[ready,setReady]=useState(false),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[online,setOnline]=useState(navigator.onLine),[preview,setPreview]=useState<Preview|null>(null),[confirmed,setConfirmed]=useState(false),[deleting,setDeleting]=useState(false),[snapshots,setSnapshots]=useState<{id:string;revision:string}[]>([]);
 const pending=useRef(new EditAttempt()),restoreRequest=useRef<string>('');
 const stateRef=useRef(state);stateRef.current=state;
 const epoch=useRef(0);
 function clearSession(){epoch.current++;pending.current.cancel();restoreRequest.current='';setPreview(null);setSnapshots([]);setConfirmed(false);setDeleting(false);setState(null);setCsrf('');}
 function expired(error:unknown){if(error instanceof ApiError&&error.status===401){clearSession();setMessage('Connection expired. Reconnect to continue; unsaved drafts have been discarded.');return true;}return false;}
 async function load(){const version=epoch.current;const next=await request<LibraryState>('library','');if(version!==epoch.current)throw Error('Session changed; reconnect to continue.');setState(next);return next;}
 useEffect(()=>{let disposed=false;void request<{csrf:string}>('session','').then(async s=>{const data=await request<LibraryState>('library','');if(!disposed){setCsrf(s.csrf);setState(data);}}).catch(error=>{if(!disposed&&!(error instanceof ApiError&&error.status===401))setMessage('Cannot reach the synthetic server.');}).finally(()=>{if(!disposed)setReady(true);});return()=>{disposed=true;};},[]);
 useEffect(()=>{
  if(!csrf)return;let disposed=false;const version=epoch.current;async function poll(){if(document.hidden||!navigator.onLine)return;try{const data=await request<LibraryState>('library','');if(!disposed&&version===epoch.current){setState(data);setMessage('Library is up to date.');}}catch(error){if(!disposed&&version===epoch.current){setMessage('Library may be out of date. Refresh when connected.');if(error instanceof ApiError&&error.status===401){clearSession();setMessage('Connection expired. Reconnect to continue; unsaved drafts have been discarded.');}}}}
  const timer=setInterval(()=>void poll(),15000);const focus=()=>void poll();window.addEventListener('focus',focus);document.addEventListener('visibilitychange',focus);return()=>{disposed=true;clearInterval(timer);window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',focus);};
 },[csrf]);
 useEffect(()=>{const change=()=>setOnline(navigator.onLine);window.addEventListener('online',change);window.addEventListener('offline',change);return()=>{window.removeEventListener('online',change);window.removeEventListener('offline',change);};},[]);
 async function action(work:()=>Promise<void>){setBusy(true);try{await work();}catch(error){if(!expired(error))setMessage(error instanceof Error?error.message:'Action failed');}finally{setBusy(false);}}
 async function save(edit:TagEdit,reapply:boolean){
  if(!stateRef.current)throw Error('Sign in required');
  const version=epoch.current;
  const attempt=pending.current.request(edit,stateRef.current.revision,reapply);
  try{await request('edit',csrf,attempt);if(version!==epoch.current)throw Error('Session changed; draft discarded.');await load();if(version!==epoch.current)throw Error('Session changed; draft discarded.');pending.current.cancel();setMessage('Saved to the synthetic database.');}
  catch(error){if(version!==epoch.current)throw error;if(expired(error))throw error;if(error instanceof ApiError&&error.status===409){await load();throw new ApiError(409,'Another session changed the library. Review the latest tags below, then deliberately reapply your draft.');}throw error;}
 }
 async function download(){const data=await request('export',csrf);const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='organiser-synthetic.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setMessage('Organisation export downloaded.');}
 if(!ready)return <main className="app-shell"><p role="status">Loading synthetic session…</p></main>;
 if(!state)return <main className="app-shell"><h1>{harness?'Connection rehearsal':'Synthetic library'}</h1><p>Invented data only. No Spotify connection. Changes are saved on this Mac.</p><button className="primary-button" disabled={busy||!online} onClick={()=>void action(async()=>{clearSession();const s=await request<{csrf:string}>('synthetic-login','',{});setCsrf(s.csrf);await load();setMessage('Signed into the invented owner account.');})}>{harness?'Connect / reconnect invented account':'Open synthetic library'}</button><p role="status">{message}</p></main>;
 return <>
  <section className="synthetic-controls" aria-label="Synthetic library storage">
   <strong>Synthetic database · invented data only</strong><p role="status">{!online?'Offline — editing is unavailable. ':''}{message}</p>
   <p>Recovery snapshots: newest 10, for up to 7 days. Exports contain your organisation, not credentials or Spotify metadata.</p>
   {harness&&<div className="storage-actions" aria-label="Synthetic test controls"><button disabled={busy} onClick={()=>void action(async()=>{await request('test/expire',csrf,{});await load();})}>Simulate connection expiry</button><button disabled={busy} onClick={()=>void action(async()=>{await request('test/snapshot-key',csrf,{});setMessage('Invented snapshot key unavailable. Current organisation is unchanged.');})}>Simulate unavailable snapshot key</button></div>}
   <div className="storage-actions">
    <button disabled={busy||!online} onClick={()=>void action(async()=>{await request('refresh',csrf,{});await load();setMessage('Invented catalogue refreshed; tags preserved.');})}>Refresh catalogue</button>
    <button disabled={busy||!online} onClick={()=>void action(download)}>Export organisation</button>
    <label className="restore-file">Preview restore<input type="file" accept=".json,application/json" disabled={busy||!online} onChange={e=>{const f=e.target.files?.[0];e.target.value='';if(!f)return;void action(async()=>{if(f.size>10*1024*1024)throw Error('Restore file exceeds 10 MiB.');const data:unknown=JSON.parse(await f.text());setPreview(await request<Preview>('restore/preview',csrf,data));setConfirmed(false);restoreRequest.current=crypto.randomUUID();});}}/></label>
    <button disabled={busy||!online} onClick={()=>void action(async()=>{setSnapshots(await request('snapshots',csrf));setMessage('Recoverable snapshots loaded.');})}>Recover a snapshot</button>
    <button disabled={busy} onClick={()=>void action(async()=>{await request('signout',csrf,{});clearSession();setMessage('Signed out. Your saved organisation is retained.');})}>Sign out</button>
    <button disabled={busy} onClick={()=>void action(async()=>{await request('signout-all',csrf,{});clearSession();setMessage('Signed out. Your saved organisation is retained.');})}>Sign out all sessions</button>
    <button disabled={busy} onClick={()=>setDeleting(v=>!v)}>Disconnect and delete</button>
   </div>
   {snapshots.length>0&&<ul>{snapshots.map(s=><li key={s.id}><button disabled={busy} onClick={()=>void action(async()=>{setPreview(await request<Preview>('snapshots/preview',csrf,{id:s.id}));setConfirmed(false);restoreRequest.current=crypto.randomUUID();})}>Preview snapshot at revision {s.revision}</button></li>)}</ul>}
   {preview&&<section className="restore-preview" aria-label="Restore preview"><h2>Replace organisation?</h2><p>{preview.tagsAdded} tags added; {preview.tagsRemoved} removed. {preview.assignmentsAdded} assignments added; {preview.assignmentsRemoved} removed. {preview.affectedItems} affected items; {preview.unavailableItems} unavailable items.</p><p>Current organisation will be replaced. A recoverable snapshot will be saved first. Spotify metadata and sessions will stay unchanged.</p><label><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>I confirm this replacement</label><button disabled={!confirmed||busy||!online} onClick={()=>void action(async()=>{await request('restore/confirm',csrf,{previewId:preview.id,revision:preview.revision,requestId:restoreRequest.current,confirm:true});await load();setPreview(null);setSnapshots([]);setMessage('Restore saved. The previous organisation is recoverable.');})}>Replace organisation</button><button disabled={busy} onClick={()=>setPreview(null)}>Cancel restore</button></section>}
   {deleting&&<section className="restore-preview"><h2>Delete this synthetic library?</h2><p>Export your organisation first if you want to keep it. This deletes tags, sessions, credentials, metadata and snapshots. A minimal encrypted deletion record is retained until backups can no longer restore this account. Signing out instead keeps your work.</p><button disabled={busy} onClick={()=>void action(download)}>Export before deleting</button><button disabled={busy||!online} onClick={()=>void action(async()=>{const result=await request<{reconciled:boolean}>('disconnect',csrf,{confirm:true});clearSession();setMessage(result.reconciled?'Synthetic organiser data deleted. Automatic sign-in cannot recreate it.':'Accessible organiser data deleted and processing stopped. Operator reconciliation is pending; backup restoration remains blocked.');})}>Confirm deletion</button><button onClick={()=>setDeleting(false)}>Cancel deletion</button></section>}
  </section>
  <LibraryScreen key={csrf} remote={{state,save,begin:()=>{pending.current.begin(state.revision);},cancel:()=>{pending.current.cancel();}}}/>
 </>;
}

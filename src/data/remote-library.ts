import type { Library, TagEdit } from '../domain/library.ts';
export type LibraryState={library:Library;revision:string};
export class ApiError extends Error {status:number;constructor(status:number,message:string){super(message);this.status=status;}}
export async function request<T>(path:string,csrf:string,body?:unknown):Promise<T>{
 if(body!==undefined&&'onLine' in navigator&&navigator.onLine===false)throw new ApiError(0,'You are offline. Your draft is kept; reconnect before saving.');
 let response:Response;try{response=await fetch('/api/'+path,{method:body===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',headers:body===undefined?{}:{'Content-Type':'application/json','X-CSRF-Token':csrf},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(12000)});}catch{throw new ApiError(0,'Connection interrupted. Your draft is kept. Retry to confirm the same save.');}
 const data:unknown=await response.json();if(!response.ok)throw new ApiError(response.status,data!==null&&typeof data==='object'&&'error' in data&&typeof data.error==='string'?data.error:'Request failed');return data as T;
}
export type RemoteLibrary={state:LibraryState;begin:()=>void;save:(edit:TagEdit,reapply:boolean)=>Promise<void>;cancel:()=>void};

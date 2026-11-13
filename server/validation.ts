import { createHash } from 'node:crypto';
export class Fault extends Error { status:number; constructor(status:number,message:string){super(message);this.status=status;} }
export function requireValue(value:unknown,message='Invalid input'): asserts value {if(!value)throw new Fault(422,message);}
export function record(value:unknown,keys:readonly string[]): Record<string,unknown> {requireValue(value && typeof value==='object' && !Array.isArray(value));const r=value as Record<string,unknown>;requireValue(Object.keys(r).every(k=>keys.includes(k)));return r;}
export function text(value:unknown,max=256):string {requireValue(typeof value==='string'&&value.length>0&&value.length<=max&&!Array.from(value).some(c=>c.charCodeAt(0)<32));return value;}
export function uuid(value:unknown):string {const s=text(value,36);requireValue(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s));return s;}
export function revision(value:unknown):string {requireValue(typeof value==='string'&&/^(0|[1-9]\d{0,17})$/.test(value));return value;}
export function array(value:unknown,max:number):unknown[]{requireValue(Array.isArray(value)&&value.length<=max);return value;}
export function distinct(values:readonly string[]){requireValue(new Set(values).size===values.length,'Duplicate identities');}
export function key(value:unknown): {kind:'playlist'|'album';id:string} {const s=text(value,140);const [kind,...parts]=s.split(':');requireValue(kind==='playlist'||kind==='album');const id=text(parts.join(':'),128);requireValue(/^[a-zA-Z0-9_-]+$/.test(id));return {kind,id};}
function canonical(value:unknown):unknown {if(Array.isArray(value))return value.map(canonical);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b,'en')).map(([k,v])=>[k,canonical(v)]));return value;}
export function digest(value:unknown):string{return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');}

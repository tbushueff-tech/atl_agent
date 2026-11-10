import { readDemoDsaPrivateKey } from './private-key.js';
import { makePropertyModel, serializeForSignature, serializeFinal } from './properties.js';
const {p:P,q:Q,g:G,x:X}=readDemoDsaPrivateKey();
const enc=new TextEncoder();
const bigint=bytes=>bytes.reduce((v,b)=>v*256n+BigInt(b),0n);
function toBytes(value){let hex=value.toString(16);if(hex.length%2)hex='0'+hex;return Uint8Array.from(hex.match(/../g)||[],x=>parseInt(x,16));}
function powmod(a,n,m){let r=1n;for(a%=m;n>0n;n>>=1n,a=a*a%m)if(n&1n)r=r*a%m;return r;}
function integer(n){let b=toBytes(n);if(b[0]&128)b=Uint8Array.of(0,...b);return Uint8Array.of(2,b.length,...b);}
async function sign(message){
  const hash=bigint(new Uint8Array(await crypto.subtle.digest('SHA-1',message)));
  for(;;){const random=crypto.getRandomValues(new Uint8Array(20));const k=bigint(random);if(!k||k>=Q)continue;
    const r=powmod(G,k,P)%Q;if(!r)continue;
    const s=powmod(k,Q-2n,Q)*(hash+X*r)%Q;if(!s)continue;
    const a=integer(r),b=integer(s);return Uint8Array.of(0x30,a.length+b.length,...a,...b);
  }
}
function concat(...items){const out=new Uint8Array(items.reduce((n,a)=>n+a.length,0));let n=0;for(const x of items){out.set(x,n);n+=x.length;}return out;}
function base64(bytes){let t='';for(let i=0;i<bytes.length;i+=8192)t+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(t);}
async function compress(bytes){if(typeof CompressionStream!=='function')throw Error('Браузер не поддерживает CompressionStream');const stream=new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'));return new Uint8Array(await new Response(stream).arrayBuffer());}
export async function generateDemoKey(fields){
  const {data,header}=makePropertyModel(fields);
  const source=serializeForSignature(data);
  data.set('licenseHash',base64(await sign(enc.encode(source))));
  const properties=serializeFinal(header,data);
  const payload=concat(Uint8Array.of(13,14,12,10,15),await compress(enc.encode(properties)));
  const length=new Uint8Array(4);new DataView(length.buffer).setUint32(0,payload.length,false);
  const encoded=base64(concat(length,payload,await sign(payload)));
  const full=encoded+'X02'+encoded.length.toString(31);
  return {key:[...full].map((x,i)=>x+(i>0&&i%76===0?'\n':'')).join(''),properties,format:'Standalone demonstration container (own DSA key; not an Atlassian license)'};
}

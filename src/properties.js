function clean(value) { return String(value ?? '').replace(/[\r\n]/g, ' ').trim(); }
function localDate(d) { const two=x=>String(x).padStart(2,'0'); return `${d.getFullYear()}-${two(d.getMonth()+1)}-${two(d.getDate())}`; }
function javaDate(d) {
  const weekday=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const month=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const two=x=>String(x).padStart(2,'0');
  const tz=new Intl.DateTimeFormat('en-US',{timeZoneName:'short'}).formatToParts(d).find(p=>p.type==='timeZoneName')?.value||'GMT';
  return `${weekday[d.getDay()]} ${month[d.getMonth()]} ${two(d.getDate())} ${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())} ${tz} ${d.getFullYear()}`;
}
function escapeProperty(value,key=false) {
  return [...String(value)].map((c,i)=>{
    if(c==='\t')return '\\t';if(c==='\n')return '\\n';if(c==='\r')return '\\r';if(c==='\f')return '\\f';if(c==='\\')return '\\\\';
    if(c===' ' && (key||i===0))return '\\ ';
    return '=:#!'.includes(c)?'\\'+c:c;
  }).join('');
}
function hashCode(text){let h=0;for(let i=0;i<text.length;i++)h=(Math.imul(h,31)+text.charCodeAt(i))|0;return (h^(h>>>16))>>>0;}
function javaHashMapOrder(data){
  let buckets=Array.from({length:32},()=>[]),n=0;
  for(const [key,value] of data){
    const hash=hashCode(key),i=hash&(buckets.length-1);
    buckets[i].push({key,value,hash});n++;
    if(n>buckets.length*.75){const next=Array.from({length:buckets.length*2},()=>[]);for(const b of buckets)for(const e of b)next[e.hash&(next.length-1)].push(e);buckets=next;}
  }
  return buckets.flat().map(({key,value})=>[key,value]);
}
export function makePropertyModel({serverId,organisation,email,product,name,datacenter=false,now=new Date()}){
  if(!serverId?.trim()||!organisation?.trim()||!email?.trim()||!product?.trim())throw new Error('Заполните обязательные поля');
  if(!/^[\w.-]{1,120}$/.test(product))throw new Error('Product: буквы, цифры, точка, дефис и подчёркивание');
  const date=new Date(now);if(Number.isNaN(date.getTime()))throw new Error('Неправильная дата');
  const data=new Map();
  data.set('Description','License for '+clean(organisation));
  data.set('ServerID',clean(serverId));
  data.set('Organisation',clean(organisation));
  data.set('ContactEMail',clean(email));
  data.set('ContactName',clean(name)||clean(email));
  data.set('CreationDate',localDate(date));
  data.set('PurchaseDate',localDate(date));
  data.set('Evaluation','true');
  data.set('LicenseTypeName','DEMONSTRATION');
  data.set('NumberOfUsers','5');
  data.set('keyVersion','demo-1');
  data.set(product+'.active','false');
  if(datacenter)data.set(product+'.DataCenter','true');
  return {data,header:'#'+javaDate(date)};
}
export function serializeForSignature(data){return [...data].filter(([k,v])=>k!=='licenseHash'&&v!=null).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>`${escapeProperty(k,true)}=${escapeProperty(v,false)}\n`).join('');}
export function serializeFinal(header,data){return header+'\n'+javaHashMapOrder(data).filter(([,v])=>v!=null).map(([k,v])=>`${k}=${v}`).join('\n');}

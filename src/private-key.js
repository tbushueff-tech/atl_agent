// Public demonstration key, independently generated for this project.
// Never use embedded private keys to secure production data.
export const PRIVATE_KEY_STR = 'MIIBSgIBADCCASsGByqGSM44BAEwggEeAoGBAKepAfv8FbzcAK1oJr3GAhxc3O3gpWVhiqJT5gA2Ulr7NThNLnejKKDl4DmVv7AUx7baq+rOcrIDAG4YE0t9qA2zgLnKqJ8y/tKa6ofNVurIf5y4bIS18ewe9+BXwpP6yDY6dmZwfROgLLeNhvsbCeXKHfjIPXILjckHzRq4Qyn/AhUA9iOCvE88QgdemiNCspD+GRlyUK0CgYBKPyIKT5dJdtWMejOqo4RGc/53lwvYpiEC7uhrbRZeDzUfy5fi6V44yWiYLGSJlacF7Evd3CFmEjIXPV2xxRTJgKA1xTLBrNuz6qfiPNE0AaWSK4oiJCscIAp4Axx9a9LYDzvCJ8h5JwU45u3XpoIDhhz3PIdkojNsgg7eiKbTlAQWAhQl9eiNg9CyQzVpUHKUPypKYwan9w==';

export function readDemoDsaPrivateKey(base64=PRIVATE_KEY_STR) {
  const bytes = Uint8Array.from(atob(base64), x=>x.charCodeAt(0));
  function tlv(start, tag) {
    if (bytes[start++]!==tag) throw new Error('Invalid DSA PKCS8 tag');
    let length=bytes[start++];
    if (length&0x80) {
      const n=length&0x7f;length=0;
      if(!n||n>3) throw new Error('Invalid DER length');
      for(let i=0;i<n;i++) length=length*256+bytes[start++];
    }
    if (start+length>bytes.length) throw new Error('Truncated DER');
    return {start,end:start+length};
  }
  function integer(pos){const item=tlv(pos,2);let value=0n;for(let i=item.start;i<item.end;i++)value=value*256n+BigInt(bytes[i]);return {value,next:item.end};}
  const outer=tlv(0,0x30),version=integer(outer.start),algorithm=tlv(version.next,0x30),oid=tlv(algorithm.start,6),pseq=tlv(oid.end,0x30),p=integer(pseq.start),q=integer(p.next),g=integer(q.next),octets=tlv(algorithm.end,4),x=integer(octets.start);
  if(outer.end!==bytes.length||version.value!==0n||g.next!==pseq.end||x.next!==octets.end)throw new Error('Invalid DSA PKCS8');
  return {p:p.value,q:q.value,g:g.value,x:x.value};
}

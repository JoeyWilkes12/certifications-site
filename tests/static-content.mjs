import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url);
const html=await readFile(new URL('index.html',root),'utf8');
const learning=JSON.parse(await readFile(new URL('data/linkedin-learning.json',root),'utf8'));
const badges=JSON.parse(await readFile(new URL('data/badges.json',root),'utf8'));
const primary=JSON.parse(await readFile(new URL('data/credentials.json',root),'utf8'));
assert.equal(learning.certificates.length,19);assert.equal(badges.badges.length,17);assert.equal(primary.credentials.length,17);
assert.equal(new Set(learning.certificates.map(c=>c.id)).size,19);
const embedded=id=>JSON.parse(html.match(new RegExp(`<script[^>]*id="${id}"[^>]*>([\\s\\S]*?)</script>`))[1]);
assert.deepEqual(embedded('linkedin-data'),learning);assert.deepEqual(embedded('badge-data'),badges);assert.deepEqual(embedded('credential-data'),primary);
assert.equal((html.match(/class="badge-row(?: learning-certificate-row)?"/g)||[]).length,36);
const targets={'introduction-to-vertex-forecasting-and-time-series-in-practice':4.5,'vector-search-and-embeddings':4};
assert.deepEqual(Object.fromEntries(badges.badges.filter(b=>b.personalRating!==undefined).map(b=>[b.id,b.personalRating])),targets);
for(const certificate of learning.certificates){
 const bytes=await readFile(new URL(certificate.certificatePath,root));
 assert.equal(bytes.subarray(0,5).toString(),'%PDF-',certificate.id);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),certificate.sourceSha256,`Original PDF changed: ${certificate.id}`);
 for(const field of ['recipient','certificateId','earnedOn'])assert.ok(certificate[field],`${certificate.id}: missing ${field}`);
 assert.ok(['www.linkedin.com','business.linkedin.com'].includes(new URL(certificate.courseUrl).hostname));
 assert.ok(certificate.documentation.overview);
 assert.ok(!primary.credentials.some(c=>c.id===certificate.id),'Course certificate entered primary reel');
}
const schemas=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));
const list=schemas.find(s=>s['@type']==='ItemList');assert.equal(list.numberOfItems,36);assert.equal(list.itemListElement.length,36);assert.equal(list.itemListElement[0].item.name,'Decision Intelligence');
assert.ok(!html.includes('aggregateRating'));assert.ok(!html.includes('http://localhost'));
console.log('PASS: 19 original PDF hashes, 36 prerendered records, exact personal ratings, matching embedded/public JSON, separate primary reel and structured metadata.');

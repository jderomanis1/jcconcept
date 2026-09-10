// Snapshot guard for this photo/copy-only release. Update deliberately for future design changes.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(ROOT, name));
const html = read('index.html').toString('utf8');
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

test('photo/copy release preserves design, customer actions and Color Studio bytes', () => {
  const expected = JSON.parse(read('docs/design-preservation.json'));
  for (const [file, hash] of Object.entries(expected)) assert.equal(digest(read(file)), hash, file);
});
test('three genuine project photos match recorded clarity-only derivatives', () => {
  const records = JSON.parse(read('docs/project-photo-sources.json'));
  assert.equal(records.length, 3);
  for (const item of records) {
    const bytes = read('assets/projects/' + item.asset);
    assert.equal(digest(bytes), item.output_sha256, item.asset);
    assert.equal(item.synthetic_changes, false);
    assert.deepEqual(item.output_size, [800, 600]);
    assert.equal(bytes.subarray(4,8).toString(), 'ftyp');
    assert.ok(bytes.subarray(8,32).toString().includes('avif'));
    assert.ok(!bytes.includes(Buffer.from('Exif')), 'No EXIF in ' + item.asset);
  }
});
test('garage example is licensed and visibly distinguished from Justin’s work', () => {
  const item = JSON.parse(read('docs/garage-photo-source.json'));
  assert.equal(digest(read('assets/projects/garage-example.webp')), item.output_sha256);
  assert.equal(item.author, 'KK Buys Indy Homes');
  assert.equal(item.license, 'Unsplash License');
  assert.match(html, /Garage example · Not a Cimo project/);
  assert.match(html, /garage photo is an illustrative example, not a Cimo project/);
});
test('four service cards reference the reviewed, local service images', () => {
  const section = html.match(/<section[^>]*id="services"[\s\S]*?<\/section>/)[0];
  for (const name of ['interior-finish.avif', 'surface-prep-detail.avif', 'workshop-prep.avif', 'garage-example.webp']) {
    assert.ok(section.includes('assets/projects/' + name), name);
  }
  assert.equal((section.match(/class="service-card"/g) || []).length, 4);
  assert.match(section, /Workshop metalwork prep/);
  assert.match(section, /Masking &amp; surface repairs/);
});
test('local copy and the verified public contact destinations stay consistent', () => {
  assert.match(html, /House Painting in Rochester, NY/);
  assert.match(html, /One room or several/);
  assert.match(html, /town or ZIP code/);
  assert.match(html, /Sending a request does not book a painting date/);
  assert.match(html, /mailto:cimohomerefreshments@gmail\.com/);
  assert.match(html, /tel:\+15858809905/);
  assert.match(html, /Nothing is sent automatically/);
  assert.doesNotMatch(html, /scoped separately|targeted refresh|585.?305.?4365/i);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { buildMail, createApp, normalize } from '../src.js';

const env = {
  GMAIL_USER: 'sender@example.test',
  GMAIL_APP_PASSWORD: 'test-only-password',
  LEAD_EMAIL_TO: 'jcimo47@gmail.com',
  ALLOWED_ORIGINS: 'https://jderomanis1.github.io'
};
const valid = {
  name: 'Jane Smith',
  phone: '585-555-1234',
  email: 'jane@example.com',
  service: 'Interior Painting',
  description: 'Living room and hallway',
  lead_source: 'Website Estimate'
};

function setup(extra = {}) {
  const sent = [];
  const transporter = {
    sendMail: async (mail) => {
      if (extra.smtpFail) throw Error('smtp');
      sent.push(mail);
    }
  };
  return { app: createApp({ env: { ...env, ...extra.env }, transporter }), sent };
}

test('normalizes only supported lead fields', () => {
  const lead = normalize({ ...valid, ignored: 'nope' });
  assert.equal(lead.name, valid.name);
  assert.equal(lead.description, valid.description);
  assert.equal(lead.ignored, undefined);
});

test('valid lead with email sends to server-controlled recipient and uses Reply-To', async () => {
  const { app, sent } = setup();
  await request(app).post('/api/contact').set('Origin', env.ALLOWED_ORIGINS).field(valid).expect(202);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, 'jcimo47@gmail.com');
  assert.equal(sent[0].replyTo, valid.email);
  assert.equal(sent[0].subject, 'New Cimo Estimate — Interior Painting — Jane Smith');
  assert.doesNotMatch(sent[0].text, /GMAIL_APP_PASSWORD|test-only-password/i);
});

test('email is optional and Reply-To is omitted when blank', async () => {
  const { app, sent } = setup();
  await request(app).post('/api/contact').field({ ...valid, email: '' }).expect(202);
  assert.equal(sent.length, 1);
  assert.equal('replyTo' in sent[0], false);
});

test('invalid email is rejected when supplied', async () => {
  const { app } = setup();
  await request(app).post('/api/contact').field({ ...valid, email: 'bad' }).expect(400);
});

test('invalid phone is rejected', async () => {
  const { app } = setup();
  await request(app).post('/api/contact').field({ ...valid, phone: 'asdf' }).expect(400);
});

test('missing required name, phone, or service is rejected', async () => {
  const { app } = setup();
  await request(app).post('/api/contact').field({ ...valid, name: '' }).expect(400);
  await request(app).post('/api/contact').field({ ...valid, phone: '' }).expect(400);
  await request(app).post('/api/contact').field({ ...valid, service: '' }).expect(400);
});

test('unsupported service value is rejected', async () => {
  const { app } = setup();
  await request(app).post('/api/contact').field({ ...valid, service: 'Roofing' }).expect(400);
});

test('honeypot returns success without sending an email', async () => {
  const { app, sent } = setup();
  await request(app).post('/api/contact').field({ ...valid, website: 'bot-value' }).expect(202);
  assert.equal(sent.length, 0);
});

test('one color preview is accepted and attached with a fixed safe filename', async () => {
  const { app, sent } = setup();
  await request(app).post('/api/contact').field(valid)
    .attach('preview', Buffer.from([0xff, 0xd8, 0xff]), { filename: 'user-name.jpg', contentType: 'image/jpeg' })
    .expect(202);
  assert.equal(sent[0].attachments.length, 1);
  assert.equal(sent[0].attachments[0].filename, 'cimo-color-preview.jpg');
});

test('invalid MIME and oversized preview are rejected', async () => {
  const { app } = setup();
  await request(app).post('/api/contact').field(valid)
    .attach('preview', Buffer.from('x'), { filename: 'x.txt', contentType: 'text/plain' })
    .expect(400);
  await request(app).post('/api/contact').field(valid)
    .attach('preview', Buffer.alloc(5 * 1024 * 1024 + 1), { filename: 'x.jpg', contentType: 'image/jpeg' })
    .expect(400);
});

test('a second preview file is rejected', async () => {
  const { app } = setup();
  await request(app).post('/api/contact').field(valid)
    .attach('preview', Buffer.from('a'), { filename: 'a.jpg', contentType: 'image/jpeg' })
    .attach('preview', Buffer.from('b'), { filename: 'b.jpg', contentType: 'image/jpeg' })
    .expect(400);
});

test('blocked CORS origin is rejected', async () => {
  const { app } = setup();
  await request(app).post('/api/contact').set('Origin', 'https://evil.test').field(valid).expect(403);
});

test('SMTP failure returns a generic error', async () => {
  const { app } = setup({ smtpFail: true });
  const response = await request(app).post('/api/contact').field(valid).expect(502);
  assert.deepEqual(response.body, { error: 'Unable to send request' });
});

test('missing server mail configuration fails closed', async () => {
  const { app } = setup({ env: { GMAIL_APP_PASSWORD: '' } });
  await request(app).post('/api/contact').field(valid).expect(503);
});

test('rate limit rejects excess requests', async () => {
  const { app } = setup({ env: { RATE_LIMIT: '1' } });
  await request(app).post('/api/contact').field(valid).expect(202);
  await request(app).post('/api/contact').field(valid).expect(429);
});

test('buildMail escapes submitted HTML', () => {
  const mail = buildMail({ ...normalize(valid), name: '<script>alert(1)</script>' }, null, env);
  assert.doesNotMatch(mail.html, /<script>/);
  assert.match(mail.html, /&lt;script&gt;/);
});

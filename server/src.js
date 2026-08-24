import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import nodemailer from 'nodemailer';
import { fileURLToPath } from 'node:url';

const LIMITS = {
  name: 100,
  phone: 30,
  email: 254,
  service: 60,
  description: 1000,
  selected_color: 100,
  surface_description: 200,
  lead_source: 80
};

const SERVICES = new Set([
  'Interior Painting',
  'Exterior Painting',
  'Garage Painting',
  'Small Business Painting',
  'Cleaning',
  'Other'
]);
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const clean = (value) => String(value ?? '').trim();
const escapeHtml = (value) => clean(value).replace(/[&<>'"]/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
}[char]));

export function normalize(body = {}) {
  const lead = {};
  for (const [key, max] of Object.entries(LIMITS)) lead[key] = clean(body[key]).slice(0, max);
  return lead;
}

function tooLong(body) {
  return Object.entries(LIMITS).some(([key, max]) => clean(body[key]).length > max);
}

function validate(lead) {
  if (!lead.name || !lead.phone || !lead.service) return false;
  if (!SERVICES.has(lead.service)) return false;
  if (lead.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) return false;
  if (!/^[+()\d .-]{7,30}$/.test(lead.phone)) return false;
  if (lead.phone.replace(/\D/g, '').length < 7) return false;
  return true;
}

export function buildMail(lead, file, env) {
  const rows = [
    ['CUSTOMER', lead.name], ['PHONE', lead.phone], ['EMAIL', lead.email], ['PROJECT TYPE', lead.service],
    ['PROJECT DETAILS', lead.description], ['LEAD SOURCE', lead.lead_source], ['SELECTED COLOR', lead.selected_color],
    ['SURFACE DESCRIPTION', lead.surface_description]
  ].filter(([, value]) => value);

  const text = rows.map(([label, value]) => `${label}\n${value}`).join('\n\n') +
    (file ? '\n\nCOLOR STUDIO PREVIEW\nAttached as cimo-color-preview.jpg' : '');
  const htmlRows = rows.map(([label, value]) => {
    const phoneStyle = label === 'PHONE' ? 'font-size:22px;font-weight:700;' : 'font-size:17px;';
    return `<div style="border-bottom:1px solid #ddd;padding:12px 0"><b style="font-size:11px;letter-spacing:.08em;color:#913b33">${label}</b><div style="${phoneStyle}margin-top:4px;overflow-wrap:anywhere">${escapeHtml(value)}</div></div>`;
  }).join('');

  const mail = {
    from: `Cimo Website Leads <${env.GMAIL_USER}>`,
    to: env.LEAD_EMAIL_TO,
    subject: `New Cimo Estimate — ${lead.service} — ${lead.name}`,
    text,
    html: `<!doctype html><html><body style="margin:0;background:#eee9e1;font-family:Arial,sans-serif;color:#211f1c"><div style="max-width:600px;margin:auto;background:#fff"><div style="background:#201f1d;color:#fff;padding:22px"><b style="color:#dc655b">NEW CIMO ESTIMATE</b><h1 style="font-size:22px;margin:8px 0 0">${escapeHtml(lead.service)} — ${escapeHtml(lead.name)}</h1></div><div style="padding:22px">${htmlRows}${file ? '<div style="padding:14px 0"><b>COLOR STUDIO PREVIEW</b><br>Attached as cimo-color-preview.jpg</div>' : ''}</div></div></body></html>`,
    attachments: file ? [{ filename: 'cimo-color-preview.jpg', content: file.buffer, contentType: file.mimetype }] : []
  };
  if (lead.email) mail.replyTo = lead.email;
  return mail;
}

export function createApp({ env = process.env, transporter } = {}) {
  const app = express();
  app.set('trust proxy', 1);
  const origins = clean(env.ALLOWED_ORIGINS).split(',').map((value) => value.trim()).filter(Boolean);
  app.use(cors({
    origin(origin, callback) {
      if (!origin || origins.includes(origin)) return callback(null, true);
      return callback(new Error('origin'));
    },
    methods: ['POST', 'OPTIONS']
  }));
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: Number(env.RATE_LIMIT || 10), standardHeaders: true, legacyHeaders: false }));
  app.get('/health', (_request, response) => response.json({ ok: true }));

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 16, fieldSize: 12000 },
    fileFilter(_request, file, callback) {
      ALLOWED_TYPES.has(file.mimetype) ? callback(null, true) : callback(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'preview'));
    }
  }).single('preview');

  app.post('/api/contact', (request, response) => upload(request, response, async (uploadError) => {
    if (uploadError) return response.status(400).json({ error: 'Invalid request' });
    try {
      if (clean(request.body.website)) return response.status(202).json({ ok: true });
      if (tooLong(request.body)) return response.status(400).json({ error: 'Please check the required fields' });
      const lead = normalize(request.body);
      if (!validate(lead)) return response.status(400).json({ error: 'Please check the required fields' });
      if (!clean(env.GMAIL_USER) || !clean(env.GMAIL_APP_PASSWORD) || !clean(env.LEAD_EMAIL_TO)) {
        return response.status(503).json({ error: 'Unable to send request' });
      }
      const mailer = transporter || nodemailer.createTransport({ service: 'gmail', auth: { user: env.GMAIL_USER, pass: env.GMAIL_APP_PASSWORD } });
      await mailer.sendMail(buildMail(lead, request.file, env));
      return response.status(202).json({ ok: true });
    } catch {
      console.error('Lead email delivery failed');
      return response.status(502).json({ error: 'Unable to send request' });
    }
  }));

  app.use((error, _request, response, _next) => response.status(error.message === 'origin' ? 403 : 400).json({ error: 'Invalid request' }));
  return app;
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const port = process.env.PORT || 3000;
  createApp().listen(port, '0.0.0.0', () => console.log(`Cimo Lead API listening on ${port}`));
}

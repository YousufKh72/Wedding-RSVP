import 'dotenv/config';
import express from 'express';
import path from 'path';
import sqlite3 from 'sqlite3';
import fs from 'fs';

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/public', express.static('public'));

const db = new sqlite3.Database(path.resolve('db', 'rsvp.db'));

function render(view, vars = {}) {
  const layout = fs.readFileSync(path.resolve('views', 'layout.html'), 'utf8');
  const body = fs.readFileSync(path.resolve('views', view + '.html'), 'utf8');
  const html = layout.replace('<!--BODY-->', interpolate(body, vars));
  return interpolate(html, vars);
}

function interpolate(tpl, vars) {
  return tpl.replace(/{{\s*(\w+)\s*}}/g, (_, k) => (vars[k] ?? ''));
}

const {
  PORT = 3000,
  BASE_URL = 'http://localhost:3000',
  EVENT_TITLE,
  EVENT_DESCRIPTION,
  EVENT_START,
  EVENT_END,
  EVENT_TIMEZONE,
  VENUE_NAME,
  VENUE_ADDRESS,
  VENUE_MAPS_QUERY,
  ORGANIZER_NAME,
  ORGANIZER_EMAIL
} = process.env;

app.get('/v', (req, res) => {
  const { t } = req.query;
  res.send(render('video', { token: t, event_title: EVENT_TITLE }));
});

app.get('/invite/:token', (req, res) => {
  const { token } = req.params;
  db.get('SELECT * FROM guests WHERE token = ?', [token], (err, row) => {
    if (err || !row) return res.status(404).send(render('notfound', { event_title: EVENT_TITLE }));
    res.send(render('invite', {
      family_label: row.family_label,
      party_size: row.party_size,
      token,
      event_title: EVENT_TITLE,
      venue_name: VENUE_NAME,
      venue_address: VENUE_ADDRESS,
      maps_q: encodeURIComponent(VENUE_MAPS_QUERY || VENUE_ADDRESS)
    }));
  });
});

app.post('/api/rsvp/:token', (req, res) => {
  const { token } = req.params;
  const { status, count, notes } = req.body;
  const valid = ['yes', 'no', 'maybe'];
  if (!valid.includes(status)) return res.status(400).json({ ok: false, error: 'Invalid status' });
  const c = Math.max(0, Math.min(20, Number(count || 0)));
  db.run(
    `UPDATE guests SET rsvp_status=?, rsvp_count=?, rsvp_notes=?, responded_at=datetime('now') WHERE token=?`,
    [status, c, notes || '', token],
    function (e) {
      if (e || this.changes === 0) return res.status(404).json({ ok: false });
      return res.json({ ok: true, redirect: `/thankyou/${token}` });
    }
  );
});

app.get('/thankyou/:token', (req, res) => {
  const { token } = req.params;
  db.get('SELECT * FROM guests WHERE token=?', [token], (err, row) => {
    if (err || !row) return res.status(404).send(render('notfound', { event_title: EVENT_TITLE }));
    res.send(render('thankyou', {
      token,
      event_title: EVENT_TITLE,
      venue_name: VENUE_NAME,
      venue_address: VENUE_ADDRESS,
      maps_q: encodeURIComponent(VENUE_MAPS_QUERY || VENUE_ADDRESS)
    }));
  });
});

app.get('/calendar/:token.ics', (req, res) => {
  const { token } = req.params;
  db.get('SELECT * FROM guests WHERE token=?', [token], (err, row) => {
    if (err || !row) return res.status(404).send('Not found');
    const ics = buildICS({
      uid: `rsvp-${token}@${new URL(BASE_URL).hostname}`,
      title: EVENT_TITLE,
      description: EVENT_DESCRIPTION,
      start: EVENT_START,
      end: EVENT_END,
      location: `${VENUE_NAME}, ${VENUE_ADDRESS}`,
      organizer: `MAILTO:${ORGANIZER_EMAIL}`
    });
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${slug(EVENT_TITLE)}.ics"`);
    res.send(ics);
  });
});

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function toICSDate(dt) {
  const d = new Date(dt);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

function escapeICS(text) {
  return String(text || '')
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/, /g, ",")
    .replace(/;/g, "\\;");
}

function buildICS({ uid, title, description, start, end, location, organizer }) {
  const dtStart = toICSDate(start);
  const dtEnd = toICSDate(end);
  const now = toICSDate(new Date().toISOString());
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Digital RSVP//EN',
    EVENT_TIMEZONE ? `X-WR-TIMEZONE:${escapeICS(EVENT_TIMEZONE)}` : null,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeICS(title)}`,
    `DESCRIPTION:${escapeICS(description)}`,
    `LOCATION:${escapeICS(location)}`,
    `ORGANIZER;CN=${escapeICS(ORGANIZER_NAME)}:${organizer}`,
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    'DESCRIPTION:Event reminder',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(Boolean).join('\r\n');
}

app.get('/', (req, res) => {
  res.redirect('/v');
});

app.listen(PORT, () => {
  console.log(`RSVP server on http://localhost:${PORT}`);
});

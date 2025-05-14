const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');
const router = express.Router();
const db = new Database('./database/q8.db');
const SECRET = 'superhemmelignøgle123';
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');


// Middleware til at beskytte sider
function requireAuth(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.redirect('/pages/login.html');

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.redirect('/pages/login.html');
  }
}

// --- Login route ---
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  const stmt = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?');
  const user = stmt.get(username, password);

  if (user) {
    const token = jwt.sign({ id: user.id, username: user.username }, SECRET, { expiresIn: '2h' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      maxAge: 2 * 60 * 60 * 1000
    });

    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});

// --- Beskyttet side (dashboard) ---
router.get('/pages/index.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'client/pages/index.html'));
});

router.get('/pages/arkiv.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'client/pages/arkiv.html'));
});

// --- Reklamation (beskyttet) ---
router.get('/pages/reklamation.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'client/pages/reklamation.html'));
});

// --- Login-side (åben) ---
router.get('/', (req, res) => {
  res.redirect('/pages/login.html');
});

router.get('/me', (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.json({ username: null });

  try {
    const decoded = jwt.verify(token, SECRET);
    res.json({ username: decoded.username });
  } catch (err) {
    res.json({ username: null });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/');
});

router.post('/soeg-kvittering', requireAuth, (req, res) => {
  const { type, year, keyword, timeFrom, timeTo, dateFrom, dateTo, reportType } = req.body;
  if (type === 'rapport') {
    // Søg i rapporter
    let query = `
          SELECT * FROM rapporter WHERE 1=1
        `;
    const params = [];

    if (reportType) {
      query += " AND type = ?";
      params.push(reportType);
    }

    if (year) {
      query += " AND strftime('%Y', dato) = ?";
      params.push(year);
    }

    if (dateFrom && dateTo) {
      query += " AND date(dato) BETWEEN date(?) AND date(?)";
      params.push(dateFrom, dateTo);
    }

    if (keyword) {
      query += " AND (titel LIKE ? OR indhold LIKE ?)";
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    if (timeFrom && timeTo) {
      if (timeFrom < timeTo) {
        query += " AND time(tidspunkt) BETWEEN time(?) AND time(?)";
        params.push(timeFrom, timeTo);
      } else {
        query += " AND (time(tidspunkt) >= time(?) OR time(tidspunkt) <= time(?))";
        params.push(timeFrom, timeTo);
      }
    }

    query += " ORDER BY dato DESC, tidspunkt DESC";

    const rows = db.prepare(query).all(...params);

    if (rows.length === 0) {
      return res.json({ found: false });
    }

    return res.json({ found: true, rapporter: rows });
  }



  let query = `
      SELECT k.id, k.dato, k.tidspunkt, k.total_beløb, k.kvitteringsnummer, kv.vare, kv.pris
      FROM kvitteringer k
      JOIN kvittering_varer kv ON k.id = kv.kvittering_id
      WHERE 1=1
    `;
  const params = [];

  if (year) {
    query += " AND strftime('%Y', k.dato) = ?";
    params.push(year);
  }

  if (keyword) {
    query += " AND (kv.vare LIKE ? OR k.kvitteringsnummer LIKE ?)";
    params.push(`%${keyword}%`, `%${keyword}%`);
  }

  if (timeFrom && timeTo) {
    if (timeFrom < timeTo) {
      // Normalt tidsrum (fx 08:00 til 16:00)
      query += " AND time(k.tidspunkt) BETWEEN time(?) AND time(?)";
      params.push(timeFrom, timeTo);
    } else {
      // Over-midnat tidsrum (fx 23:45 til 06:00)
      query += " AND (time(k.tidspunkt) >= time(?) OR time(k.tidspunkt) <= time(?))";
      params.push(timeFrom, timeTo);
    }
  }

  if (dateFrom && dateTo) {
    query += " AND date(k.dato) BETWEEN date(?) AND date(?)";
    params.push(dateFrom, dateTo);
  }

  query += " ORDER BY k.dato DESC";

  const rows = db.prepare(query).all(...params);

  if (rows.length === 0) {
    return res.json({ found: false });
  }
  const kvitMap = new Map();

  rows.forEach(row => {
    if (!kvitMap.has(row.id)) {
      kvitMap.set(row.id, {
        id: row.id,
        dato: row.dato,
        tidspunkt: row.tidspunkt,
        total: row.total_beløb,
        nummer: row.kvitteringsnummer,
        varer: []
      });
    }
    kvitMap.get(row.id).varer.push({ vare: row.vare, pris: row.pris });
  });

  const kvitteringer = Array.from(kvitMap.values());

  res.json({ found: true, kvitteringer });
  console.log(rows)
});


router.post('/send-kvittering-mail', requireAuth, async (req, res) => {
  const { kvittering, email } = req.body;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'hartmannkristoffer39@gmail.com',
      pass: 'qqwfqptknpyfmybn'
    }
  });

  const htmlIndhold = `
      <h3>Kvittering #${kvittering.nummer}</h3>
      <p>Dato: ${kvittering.dato} kl: ${kvittering.tidspunkt}</p>
      <ul>
        ${kvittering.varer.map(v => `<li>${v.vare}: ${v.pris.toFixed(2)} kr</li>`).join('')}
      </ul>
      <p><strong>Total:</strong> ${kvittering.total.toFixed(2)} kr</p>
    `;

  try {
    await transporter.sendMail({
      from: 'hartmannkristoffer39@gmail.com',
      to: email,
      subject: `Kvittering #${kvittering.nummer}`,
      html: htmlIndhold
    });
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

router.post('/generer-pdf', requireAuth, (req, res) => {
  const { kvittering } = req.body;
  const doc = new PDFDocument();

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=kvittering_${kvittering.nummer}.pdf`);

  doc.fontSize(16).text(`Kvittering #${kvittering.nummer}`);
  doc.text(`Dato: ${kvittering.dato} kl: ${kvittering.tidspunkt}`);
  doc.moveDown();

  kvittering.varer.forEach(v => {
    doc.text(`${v.vare}: ${v.pris.toFixed(2)} kr`);
  });

  doc.moveDown();
  doc.font('Helvetica-Bold').text(`Total: ${kvittering.total.toFixed(2)} kr`);
  doc.end();

  doc.pipe(res);
});

router.post('/download-rapport-pdf', requireAuth, (req, res) => {
  const { id } = req.body;

  const rapport = db.prepare('SELECT * FROM rapporter WHERE id = ?').get(id);
  if (!rapport) {
    return res.status(404).send('Rapport ikke fundet');
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=rapport_${id}.pdf`);

  const doc = new PDFDocument();
  doc.pipe(res);

  doc.fontSize(16).text(`Rapport: ${rapport.titel}`);
  doc.text(`Type: ${rapport.type}`);
  doc.text(`Dato: ${rapport.dato} kl: ${rapport.tidspunkt}`);
  doc.moveDown();
  doc.fontSize(12).text(rapport.indhold || 'Ingen indhold angivet.');

  doc.end();
});
module.exports = router;
import rateLimit from 'express-rate-limit';
import crypto from 'node:crypto';
import admin from 'firebase-admin';
import nodemailer from 'nodemailer';
import fs from 'fs';

// Initialize Firebase Admin (safe fallback if no key)
let firebaseInitialized = false;
try {
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountPath)
    });
    firebaseInitialized = true;
    console.log("Firebase Admin SDK initialized successfully.");
  } else {
    console.log("Firebase Service Account not found, push notifications will be mocked.");
  }
} catch (e) {
  console.log("Error initializing Firebase:", e.message);
}

// Initialize Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail', // placeholder
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Helper for generating UUIDs
function generateUUID() {
  return 'uuid-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // metres
  const p1 = lat1 * Math.PI/180;
  const p2 = lat2 * Math.PI/180;
  const dp = (lat2-lat1) * Math.PI/180;
  const dl = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(dp/2) * Math.sin(dp/2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl/2) * Math.sin(dl/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export function setupGPSAttendance(app, db, wss) {
  
  // Rate limits
  const globalLimiter = rateLimit({
    windowMs: 60 * 1000, 
    max: 100, 
    message: { error: { message: 'Too many requests, please try again later.' } }
  });
  
  const submitLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 3, 
    message: { error: { message: 'Maximum attempts reached.' } }
  });

  app.use('/api/attendance', globalLimiter);
  app.use('/api/device', globalLimiter);

  // QR Deprecation Middleware
  app.use('/api/attendance/qr-sign', (req, res) => {
    return res.status(410).json({ error: { message: 'Replaced by GPS attendance system' } });
  });

  // Start Session (Faculty)
  app.post('/api/attendance/session/start', (req, res) => {
    const { schedule_id, qr_fallback_enabled } = req.body;
    const userId = req.headers['x-user-id'];
    if (req.headers['x-user-role'] !== 'faculty') return res.status(403).json({ error: { message: 'Faculty only' } });

    const staff = db.prepare('SELECT id FROM staff WHERE user_id = ?').get(userId);
    if (!staff) return res.status(403).json({ error: { message: 'Not faculty' } });

    const schedule = db.prepare('SELECT * FROM schedules WHERE id = ? AND instructor_id = ?').get(schedule_id, staff.id);
    if (!schedule) return res.status(404).json({ error: { message: 'Schedule not found or not assigned to you' } });

    // Validate time window (mock implementation of time check for flexibility)
    // Normally we'd check if current day and time matches schedule.day and schedule.time_window

    const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(schedule.room_id);
    if (!room) return res.status(404).json({ error: { message: 'Room not found' } });
    
    // Room coordinates from env or fallback
    const anchor_lat = process.env.ANCHOR_LAT ? parseFloat(process.env.ANCHOR_LAT) : 28.6756;
    const anchor_lng = process.env.ANCHOR_LNG ? parseFloat(process.env.ANCHOR_LNG) : 77.4402;

    const sessionId = 'sess-' + generateUUID();
    const now = new Date();
    const expires = new Date(now.getTime() + 45 * 1000);
    
    let qrToken = null;
    if (qr_fallback_enabled) {
      const secret = process.env.SERVER_SECRET || 'dev_secret';
      qrToken = crypto.createHmac('sha256', secret)
        .update(`${sessionId}${anchor_lat}${anchor_lng}${now.toISOString()}`)
        .digest('hex');
    }

    db.prepare(`
      INSERT INTO attendance_sessions (id, schedule_id, faculty_id, anchor_lat, anchor_lng, opened_at, expires_at, qr_fallback_enabled, qr_token)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(sessionId, schedule_id, staff.id, anchor_lat, anchor_lng, now.toISOString(), expires.toISOString(), qr_fallback_enabled ? 1 : 0, qrToken);

    // Mock push notification
    if (firebaseInitialized) {
      // e.g., admin.messaging().send(...)
    }

    res.json({ success: true, session_id: sessionId, expires_at: expires.toISOString(), qr_token: qrToken });
  });

  // Submit Attendance (Student)
  app.post('/api/attendance/submit', submitLimiter, (req, res) => {
    const { session_id, latitude, longitude, device_fingerprint, device_token, qr_token } = req.body;
    const userId = req.headers['x-user-id'];
    if (req.headers['x-user-role'] !== 'student') return res.status(403).json({ error: { message: 'Student only' } });

    const student = db.prepare('SELECT id FROM students WHERE user_id = ?').get(userId);
    if (!student) return res.status(403).json({ error: { message: 'Not student' } });

    // Rule 1: Session validity
    const session = db.prepare("SELECT * FROM attendance_sessions WHERE id = ? AND status = 'OPEN'").get(session_id);
    if (!session) return res.status(410).json({ error: { message: 'Session closed or expired' } });
    if (new Date() > new Date(session.expires_at)) return res.status(410).json({ error: { message: 'Session expired' } });

    // QR validation if token provided
    if (qr_token) {
      if (!session.qr_fallback_enabled || qr_token !== session.qr_token) {
        return res.status(403).json({ error: { message: 'Invalid QR token' } });
      }
    }

    // Rule 2: Device binding
    const device = db.prepare('SELECT * FROM device_registry WHERE student_id = ?').get(student.id);
    if (!device) return res.status(403).json({ error: { message: 'Device not registered. Contact admin.' } });
    if (device.device_fingerprint !== device_fingerprint || device.device_token !== device_token) {
      return res.status(403).json({ error: { message: 'Unregistered device.' } });
    }

    // Rule 3: Rate limiting (Attempt count)
    const existingRes = db.prepare('SELECT attempt_count FROM attendance_responses WHERE session_id = ? AND student_id = ?').get(session_id, student.id);
    const attempt_count = existingRes ? existingRes.attempt_count + 1 : 1;
    if (attempt_count > 3) return res.status(429).json({ error: { message: 'Maximum attempts reached.' } });

    // Rule 4: Distance check
    const distance_m = getDistance(latitude, longitude, session.anchor_lat, session.anchor_lng);
    let auto_status = distance_m <= 15 ? 'PRESENT' : 'OUT_OF_RANGE';
    let flag_reason = null;

    // Rule 5: Velocity check
    const lastLoc = db.prepare('SELECT * FROM location_history WHERE student_id = ? ORDER BY recorded_at DESC LIMIT 1').get(student.id);
    if (lastLoc) {
      const distLast = getDistance(latitude, longitude, lastLoc.latitude, lastLoc.longitude);
      const timeElapsed = (new Date().getTime() - new Date(lastLoc.recorded_at).getTime()) / 1000;
      if (timeElapsed > 0 && timeElapsed < 300 && distLast > 1000) {
        const speed = distLast / timeElapsed;
        if (speed > 8) {
          auto_status = 'FLAGGED';
          flag_reason = 'velocity_anomaly';
        }
      }
    }

    // Rule 7: Insert location history
    db.prepare('INSERT INTO location_history (id, student_id, latitude, longitude, recorded_at) VALUES (?, ?, ?, ?, ?)').run(
      'loc-' + generateUUID(), student.id, latitude, longitude, new Date().toISOString()
    );

    // Rule 8: Insert response
    const resId = existingRes ? (db.prepare('SELECT id FROM attendance_responses WHERE session_id = ? AND student_id = ?').get(session_id, student.id).id) : ('res-' + generateUUID());
    
    db.prepare(`
      INSERT INTO attendance_responses (id, session_id, student_id, responded_at, latitude, longitude, distance_m, attempt_count, auto_status, flag_reason)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(session_id, student_id) DO UPDATE SET 
        responded_at = excluded.responded_at,
        latitude = excluded.latitude,
        longitude = excluded.longitude,
        distance_m = excluded.distance_m,
        attempt_count = excluded.attempt_count,
        auto_status = excluded.auto_status,
        flag_reason = excluded.flag_reason
    `).run(resId, session_id, student.id, new Date().toISOString(), latitude, longitude, distance_m, attempt_count, auto_status, flag_reason);

    // Rule 6: Proximity clustering
    const recentRes = db.prepare(`
      SELECT * FROM attendance_responses 
      WHERE session_id = ? AND student_id != ? AND abs(strftime('%s', responded_at) - strftime('%s', ?)) < 10
    `).all(session_id, student.id, new Date().toISOString());

    let clustered = false;
    for (const other of recentRes) {
      if (getDistance(latitude, longitude, other.latitude, other.longitude) < 2) {
        db.prepare("UPDATE attendance_responses SET auto_status = 'FLAGGED', flag_reason = 'proximity_cluster' WHERE id IN (?, ?)").run(resId, other.id);
        clustered = true;
        auto_status = 'FLAGGED';
        flag_reason = 'proximity_cluster';
        break;
      }
    }

    // Broadcast to faculty via WS
    wss.clients.forEach(client => {
      if (client.readyState === 1 && client.faculty_id === session.faculty_id) { // simple check, ideally mapped by session
        client.send(JSON.stringify({
          type: 'STUDENT_RESPONSE',
          student_id: student.id,
          name: `${student.first_name} ${student.last_name}`,
          auto_status,
          flag_reason,
          distance_m,
          responded_at: new Date().toISOString()
        }));
      }
    });

    res.json({ status: auto_status, distance_m, message: flag_reason || auto_status });
  });

  // Review (Faculty)
  app.get('/api/attendance/session/:sessionId/review', (req, res) => {
    const { sessionId } = req.params;
    const userId = req.headers['x-user-id'];
    const staff = db.prepare('SELECT id FROM staff WHERE user_id = ?').get(userId);
    if (!staff) return res.status(403).json({ error: { message: 'Not faculty' } });

    const session = db.prepare('SELECT * FROM attendance_sessions WHERE id = ? AND faculty_id = ?').get(sessionId, staff.id);
    if (!session) return res.status(404).json({ error: { message: 'Session not found' } });

    const responses = db.prepare(`
      SELECT r.*, s.first_name, s.last_name, s.student_id_number
      FROM attendance_responses r
      JOIN students s ON r.student_id = s.id
      WHERE r.session_id = ?
    `).all(sessionId);

    const lates = db.prepare(`
      SELECT l.*, s.first_name, s.last_name, s.student_id_number
      FROM late_join_requests l
      JOIN students s ON l.student_id = s.id
      WHERE l.session_id = ? AND l.status = 'PENDING'
    `).all(sessionId);

    const grouped = {
      auto_present: responses.filter(r => r.auto_status === 'PRESENT' || r.final_status === 'PRESENT'),
      flagged: responses.filter(r => r.auto_status === 'FLAGGED' && !r.final_status),
      out_of_range: responses.filter(r => r.auto_status === 'OUT_OF_RANGE' && !r.final_status)
    };

    res.json({ session, responses: grouped, late_requests: lates });
  });

  // Submit Final (Faculty)
  app.post('/api/attendance/session/:sessionId/submit', (req, res) => {
    const { sessionId } = req.params;
    const { overrides } = req.body; // array of { student_id, final_status, reason }
    const userId = req.headers['x-user-id'];
    const staff = db.prepare('SELECT id FROM staff WHERE user_id = ?').get(userId);

    const session = db.prepare('SELECT * FROM attendance_sessions WHERE id = ? AND faculty_id = ?').get(sessionId, staff.id);
    if (!session) return res.status(404).json({ error: { message: 'Session not found' } });
    if (session.status === 'SUBMITTED') return res.status(400).json({ error: { message: 'Already submitted' } });

    db.exec('BEGIN TRANSACTION');
    try {
      db.prepare("UPDATE attendance_sessions SET status = 'SUBMITTED', submitted_at = ? WHERE id = ?").run(new Date().toISOString(), sessionId);
      
      const insertAudit = db.prepare("INSERT INTO attendance_audit (id, session_id, student_id, action, previous_status, new_status, performed_by, performed_at, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
      const updateRes = db.prepare("UPDATE attendance_responses SET final_status = ?, overridden_by = ?, overridden_at = ? WHERE session_id = ? AND student_id = ?");

      for (const ov of overrides) {
        updateRes.run(ov.final_status, staff.id, new Date().toISOString(), sessionId, ov.student_id);
        insertAudit.run('audit-' + generateUUID(), sessionId, ov.student_id, 'OVERRIDE', null, ov.final_status, staff.id, new Date().toISOString(), ov.reason || null);
        
        // update attendance rate
        const total = db.prepare('SELECT COUNT(*) as c FROM attendance_responses WHERE student_id = ? AND final_status IS NOT NULL').get(ov.student_id).c;
        const pres = db.prepare("SELECT COUNT(*) as c FROM attendance_responses WHERE student_id = ? AND final_status IN ('PRESENT', 'LATE')").get(ov.student_id).c;
        const rate = total > 0 ? (pres/total)*100 : 100;
        db.prepare('UPDATE students SET attendance_rate = ? WHERE id = ?').run(rate, ov.student_id);
      }
      db.exec('COMMIT');
      res.json({ success: true });
    } catch (err) {
      db.exec('ROLLBACK');
      res.status(500).json({ error: { message: err.message } });
    }
  });

  // Late Request (Student)
  app.post('/api/attendance/late-request', (req, res) => {
    const { session_id, reason } = req.body;
    const student = db.prepare('SELECT id FROM students WHERE user_id = ?').get(req.headers['x-user-id']);
    const session = db.prepare('SELECT * FROM attendance_sessions WHERE id = ?').get(session_id);
    if (!session || session.status === 'OPEN') return res.status(400).json({ error: { message: 'Session is active' } });

    db.prepare("INSERT INTO late_join_requests (id, session_id, student_id, reason, requested_at) VALUES (?, ?, ?, ?, ?)").run(
      'late-' + generateUUID(), session_id, student.id, reason, new Date().toISOString()
    );
    res.json({ success: true });
  });

  // Device Register
  app.post('/api/device/register', (req, res) => {
    const { device_fingerprint } = req.body;
    const student = db.prepare('SELECT id FROM students WHERE user_id = ?').get(req.headers['x-user-id']);
    if (!student) return res.status(403).json({ error: { message: 'Not student' } });

    const device = db.prepare('SELECT * FROM device_registry WHERE student_id = ?').get(student.id);
    const token = crypto.randomBytes(32).toString('hex');
    
    if (!device) {
      db.prepare("INSERT INTO device_registry (id, student_id, device_fingerprint, device_token, registered_at, last_active) VALUES (?, ?, ?, ?, ?, ?)")
        .run('dev-' + generateUUID(), student.id, device_fingerprint, token, new Date().toISOString(), new Date().toISOString());
      return res.json({ success: true, device_token: token });
    } else {
      let trusted = device.is_trusted;
      let count = device.switch_count;
      if (device.device_fingerprint !== device_fingerprint) {
        count++;
        if (count > 2) trusted = 0;
        try {
           transporter.sendMail({
              from: process.env.SMTP_USER,
              to: 'student@abes.edu', // placeholder
              subject: 'Device Switch Alert',
              text: 'Your device fingerprint changed.'
           });
        } catch (e) {}
      }
      db.prepare("UPDATE device_registry SET device_fingerprint = ?, device_token = ?, switch_count = ?, is_trusted = ?, last_active = ? WHERE id = ?")
        .run(device_fingerprint, token, count, trusted, new Date().toISOString(), device.id);
      return res.json({ success: true, device_token: token });
    }
  });

  // FCM Token
  app.put('/api/device/fcm-token', (req, res) => {
    const { fcm_token } = req.body;
    db.prepare("INSERT INTO fcm_tokens (id, user_id, fcm_token, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET fcm_token=excluded.fcm_token, updated_at=excluded.updated_at")
      .run('fcm-' + generateUUID(), req.headers['x-user-id'], fcm_token, new Date().toISOString());
    res.json({ success: true });
  });

  // Audit Log - All logs (for Admin GPS Attendance Audit tab)
  app.get('/api/attendance/audit', (req, res) => {
    try {
      const list = db.prepare(`
        SELECT a.id, a.student_id, a.action AS event_type, a.reason AS description, a.performed_at AS created_at
        FROM attendance_audit a
        ORDER BY a.performed_at DESC
      `).all();
      res.json({ success: true, logs: list });
    } catch (err) {
      res.status(500).json({ error: { message: err.message } });
    }
  });

  // Audit Log - Session specific
  app.get('/api/attendance/audit/:sessionId', (req, res) => {
    const list = db.prepare(`
      SELECT a.*, u.email as actor_email
      FROM attendance_audit a
      LEFT JOIN users u ON a.performed_by = u.id
      WHERE a.session_id = ?
      ORDER BY a.performed_at DESC
    `).all(req.params.sessionId);
    res.json({ success: true, audit: list });
  });
}

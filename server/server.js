import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import http from 'http';
import { WebSocketServer } from 'ws';
import { db } from './database.js';
import { setupGPSAttendance } from './gps.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// --- SECURE: Salted PBKDF2 Password Utilities ---
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedValue) {
  if (!storedValue || !storedValue.includes(':')) return false;
  const [salt, hash] = storedValue.split(':');
  const checkHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === checkHash;
}

// --- SECURE: Input Escape Sanitizer (XSS Mitigation) ---
function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// --- SECURE: Safe Internal Error Safeguard ---
function sendErrorResponse(res, err, defaultMsg = 'Internal server database error.') {
  console.error('AUDITOR SECURITY EXCEPTION LOG:', err);
  const isConstraintOrClash = err.message && (
    err.message.includes('constraint') || 
    err.message.includes('UNIQUE') || 
    err.message.includes('Double-Booking') || 
    err.message.includes('Clash')
  );
  const msg = isConstraintOrClash ? err.message : defaultMsg;
  res.status(500).json({ error: { message: msg } });
}

// --- HELPER: Random UUID Generator for SQLite ---
function generateUUID() {
  return 'uuid-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// --- HELPER: Audit Log Writer ---
function logAuditEvent(email, action, details) {
  try {
    const id = 'audit-' + generateUUID();
    db.prepare('INSERT INTO system_audit_logs (id, user_email, action, details) VALUES (?, ?, ?, ?)').run(
      id, email, action, details
    );
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

// --- MIDDLEWARE: Simple Auth via Headers (as agreed due to missing JWT) ---
const requireAuth = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  const userRole = req.headers['x-user-role'];
  if (!userId || !userRole) {
    return res.status(401).json({ error: { message: 'Unauthorized. Missing authentication headers.' } });
  }
  req.user = { id: userId, role: userRole };
  next();
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: { message: 'Forbidden. Admin role required.' } });
  }
  next();
};

function isCourseLocked(courseId) {
  const lock = db.prepare('SELECT * FROM internal_marks_lock WHERE course_id = ?').get(courseId);
  return !!lock;
}

function isFacultyAssigned(courseId, userId) {
  const staff = db.prepare('SELECT id FROM staff WHERE user_id = ?').get(userId);
  if (!staff) return false;
  const sched = db.prepare('SELECT * FROM schedules WHERE course_id = ? AND instructor_id = ?').get(courseId, staff.id);
  return !!sched;
}

// =========================================================================
// 1. AUTHENTICATION MODULE
// =========================================================================
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: { message: 'Email and password are required.' } });
  }

  try {
    const userQuery = db.prepare('SELECT * FROM users WHERE email = ?');
    const user = userQuery.get(email);

    if (!user || !verifyPassword(password, user.password)) {
      return res.status(401).json({ error: { message: 'Invalid credentials. Access denied.' } });
    }

    let profile = null;
    if (user.role === 'student') {
      profile = db.prepare('SELECT * FROM students WHERE user_id = ?').get(user.id);
    } else if (user.role === 'faculty') {
      profile = db.prepare('SELECT * FROM staff WHERE user_id = ?').get(user.id);
    }

    logAuditEvent(email, 'USER_LOGIN', `User session authenticated under role: ${user.role}`);

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      },
      profile
    });
  } catch (err) {
    sendErrorResponse(res, err, 'Authentication service gateway error.');
  }
});

// =========================================================================
// 2. STUDENT LIFECYCLE DIRECTORY CRUD & CSV IMPORT
// =========================================================================
app.get('/api/students', (req, res) => {
  try {
    const list = db.prepare('SELECT * FROM students').all();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

app.post('/api/students', (req, res) => {
  const { firstName, lastName, studentIdNumber, dateOfBirth, program, contactNumber, emergencyContact } = req.body;

  if (!firstName || !lastName || !studentIdNumber || !dateOfBirth) {
    return res.status(400).json({ error: { message: 'Missing required profile fields.' } });
  }

  // DOB validation check
  const dobTime = Date.parse(dateOfBirth);
  if (isNaN(dobTime)) {
    return res.status(400).json({ error: { message: 'Enrollment Error: Invalid Date of Birth format.' } });
  }

  const age = new Date().getFullYear() - new Date(dateOfBirth).getFullYear();
  if (age < 15) {
    return res.status(400).json({ error: { message: 'Enrollment Error: Student must be at least 15 years of age.' } });
  }

  // Auditor Sanitization
  const cleanFirstName = sanitizeString(firstName);
  const cleanLastName = sanitizeString(lastName);
  const cleanStudentIdNumber = sanitizeString(studentIdNumber);
  const cleanProgram = sanitizeString(program || 'Computer Science & Engineering');
  const cleanContactNumber = sanitizeString(contactNumber || '+91 99999 88888');
  const cleanEmergencyContact = sanitizeString(emergencyContact || 'Guardian - +91 99999 77777');

  try {
    const userId = 'u-' + generateUUID();
    const studentId = 'stud-' + generateUUID();
    const invoiceId = 'inv-' + generateUUID();

    // Create user login credential with secure hashed password
    db.prepare('INSERT INTO users (id, email, password, role) VALUES (?, ?, ?, ?)').run(
      userId,
      `${cleanFirstName.toLowerCase()}.${cleanLastName.toLowerCase()}@abes.edu`,
      hashPassword('abes123'),
      'student'
    );

    // Create student profile
    db.prepare(`
      INSERT INTO students (id, user_id, student_id_number, first_name, last_name, date_of_birth, enrollment_status, program, admission_year, contact_number, emergency_contact, attendance_rate)
      VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, 2026, ?, ?, 100.0)
    `).run(
      studentId,
      userId,
      cleanStudentIdNumber,
      cleanFirstName,
      cleanLastName,
      dateOfBirth,
      cleanProgram,
      cleanContactNumber,
      cleanEmergencyContact
    );

    // Seed grades
    const coursesList = db.prepare('SELECT id FROM courses').all();
    coursesList.forEach((c, idx) => {
      const mark = 80 + Math.floor(Math.random() * 18);
      const grade = mark >= 90 ? 'A+' : mark >= 80 ? 'A' : 'B+';
      db.prepare('INSERT INTO student_grades (id, student_id, course_id, marks_obtained, grade_letter, semester) VALUES (?, ?, ?, ?, ?, 6)').run(
        'g-' + generateUUID(),
        studentId,
        c.id,
        mark,
        grade
      );
    });

    // Create Standard Semester Invoice
    db.prepare(`
      INSERT INTO invoices (id, student_id, total_amount, amount_paid, status, issue_date, due_date, receipt_url)
      VALUES (?, ?, 58000.00, 0.00, 'UNPAID', ?, ?, NULL)
    `).run(
      invoiceId,
      studentId,
      new Date().toISOString().split('T')[0],
      '2026-08-30'
    );

    // Itemized lines
    db.prepare('INSERT INTO invoice_items (id, invoice_id, name, amount) VALUES (?, ?, ?, ?)').run('item-' + generateUUID(), invoiceId, 'Academic Tuition (1st Semester)', 50000.00);
    db.prepare('INSERT INTO invoice_items (id, invoice_id, name, amount) VALUES (?, ?, ?, ?)').run('item-' + generateUUID(), invoiceId, 'ABES Registration Fees', 5000.00);
    db.prepare('INSERT INTO invoice_items (id, invoice_id, name, amount) VALUES (?, ?, ?, ?)').run('item-' + generateUUID(), invoiceId, 'Student Lab Materials Allocation', 3000.00);

    logAuditEvent('admin@abes.edu', 'STUDENT_ENROLLMENT', `Enrolled profile ${cleanFirstName} ${cleanLastName} (Roll: ${cleanStudentIdNumber})`);

    const createdStudent = db.prepare('SELECT * FROM students WHERE id = ?').get(studentId);
    res.status(201).json({ success: true, student: createdStudent });
  } catch (err) {
    sendErrorResponse(res, err, 'Relational profile registration failed.');
  }
});

// CSV Cohort Import
app.post('/api/students/bulk-import', (req, res) => {
  const { csvText, program } = req.body;
  if (!csvText) {
    return res.status(400).json({ error: { message: 'CSV data string is required.' } });
  }

  // Sanitize program input
  const cleanProgram = sanitizeString(program || 'Computer Science & Engineering');

  try {
    const lines = csvText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    let importCount = 0;

    lines.forEach(line => {
      const cols = line.split(',').map(c => c.trim());
      if (cols.length < 4) return;

      const [rollNumber, firstName, lastName, dob, phone] = cols;
      
      // Escape parsed CSV columns
      const cleanRollNumber = sanitizeString(rollNumber);
      const cleanFirstName = sanitizeString(firstName);
      const cleanLastName = sanitizeString(lastName);
      const cleanPhone = sanitizeString(phone || '+91 99999 88888');

      // Date parsing validation
      const dobTime = Date.parse(dob);
      if (isNaN(dobTime)) return; // Skip corrupted CSV rows

      const userId = 'u-' + generateUUID();
      const studentId = 'stud-' + generateUUID();
      const invoiceId = 'inv-' + generateUUID();

      // Create Login with secure hashed credentials
      db.prepare('INSERT OR IGNORE INTO users (id, email, password, role) VALUES (?, ?, ?, ?)').run(
        userId,
        `${cleanFirstName.toLowerCase()}@abes.edu`,
        hashPassword('abes123'),
        'student'
      );

      // Create Profile
      db.prepare(`
        INSERT OR IGNORE INTO students (id, user_id, student_id_number, first_name, last_name, date_of_birth, enrollment_status, program, admission_year, contact_number, emergency_contact, attendance_rate)
        VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, 2026, ?, 'Guardian - +91 99999 77777', 100.0)
      `).run(
        studentId,
        userId,
        cleanRollNumber,
        cleanFirstName,
        cleanLastName,
        dob,
        cleanProgram,
        cleanPhone
      );

      // Seed grade placeholders
      const coursesList = db.prepare('SELECT id FROM courses').all();
      coursesList.forEach(c => {
        const mark = 82 + Math.floor(Math.random() * 15);
        const grade = mark >= 90 ? 'A+' : 'A';
        db.prepare('INSERT OR IGNORE INTO student_grades (id, student_id, course_id, marks_obtained, grade_letter, semester) VALUES (?, ?, ?, ?, ?, 6)').run(
          'g-' + generateUUID(),
          studentId,
          c.id,
          mark,
          grade
        );
      });

      // Issue bill
      db.prepare(`
        INSERT OR IGNORE INTO invoices (id, student_id, total_amount, status, issue_date, due_date)
        VALUES (?, ?, 58000.00, 'UNPAID', ?, '2026-08-30')
      `).run(invoiceId, studentId, new Date().toISOString().split('T')[0]);

      db.prepare('INSERT OR IGNORE INTO invoice_items (id, invoice_id, name, amount) VALUES (?, ?, ?, ?)').run('item-' + generateUUID(), invoiceId, 'Academic Tuition (1st Semester)', 50000.00);

      importCount++;
    });

    logAuditEvent('admin@abes.edu', 'COHORT_BULK_IMPORT', `Successfully uploaded CSV batch enrolling ${importCount} students.`);
    res.json({ success: true, message: `Successfully enrolled ${importCount} students via bulk parser.` });
  } catch (err) {
    sendErrorResponse(res, err, 'Cohort bulk registration failed.');
  }
});

app.get('/api/courses', (req, res) => {
  try {
    const list = db.prepare('SELECT * FROM courses').all();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

app.get('/api/rooms', (req, res) => {
  try {
    const list = db.prepare('SELECT * FROM rooms').all();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

app.get('/api/staff', (req, res) => {
  try {
    const list = db.prepare('SELECT * FROM staff').all();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// =========================================================================
// 3. MASTER CALENDAR TIMETABLE & CONSTRAINTS
// =========================================================================
app.get('/api/schedules', (req, res) => {
  try {
    const list = db.prepare('SELECT * FROM schedules').all();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

app.post('/api/schedules', (req, res) => {
  const { courseId, instructorId, roomId, day, timeWindow } = req.body;

  if (!courseId || !instructorId || !roomId || !day || !timeWindow) {
    return res.status(400).json({ error: { message: 'All scheduling parameters are required.' } });
  }

  try {
    const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(courseId);
    const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
    
    if (!course || !room) {
      return res.status(404).json({ error: { message: 'Course or Lecture room not found.' } });
    }

    // Double-Booking validations
    const roomCollision = db.prepare('SELECT * FROM schedules WHERE room_id = ? AND day = ? AND time_window = ?').get(roomId, day, timeWindow);
    if (roomCollision) {
      const collCourse = db.prepare('SELECT * FROM courses WHERE id = ?').get(roomCollision.course_id);
      return res.status(409).json({ 
        error: { 
          code: 'HARD_ROOM_DOUBLE_BOOKING',
          message: `Double-Booking: Room "${room.name}" is already reserved for "${collCourse.title}" on ${day} at ${timeWindow}.`
        } 
      });
    }

    const staffCollision = db.prepare('SELECT * FROM schedules WHERE instructor_id = ? AND day = ? AND time_window = ?').get(instructorId, day, timeWindow);
    if (staffCollision) {
      const collCourse = db.prepare('SELECT * FROM courses WHERE id = ?').get(staffCollision.course_id);
      return res.status(409).json({
        error: {
          code: 'HARD_FACULTY_CLASH',
          message: `Lecturer Clash: Instructor is already teaching "${collCourse.title}" on ${day} at ${timeWindow}.`
        }
      });
    }

    if (course.size > room.capacity) {
      return res.status(409).json({
        error: {
          code: 'HARD_ROOM_CAPACITY',
          message: `Capacity Clash: Course cohort size (${course.size} students) exceeds seating capacity of "${room.name}" (${room.capacity} seats).`
        }
      });
    }

    const id = 'sched-' + generateUUID();
    db.prepare(`
      INSERT INTO schedules (id, course_id, instructor_id, room_id, day, time_window)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, courseId, instructorId, roomId, day, timeWindow);

    logAuditEvent('admin@abes.edu', 'SCHEDULE_CREATED', `Scheduled class ${course.code} in room ${room.name} at ${day} ${timeWindow}`);

    const saved = db.prepare('SELECT * FROM schedules WHERE id = ?').get(id);
    res.status(201).json({ success: true, schedule: saved });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// AI Timetable Generator
app.post('/api/schedules/auto-generate', (req, res) => {
  try {
    const allCourses = db.prepare('SELECT * FROM courses').all();
    const allStaff = db.prepare('SELECT * FROM staff').all();
    const allRooms = db.prepare('SELECT * FROM rooms').all();

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const slots = ['09:00 - 10:30', '10:30 - 12:00', '13:00 - 14:30', '14:30 - 16:00'];

    const solverSchedules = [];

    const teacherMap = {
      'cour-01': 'staff-01',
      'cour-02': 'staff-01',
      'cour-03': 'staff-02',
      'cour-04': 'staff-02',
      'cour-05': 'staff-01'
    };

    function isSafe(course, room, day, slot, instructorId) {
      if (course.size > room.capacity) return false;
      for (const s of solverSchedules) {
        if (s.day === day && s.timeWindow === slot) {
          if (s.roomId === room.id) return false;
          if (s.instructorId === instructorId) return false;
        }
      }
      return true;
    }

    let solvedCount = 0;

    for (const course of allCourses) {
      const teacherId = teacherMap[course.id] || allStaff[0].id;
      let placed = false;

      for (const day of days) {
        if (placed) break;
        for (const slot of slots) {
          if (placed) break;
          for (const room of allRooms) {
            if (isSafe(course, room, day, slot, teacherId)) {
              solverSchedules.push({
                id: 'sched-' + generateUUID(),
                courseId: course.id,
                instructorId: teacherId,
                roomId: room.id,
                day,
                timeWindow: slot
              });
              placed = true;
              solvedCount++;
              break;
            }
          }
        }
      }
    }

    // Wrap scheduling re-allocation in an atomic SQLite Transaction block
    db.exec('BEGIN TRANSACTION');
    try {
      db.exec('DELETE FROM schedules');

      const insertStmt = db.prepare(`
        INSERT INTO schedules (id, course_id, instructor_id, room_id, day, time_window)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      solverSchedules.forEach(s => {
        insertStmt.run(s.id, s.courseId, s.instructorId, s.roomId, s.day, s.timeWindow);
      });

      db.exec('COMMIT');
    } catch (txnErr) {
      db.exec('ROLLBACK');
      throw txnErr; // rethrow to be caught by outer catch block
    }

    logAuditEvent('admin@abes.edu', 'AI_TIMETABLE_AUTO_GENERATED', `AI constraint solver allocated ${solvedCount} classes cleanly.`);
    res.json({ success: true, message: `AI Solver generated ${solvedCount} class timetable schedules successfully.`, schedules: solverSchedules });

  } catch (err) {
    sendErrorResponse(res, err, 'AI constraint solver schedule allocation failed.');
  }
});

// =========================================================================
// 4. ATTENDANCE ROSTER LOGGING & GRADES / TRANSCRIPTS
// =========================================================================
app.get('/api/attendance/student/:studentId', (req, res) => {
  const { studentId } = req.params;
  try {
    const list = db.prepare('SELECT * FROM attendance WHERE student_id = ?').all(studentId);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

app.post('/api/attendance/batch', (req, res) => {
  const { scheduleId, records, recordedBy } = req.body;
  if (!scheduleId || !records || !recordedBy) {
    return res.status(400).json({ error: { message: 'Roster details are required.' } });
  }

  try {
    const timestamp = new Date().toISOString();
    
    // Wrap batch records update inside an atomic SQLite Transaction block
    db.exec('BEGIN TRANSACTION');
    try {
      records.forEach(rec => {
        db.prepare(`
          INSERT INTO attendance (id, student_id, schedule_id, status, recorded_by, timestamp, latitude, longitude)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(student_id, schedule_id, timestamp) DO UPDATE SET status = excluded.status
        `).run(
          'att-' + generateUUID(),
          rec.studentId,
          scheduleId,
          rec.status,
          recordedBy,
          timestamp,
          rec.latitude || null,
          rec.longitude || null
        );

        // Recalculate attendance rates for this student
        const total = db.prepare('SELECT COUNT(*) as count FROM attendance WHERE student_id = ?').get(rec.studentId).count;
        const present = db.prepare("SELECT COUNT(*) as count FROM attendance WHERE student_id = ? AND status IN ('PRESENT', 'LATE')").get(rec.studentId).count;
        const rate = total > 0 ? (present / total) * 100 : 100.0;
        db.prepare('UPDATE students SET attendance_rate = ? WHERE id = ?').run(rate, rec.studentId);
      });
      db.exec('COMMIT');
    } catch (txnErr) {
      db.exec('ROLLBACK');
      throw txnErr; // rethrow to outer catch block
    }

    logAuditEvent('faculty@abes.edu', 'ROSTER_CALL_SUBMITTED', `Roster call recorded for schedule #${scheduleId}`);
    res.json({ success: true, message: `Attendance logs updated for ${records.length} students.` });
  } catch (err) {
    sendErrorResponse(res, err, 'Batch roster attendance submission failed.');
  }
});

app.post('/api/attendance/qr-sign', (req, res) => {
  const { studentId, scheduleId, token, latitude, longitude } = req.body;
  if (!studentId || !scheduleId || !token) {
    return res.status(400).json({ error: { message: 'Proximity signing params are required.' } });
  }

  const facultyLat = 28.6756;
  const facultyLng = 77.4402;

  if (latitude && longitude) {
    let isViolated = false;
    if (latitude > 100) {
      // Cartesian map coordinate coordinates (checking proximity to CSE Room 102 center which is around x:370, y:90)
      const distance = Math.sqrt(Math.pow(latitude - 370, 2) + Math.pow(longitude - 90, 2));
      if (distance > 25) { // 25px range threshold
        isViolated = true;
      }
    } else {
      const latDiff = Math.abs(latitude - facultyLat);
      const lngDiff = Math.abs(longitude - facultyLng);
      if (latDiff > 0.0002 || lngDiff > 0.0002) {
        isViolated = true;
      }
    }
    
    if (isViolated) {
      logAuditEvent('student@abes.edu', 'PROXIMITY_BLOCKED', `Proximity sign-in failed. Coordinates outside boundary: ${latitude}, ${longitude}`);
      return res.status(403).json({
        error: {
          code: 'GPS_PROXIMITY_BLOCKED',
          message: 'Check-in Blocked: Proximity checking failed. You are beyond classroom limits.'
        }
      });
    }
  }

  try {
    const id = 'att-qr-' + generateUUID();
    db.prepare(`
      INSERT INTO attendance (id, student_id, schedule_id, status, recorded_by, timestamp, latitude, longitude)
      VALUES (?, ?, ?, 'PRESENT', 'staff-01', ?, ?, ?)
    `).run(
      id,
      studentId,
      scheduleId,
      new Date().toISOString(),
      latitude || null,
      longitude || null
    );

    // Recalculate attendance rate
    const total = db.prepare('SELECT COUNT(*) as count FROM attendance WHERE student_id = ?').get(studentId).count;
    const present = db.prepare("SELECT COUNT(*) as count FROM attendance WHERE student_id = ? AND status IN ('PRESENT', 'LATE')").get(studentId).count;
    const rate = total > 0 ? (present / total) * 100 : 100.0;
    db.prepare('UPDATE students SET attendance_rate = ? WHERE id = ?').run(rate, studentId);

    logAuditEvent('student@abes.edu', 'QR_ATTENDANCE_SIGNED', `Student ${studentId} check-in success inside room.`);
    res.json({ success: true, message: 'Class check-in logged.' });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

app.get('/api/grades/student/:studentId', (req, res) => {
  const { studentId } = req.params;
  try {
    const gradeList = db.prepare(`
      SELECT sg.*, c.code, c.title, c.credits 
      FROM student_grades sg
      JOIN courses c ON sg.course_id = c.id
      WHERE sg.student_id = ?
    `).all(studentId);

    let totalGradePoints = 0;
    let totalCredits = 0;

    const gradeValues = { 'A+': 10, 'A': 9, 'B+': 8, 'B': 7 };

    gradeList.forEach(g => {
      const gp = gradeValues[g.grade_letter] || 8;
      totalGradePoints += gp * g.credits;
      totalCredits += g.credits;
    });

    const sgpa = totalCredits > 0 ? (totalGradePoints / totalCredits).toFixed(2) : '8.50';

    res.json({
      success: true,
      grades: gradeList,
      sgpa,
      totalCredits
    });

  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

app.get('/api/grades', (req, res) => {
  try {
    const list = db.prepare('SELECT * FROM student_grades').all();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

app.post('/api/grades/update', (req, res) => {
  const { studentId, courseId, marksObtained, semester } = req.body;
  if (!studentId || !courseId || marksObtained === undefined) {
    return res.status(400).json({ error: { message: 'Missing studentId, courseId, or marksObtained.' } });
  }
  const marks = parseInt(marksObtained, 10);
  if (isNaN(marks) || marks < 0 || marks > 100) {
    return res.status(400).json({ error: { message: 'Marks must be an integer between 0 and 100.' } });
  }
  const sem = semester ? parseInt(semester, 10) : 6;

  let gradeLetter = 'F';
  if (marks >= 90) gradeLetter = 'A+';
  else if (marks >= 80) gradeLetter = 'A';
  else if (marks >= 70) gradeLetter = 'B+';
  else if (marks >= 60) gradeLetter = 'B';
  else if (marks >= 50) gradeLetter = 'C';

  try {
    const id = 'g-' + generateUUID();
    db.prepare(`
      INSERT INTO student_grades (id, student_id, course_id, marks_obtained, grade_letter, semester)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(student_id, course_id, semester)
      DO UPDATE SET marks_obtained = excluded.marks_obtained, grade_letter = excluded.grade_letter
    `).run(id, studentId, courseId, marks, gradeLetter, sem);

    const student = db.prepare('SELECT first_name, last_name FROM students WHERE id = ?').get(studentId);
    const course = db.prepare('SELECT title FROM courses WHERE id = ?').get(courseId);

    logAuditEvent('faculty@abes.edu', 'GRADE_POSTED', `Updated grade for ${student?.first_name} ${student?.last_name} in "${course?.title}" to ${marks}% (${gradeLetter})`);

    res.json({ success: true, message: 'Grade recorded successfully.', gradeLetter });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// =========================================================================
// 4.1 ACADEMIC SYLLABUS TRACKING OPERATIONS (Phase II)
// =========================================================================
app.get('/api/syllabus', (req, res) => {
  try {
    const progress = db.prepare(`
      SELECT sp.*, c.code, c.title 
      FROM syllabus_progress sp
      JOIN courses c ON sp.course_id = c.id
    `).all();
    res.json(progress);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

app.post('/api/syllabus/:progressId', (req, res) => {
  const { progressId } = req.params;
  const { coveragePercentage } = req.body;

  if (coveragePercentage === undefined || coveragePercentage < 0 || coveragePercentage > 100) {
    return res.status(400).json({ error: { message: 'Invalid coverage value. Must be between 0 and 100.' } });
  }

  try {
    db.prepare('UPDATE syllabus_progress SET coverage_percentage = ? WHERE id = ?').run(
      coveragePercentage, progressId
    );
    
    const updated = db.prepare('SELECT * FROM syllabus_progress WHERE id = ?').get(progressId);
    const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(updated.course_id);

    logAuditEvent('faculty@abes.edu', 'SYLLABUS_UPDATED', `Updated coverage for "${course.title}" - ${updated.unit_name} to ${coveragePercentage}%`);
    res.json({ success: true, updated });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// =========================================================================
// 4.2 GLOBAL CAMPUS ANNOUNCEMENTS (Phase II)
// =========================================================================
app.get('/api/announcements', (req, res) => {
  try {
    const list = db.prepare('SELECT * FROM campus_announcements ORDER BY created_at DESC').all();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

app.post('/api/announcements', (req, res) => {
  const { title, content, urgency } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: { message: 'Title and content details are required.' } });
  }

  try {
    const id = 'ann-' + generateUUID();
    db.prepare('INSERT INTO campus_announcements (id, title, content, urgency) VALUES (?, ?, ?, ?)').run(
      id, title, content, urgency || 'INFO'
    );

    logAuditEvent('admin@abes.edu', 'ANNOUNCEMENT_BROADCAST', `Admin posted news bulletin: ${title}`);
    
    const saved = db.prepare('SELECT * FROM campus_announcements WHERE id = ?').get(id);
    res.status(201).json({ success: true, announcement: saved });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// =========================================================================
// 4.3 PUBLIC EMPLOYER DIGITAL TRANSCRIPT VERIFICATION GATEWAY
// =========================================================================
app.get('/api/verify-transcript/:studentId', (req, res) => {
  const { studentId } = req.params;
  try {
    const student = db.prepare('SELECT * FROM students WHERE id = ? OR student_id_number = ?').get(studentId, studentId);
    if (!student) {
      return res.status(404).json({ error: { message: 'Verification Error: No matching certified student profile found.' } });
    }

    const gradeList = db.prepare(`
      SELECT sg.*, c.code, c.title, c.credits 
      FROM student_grades sg
      JOIN courses c ON sg.course_id = c.id
      WHERE sg.student_id = ?
    `).all(student.id);

    let totalGradePoints = 0;
    let totalCredits = 0;
    const gradeValues = { 'A+': 10, 'A': 9, 'B+': 8, 'B': 7 };

    gradeList.forEach(g => {
      const gp = gradeValues[g.grade_letter] || 8;
      totalGradePoints += gp * g.credits;
      totalCredits += g.credits;
    });

    const sgpa = totalCredits > 0 ? (totalGradePoints / totalCredits).toFixed(2) : '8.50';

    logAuditEvent('public_verification@gateway.com', 'TRANSCRIPT_VERIFICATION', `Employer gateway authenticated grades for student Roll ID: ${student.student_id_number}`);

    res.json({
      success: true,
      verified: true,
      timestamp: new Date().toISOString(),
      student: {
        firstName: student.first_name,
        lastName: student.last_name,
        studentIdNumber: student.student_id_number,
        program: student.program,
        admissionYear: student.admission_year,
        status: student.enrollment_status
      },
      grades: gradeList,
      sgpa,
      totalCredits
    });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// =========================================================================
// 5. BILLING & RECONCILIATIONS
// =========================================================================
app.get('/api/billing/invoices/:studentId', (req, res) => {
  const { studentId } = req.params;
  try {
    const invoicesList = db.prepare('SELECT * FROM invoices WHERE student_id = ?').all(studentId);
    const hydrated = invoicesList.map(inv => {
      const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(inv.id);
      return { id: inv.id, studentId: inv.student_id, total_amount: inv.total_amount, amount_paid: inv.amount_paid, status: inv.status, issue_date: inv.issue_date, due_date: inv.due_date, receipt_url: inv.receipt_url, items };
    });
    res.json(hydrated);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

app.get('/api/billing/invoices', (req, res) => {
  try {
    const list = db.prepare('SELECT * FROM invoices').all();
    const hydrated = list.map(inv => {
      const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(inv.id);
      return { id: inv.id, studentId: inv.student_id, total_amount: inv.total_amount, amount_paid: inv.amount_paid, status: inv.status, issue_date: inv.issue_date, due_date: inv.due_date, receipt_url: inv.receipt_url, items };
    });
    res.json(hydrated);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

app.post('/api/billing/invoices/:invoiceId/upload-receipt', (req, res) => {
  const { invoiceId } = req.params;
  const { receiptData } = req.body;
  
  if (!receiptData) {
    return res.status(400).json({ error: { message: 'Receipt data is required.' } });
  }

  try {
    db.prepare("UPDATE invoices SET status = 'PENDING', receipt_url = ? WHERE id = ?").run(receiptData, invoiceId);
    logAuditEvent('student@abes.edu', 'RECEIPT_UPLOADED', `Uploaded digital slip for transaction #${invoiceId}`);
    res.json({ success: true, message: 'Receipt slip registered.' });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

app.post('/api/billing/invoices/:invoiceId/verify', (req, res) => {
  const { invoiceId } = req.params;
  const { approved } = req.body;

  try {
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
    if (!invoice) {
      return res.status(404).json({ error: { message: 'Invoice not found.' } });
    }

    const nextStatus = approved ? 'PAID' : 'UNPAID';
    const amountPaid = approved ? invoice.total_amount : 0.0;

    db.prepare("UPDATE invoices SET status = ?, amount_paid = ?, receipt_url = NULL WHERE id = ?").run(
      nextStatus, amountPaid, invoiceId
    );

    logAuditEvent('admin@abes.edu', 'BILL_AUDITED', `Bursar verification completed for bill #${invoiceId}: status is ${nextStatus}`);
    res.json({ success: true, message: `Invoice verified. Balance status set to ${nextStatus}.` });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

app.post('/api/billing/invoices/:invoiceId/pay-direct', (req, res) => {
  const { invoiceId } = req.params;
  try {
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
    if (!invoice) {
      return res.status(404).json({ error: { message: 'Invoice not found.' } });
    }
    db.prepare("UPDATE invoices SET status = 'PAID', amount_paid = total_amount, receipt_url = NULL WHERE id = ?").run(invoiceId);
    logAuditEvent('student@abes.edu', 'BILL_DIRECT_PAYMENT', `Direct gateway clearance for transaction #${invoiceId} of ₹${invoice.total_amount}`);
    res.json({ success: true, message: 'Payment settled instantly.' });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// =========================================================================
// 6. SYSTEM SECURITY AUDIT LOGS RETRIEVAL
// =========================================================================
app.get('/api/audit-logs', (req, res) => {
  try {
    const list = db.prepare('SELECT * FROM system_audit_logs ORDER BY timestamp DESC LIMIT 40').all();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// =========================================================================
// 7. OFFLINE DELTA SYNCHRONIZATION QUEUE
// =========================================================================
app.post('/api/sync', (req, res) => {
  const { changes } = req.body;
  if (!changes || !Array.isArray(changes)) {
    return res.status(400).json({ error: { message: 'Changes array is required.' } });
  }

  try {
    changes.forEach(change => {
      if (change.table === 'attendance') {
        const { studentId, scheduleId, status, timestamp } = change.data;
        db.prepare(`
          INSERT INTO attendance (id, student_id, schedule_id, status, recorded_by, timestamp)
          VALUES (?, ?, ?, ?, 'staff-01', ?)
          ON CONFLICT(student_id, schedule_id, timestamp) DO UPDATE SET status = excluded.status
        `).run('att-sync-' + generateUUID(), studentId, scheduleId, status, timestamp);
      }
      if (change.table === 'invoices') {
        const { id, status, receipt_url } = change.data;
        db.prepare("UPDATE invoices SET status = ?, receipt_url = ? WHERE id = ?").run(status, receipt_url, id);
      }
    });

    logAuditEvent('system@abes.edu', 'DELTA_SYNC_EXECUTED', `Delta sync processed ${changes.length} local cached client alterations.`);
    res.json({ success: true, message: `Successfully synchronized ${changes.length} local offline mutations.` });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// =========================================================================
// 8. INTERNAL MARKS SYSTEM
// =========================================================================

// Helpers for validation
const checkLockAndFaculty = (courseId, req, res) => {
  if (isCourseLocked(courseId)) {
    res.status(403).json({ error: { message: 'Course marks are locked by admin.' } });
    return false;
  }
  if (req.user.role !== 'admin' && !isFacultyAssigned(courseId, req.user.id)) {
    res.status(403).json({ error: { message: 'You are not assigned to this course.' } });
    return false;
  }
  return true;
};

app.post('/api/internal/assignments/:courseId/:studentId/marks', requireAuth, (req, res) => {
  const { courseId, studentId } = req.params;
  const { a1, a2, a3, a4, a5 } = req.body;
  if (!checkLockAndFaculty(courseId, req, res)) return;

  try {
    const marks = { a1, a2, a3, a4, a5 };
    db.exec('BEGIN TRANSACTION');
    try {
      for (let i = 1; i <= 5; i++) {
        const val = marks[`a${i}`];
        const assignId = `assign-${courseId}-${i}`;
        const id = 'asub-' + generateUUID();
        db.prepare(`
          INSERT INTO assignment_submissions (id, assignment_id, student_id, marks_obtained, status)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(assignment_id, student_id) DO UPDATE SET marks_obtained = excluded.marks_obtained, status = excluded.status, submitted_at = CURRENT_TIMESTAMP
        `).run(id, assignId, studentId, val, val !== null && val !== undefined ? 'SUBMITTED' : 'MISSING');
      }
      db.exec('COMMIT');
      res.json({ success: true, message: 'Assignment marks updated.' });
    } catch (txnErr) {
      db.exec('ROLLBACK');
      throw txnErr;
    }
  } catch (err) {
    sendErrorResponse(res, err);
  }
});

app.post('/api/internal/quizzes/:courseId', requireAuth, (req, res) => {
  const { courseId } = req.params;
  const { title, maxMarks } = req.body;
  if (!checkLockAndFaculty(courseId, req, res)) return;

  try {
    const id = 'quiz-' + generateUUID();
    db.prepare('INSERT INTO quizzes (id, course_id, title, max_marks, created_by) VALUES (?, ?, ?, ?, ?)')
      .run(id, courseId, title, maxMarks || 10.0, req.user.id);
    res.json({ success: true, message: 'Quiz created.', quizId: id });
  } catch (err) {
    sendErrorResponse(res, err);
  }
});

app.post('/api/internal/quizzes/:quizId/:studentId/marks', requireAuth, (req, res) => {
  const { quizId, studentId } = req.params;
  const marksObtained = req.body.marks !== undefined ? req.body.marks : req.body.marksObtained;
  
  try {
    const quiz = db.prepare('SELECT course_id FROM quizzes WHERE id = ?').get(quizId);
    if (!quiz) return res.status(404).json({ error: { message: 'Quiz not found' } });
    const courseId = quiz.course_id;

    if (!checkLockAndFaculty(courseId, req, res)) return;

    const id = 'qmark-' + generateUUID();
    db.prepare(`
      INSERT INTO quiz_marks (id, quiz_id, student_id, marks_obtained)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(quiz_id, student_id) DO UPDATE SET marks_obtained = excluded.marks_obtained
    `).run(id, quizId, studentId, marksObtained);
    res.json({ success: true, message: 'Quiz marks updated.' });
  } catch (err) {
    sendErrorResponse(res, err);
  }
});

app.post('/api/internal/sessional/:courseId/:testNumber/marks', requireAuth, (req, res) => {
  const { courseId, testNumber } = req.params;
  const marksArray = req.body.studentMarks || req.body.marksArray;
  if (!checkLockAndFaculty(courseId, req, res)) return;

  try {
    const test = db.prepare('SELECT id FROM sessional_tests WHERE course_id = ? AND test_number = ?').get(courseId, testNumber);
    if (!test) return res.status(404).json({ error: { message: 'Sessional test not found.' } });

    db.exec('BEGIN TRANSACTION');
    try {
      marksArray.forEach(m => {
        const id = 'smark-' + generateUUID();
        db.prepare(`
          INSERT INTO sessional_marks (id, test_id, student_id, marks_obtained)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(test_id, student_id) DO UPDATE SET marks_obtained = excluded.marks_obtained
        `).run(id, test.id, m.studentId, m.marks);
      });
      db.exec('COMMIT');
      res.json({ success: true, message: 'Sessional marks updated in bulk.' });
    } catch (txnErr) {
      db.exec('ROLLBACK');
      throw txnErr;
    }
  } catch (err) {
    sendErrorResponse(res, err);
  }
});

app.put('/api/internal/attendance-config/:courseId', requireAuth, (req, res) => {
  const { courseId } = req.params;
  const { configs } = req.body; // [{min, max, marks}]
  if (req.user.role !== 'admin' && !isFacultyAssigned(courseId, req.user.id)) {
    return res.status(403).json({ error: { message: 'Not authorized to configure attendance for this course.' } });
  }
  
  try {
    db.exec('BEGIN TRANSACTION');
    try {
      db.prepare('DELETE FROM attendance_mark_config WHERE course_id = ?').run(courseId);
      configs.forEach(c => {
        const id = 'att-cfg-' + generateUUID();
        db.prepare('INSERT INTO attendance_mark_config (id, course_id, min_percent, max_percent, marks_awarded) VALUES (?, ?, ?, ?, ?)')
          .run(id, courseId, c.min, c.max, c.marks);
      });
      db.exec('COMMIT');
      res.json({ success: true, message: 'Attendance config updated.' });
    } catch (txnErr) {
      db.exec('ROLLBACK');
      throw txnErr;
    }
  } catch (err) {
    sendErrorResponse(res, err);
  }
});

app.post('/api/internal/bonus/:courseId/:studentId', requireAuth, (req, res) => {
  const { courseId, studentId } = req.params;
  const { marks, reason } = req.body;
  if (!checkLockAndFaculty(courseId, req, res)) return;
  if (!reason || reason.trim() === '') return res.status(400).json({ error: { message: 'Reason is mandatory for bonus marks.' } });
  if (marks < 0 || marks > 5) return res.status(400).json({ error: { message: 'Bonus marks must be between 0 and 5.' } });

  try {
    const id = 'bonus-' + generateUUID();
    db.prepare('INSERT INTO bonus_marks (id, course_id, student_id, added_by, marks, reason) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, courseId, studentId, req.user.id, marks, reason);
    res.json({ success: true, message: 'Bonus marks added.' });
  } catch (err) {
    sendErrorResponse(res, err);
  }
});

app.post('/api/internal/lock/:courseId', requireAuth, requireAdmin, (req, res) => {
  const { courseId } = req.params;
  try {
    const id = 'lock-' + generateUUID();
    db.prepare('INSERT OR IGNORE INTO internal_marks_lock (id, course_id, locked_by) VALUES (?, ?, ?)')
      .run(id, courseId, req.user.id);
    logAuditEvent(req.user.email || req.user.id, 'COURSE_LOCKED', `Admin locked internal marks for course ${courseId}`);
    res.json({ success: true, message: 'Course marks locked.' });
  } catch (err) {
    sendErrorResponse(res, err);
  }
});

app.delete('/api/internal/lock/:courseId', requireAuth, requireAdmin, (req, res) => {
  const { courseId } = req.params;
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ error: { message: 'Reason required to unlock.' } });
  try {
    db.prepare('DELETE FROM internal_marks_lock WHERE course_id = ?').run(courseId);
    logAuditEvent(req.user.email || req.user.id, 'COURSE_UNLOCKED', `Admin unlocked course ${courseId}. Reason: ${reason}`);
    res.json({ success: true, message: 'Course marks unlocked.' });
  } catch (err) {
    sendErrorResponse(res, err);
  }
});

function calculateStudentInternalMarks(courseId, studentId) {
  let grandTotal = 0;

  // 1. Assignments (Total 5 marks)
  const assignments = db.prepare('SELECT * FROM assignments WHERE course_id = ?').all(courseId);
  let totalAssignScore = 0;
  let totalAssignMax = 0;
  const assignmentScores = [];
  
  assignments.forEach(a => {
    const sub = db.prepare('SELECT * FROM assignment_submissions WHERE assignment_id = ? AND student_id = ?').get(a.id, studentId);
    const score = sub && sub.marks_obtained !== null ? sub.marks_obtained : null;
    totalAssignScore += (score || 0);
    totalAssignMax += a.max_marks;
    assignmentScores.push(score);
  });
  
  const assignmentSubtotal = totalAssignMax > 0 ? (totalAssignScore / totalAssignMax) * 5 : 0;
  grandTotal += assignmentSubtotal;

  // 2. Quizzes (Total 5 marks, Best 5)
  const quizzes = db.prepare('SELECT q.id, q.title, q.max_marks, qm.marks_obtained FROM quizzes q LEFT JOIN quiz_marks qm ON q.id = qm.quiz_id AND qm.student_id = ? WHERE q.course_id = ?').all(studentId, courseId);
  const quizScores = quizzes.map(q => {
    const max = q.max_marks || 10;
    const score = q.marks_obtained || 0;
    return { id: q.id, title: q.title, score, max, normalized: (score / max) * 100 };
  });
  const quizScoresSorted = [...quizScores].sort((a, b) => b.normalized - a.normalized); // Descending
  const topQuizzes = quizScoresSorted.slice(0, 5);
  
  let totalQuizScore = 0;
  let totalQuizMax = 0;
  topQuizzes.forEach(q => {
    totalQuizScore += q.score;
    totalQuizMax += q.max;
  });
  
  const quizSubtotal = totalQuizMax > 0 ? (totalQuizScore / totalQuizMax) * 5 : 0;
  grandTotal += quizSubtotal;

  const topQuizIds = new Set(topQuizzes.map(tq => tq.id));
  const quizScoresAll = quizScores.map(q => ({
    id: q.id,
    marks: q.score,
    isTop5: topQuizIds.has(q.id)
  }));

  // 3. Sessional Tests (Best 2 of 3, Total 15 marks)
  const st = db.prepare('SELECT st.id, st.test_number, st.max_marks, sm.marks_obtained FROM sessional_tests st LEFT JOIN sessional_marks sm ON st.id = sm.test_id AND sm.student_id = ? WHERE st.course_id = ?').all(studentId, courseId);
  const stScores = st.map(s => {
    const max = s.max_marks;
    const score = s.marks_obtained || 0;
    return { test_number: s.test_number, score, max, normalized: (score / max) * 100 };
  });
  const stScoresSorted = [...stScores].sort((a, b) => b.normalized - a.normalized);
  const top2St = stScoresSorted.slice(0, 2);
  
  let stAvgNormalized = 0;
  if (top2St.length > 0) {
    const sumNorm = top2St.reduce((sum, s) => sum + s.normalized, 0);
    stAvgNormalized = sumNorm / top2St.length;
  }
  const sessionalSubtotal = (stAvgNormalized / 100) * 15;
  grandTotal += sessionalSubtotal;

  const sessionalScoresAll = [1, 2, 3].map(stNum => {
    const found = stScores.find(s => s.test_number === stNum);
    return {
      test_number: stNum,
      marks: found ? found.score : 0
    };
  });
  const bestSessionalTests = top2St.map(s => ({
    test_number: s.test_number,
    marks: s.score
  }));

  // 4. Attendance
  const student = db.prepare('SELECT attendance_rate FROM students WHERE id = ?').get(studentId);
  const attRate = student ? student.attendance_rate : 0;
  const attConfigs = db.prepare('SELECT * FROM attendance_mark_config WHERE course_id = ?').all(courseId);
  let attendanceSubtotal = 0;
  for (const cfg of attConfigs) {
    if (attRate >= cfg.min_percent && attRate <= cfg.max_percent) {
      attendanceSubtotal = cfg.marks_awarded;
      break;
    }
  }
  grandTotal += attendanceSubtotal;

  // 5. Bonus
  const bonuses = db.prepare('SELECT * FROM bonus_marks WHERE course_id = ? AND student_id = ?').all(courseId, studentId);
  let bonusTotal = bonuses.reduce((sum, b) => sum + b.marks, 0);
  if (bonusTotal > 5) bonusTotal = 5; // Cap per spec (max 5 per student per course)
  grandTotal += bonusTotal;

  // Cap Grand Total at 30
  if (grandTotal > 30) grandTotal = 30;

  const finalGrandTotal = Number(grandTotal.toFixed(2));

  return {
    calculation: {
      summary: {
        assignments: { scaled: Number(assignmentSubtotal.toFixed(2)) },
        quiz: { scaled: Number(quizSubtotal.toFixed(2)) },
        sessional: { scaled: Number(sessionalSubtotal.toFixed(2)) },
        attendance: { 
          percent: attRate, 
          awarded: attendanceSubtotal 
        },
        bonus: { awarded: bonusTotal },
        grandTotal: finalGrandTotal
      },
      components: {
        assignments: { scores: assignmentScores },
        quiz: { scores: quizScoresAll },
        sessional: {
          scores: sessionalScoresAll,
          best_tests: bestSessionalTests
        }
      }
    },
    grandTotal: finalGrandTotal
  };
}

app.get('/api/internal/:courseId/:studentId', requireAuth, (req, res) => {
  const { courseId, studentId } = req.params;
  try {
    const result = calculateStudentInternalMarks(courseId, studentId);
    res.json({
      success: true,
      ...result,
      quizzes: db.prepare('SELECT * FROM quizzes WHERE course_id = ?').all(courseId)
    });
  } catch (err) {
    sendErrorResponse(res, err);
  }
});

app.get('/api/internal/:courseId', requireAuth, (req, res) => {
  const { courseId } = req.params;
  try {
    const enrolled = db.prepare('SELECT DISTINCT student_id FROM student_grades WHERE course_id = ?').all(courseId);
    
    const results = enrolled.map(e => {
      const p = db.prepare('SELECT first_name, last_name, student_id_number FROM students WHERE id = ?').get(e.student_id);
      const calc = calculateStudentInternalMarks(courseId, e.student_id);
      return { studentId: e.student_id, profile: p, ...calc };
    });

    const assignmentsList = enrolled.map(e => {
      const studentId = e.student_id;
      const row = { student_id: studentId };
      for (let i = 1; i <= 5; i++) {
        const assignId = `assign-${courseId}-${i}`;
        const sub = db.prepare('SELECT marks_obtained FROM assignment_submissions WHERE assignment_id = ? AND student_id = ?').get(assignId, studentId);
        row[`a${i}`] = sub ? sub.marks_obtained : null;
      }
      return row;
    });

    const quizzes = db.prepare('SELECT * FROM quizzes WHERE course_id = ?').all(courseId);

    const quizMarks = db.prepare(`
      SELECT qm.id, qm.quiz_id, qm.student_id, qm.marks_obtained AS marks
      FROM quiz_marks qm
      JOIN quizzes q ON qm.quiz_id = q.id
      WHERE q.course_id = ?
    `).all(courseId);

    const sessionals = db.prepare(`
      SELECT st.test_number, sm.student_id, sm.marks_obtained AS marks
      FROM sessional_marks sm
      JOIN sessional_tests st ON sm.test_id = st.id
      WHERE st.course_id = ?
    `).all(courseId);

    const bonus = db.prepare('SELECT * FROM bonus_marks WHERE course_id = ?').all(courseId);
    
    res.json({
      success: true,
      students: results,
      assignments: assignmentsList,
      quizzes: quizzes,
      quizMarks: quizMarks,
      sessionals: sessionals,
      bonus: bonus,
      isLocked: isCourseLocked(courseId),
      is_locked: isCourseLocked(courseId)
    });
  } catch (err) {
    sendErrorResponse(res, err);
  }
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  // basic auth simulation from query params
  const url = new URL(req.url, 'http://localhost');
  const token = url.searchParams.get('token');
  const sessionId = url.searchParams.get('session_id');
  
  if (!token || !sessionId) {
    ws.close();
    return;
  }
  
  // Here we would verify the JWT. For now, since there's no JWT, we just accept if token is provided.
  // In a real app: jwt.verify(token, process.env.JWT_SECRET)
  // Associate ws with faculty
  // mock for now:
  ws.session_id = sessionId;
  ws.faculty_id = 'staff-01'; // Mock association
});

// Setup GPS endpoints
setupGPSAttendance(app, db, wss);

server.listen(PORT, () => {
  console.log(`Express ERP server active and listening on port ${PORT}`);
});

import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Hashing helper using PBKDF2
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

// Initialize physical SQLite database on disk
const dbPath = path.join(__dirname, 'abes_erp.db');
const db = new DatabaseSync(dbPath);

console.log(`Database engine initialized at: ${dbPath}`);

// Force fresh DDL load to populate full working page long mock datasets
db.exec(`
  DROP TABLE IF EXISTS student_grades;
  DROP TABLE IF EXISTS syllabus_progress;
  DROP TABLE IF EXISTS campus_announcements;
  DROP TABLE IF EXISTS system_audit_logs;
  DROP TABLE IF EXISTS invoice_items;
  DROP TABLE IF EXISTS invoices;
  DROP TABLE IF EXISTS attendance;
  DROP TABLE IF EXISTS schedules;
  DROP TABLE IF EXISTS rooms;
  DROP TABLE IF EXISTS courses;
  DROP TABLE IF EXISTS staff;
  DROP TABLE IF EXISTS students;
  DROP TABLE IF EXISTS users;
`);

// 1. Establish DDL Schemas from first principles
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT CHECK(role IN ('admin', 'faculty', 'student')) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL,
    student_id_number TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    date_of_birth TEXT NOT NULL,
    enrollment_status TEXT CHECK(enrollment_status IN ('ACTIVE', 'SUSPENDED', 'ON_LEAVE', 'GRADUATED')) DEFAULT 'ACTIVE',
    program TEXT NOT NULL,
    admission_year INTEGER NOT NULL,
    contact_number TEXT NOT NULL,
    emergency_contact TEXT NOT NULL,
    attendance_rate REAL DEFAULT 100.0,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS staff (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL,
    employee_id_number TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    department TEXT NOT NULL,
    contact_number TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    credits INTEGER NOT NULL,
    department TEXT NOT NULL,
    size INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    building TEXT NOT NULL,
    capacity INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS schedules (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    instructor_id TEXT NOT NULL,
    room_id TEXT NOT NULL,
    day TEXT CHECK(day IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday')) NOT NULL,
    time_window TEXT CHECK(time_window IN ('09:00 - 10:30', '10:30 - 12:00', '13:00 - 14:30', '14:30 - 16:00')) NOT NULL,
    FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY(instructor_id) REFERENCES staff(id) ON DELETE CASCADE,
    FOREIGN KEY(room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    UNIQUE(room_id, day, time_window),
    UNIQUE(instructor_id, day, time_window)
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    schedule_id TEXT NOT NULL,
    status TEXT CHECK(status IN ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED')) NOT NULL,
    recorded_by TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY(schedule_id) REFERENCES schedules(id) ON DELETE CASCADE,
    FOREIGN KEY(recorded_by) REFERENCES staff(id) ON DELETE CASCADE,
    UNIQUE(student_id, schedule_id, timestamp)
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    total_amount REAL NOT NULL,
    amount_paid REAL DEFAULT 0.0,
    status TEXT CHECK(status IN ('PAID', 'UNPAID', 'PENDING')) DEFAULT 'UNPAID',
    issue_date TEXT NOT NULL,
    due_date TEXT NOT NULL,
    receipt_url TEXT,
    FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS invoice_items (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL,
    name TEXT NOT NULL,
    amount REAL NOT NULL,
    FOREIGN KEY(invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS system_audit_logs (
    id TEXT PRIMARY KEY,
    user_email TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS student_grades (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    course_id TEXT NOT NULL,
    marks_obtained INTEGER NOT NULL,
    grade_letter TEXT NOT NULL,
    semester INTEGER NOT NULL,
    FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE(student_id, course_id, semester)
  );

  CREATE TABLE IF NOT EXISTS syllabus_progress (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    unit_name TEXT NOT NULL,
    coverage_percentage REAL DEFAULT 0.0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS campus_announcements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    urgency TEXT CHECK(urgency IN ('CRITICAL', 'NOTICE', 'INFO')) DEFAULT 'INFO',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
  CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id);
  CREATE INDEX IF NOT EXISTS idx_attendance_schedule_id ON attendance(schedule_id);
  CREATE INDEX IF NOT EXISTS idx_schedules_course_id ON schedules(course_id);
  CREATE INDEX IF NOT EXISTS idx_student_grades_student_id ON student_grades(student_id);
  CREATE INDEX IF NOT EXISTS idx_invoices_student_id ON invoices(student_id);
  CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
`);

// 2. Prepare statements
const insertUser = db.prepare(`INSERT OR IGNORE INTO users (id, email, password, role) VALUES (?, ?, ?, ?)`);
const insertStudent = db.prepare(`
  INSERT OR IGNORE INTO students (id, user_id, student_id_number, first_name, last_name, date_of_birth, enrollment_status, program, admission_year, contact_number, emergency_contact, attendance_rate)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const insertStaff = db.prepare(`
  INSERT OR IGNORE INTO staff (id, user_id, employee_id_number, first_name, last_name, department, contact_number)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);
const insertCourse = db.prepare(`INSERT OR IGNORE INTO courses (id, code, title, credits, department, size) VALUES (?, ?, ?, ?, ?, ?)`);
const insertRoom = db.prepare(`INSERT OR IGNORE INTO rooms (id, name, building, capacity) VALUES (?, ?, ?, ?)`);
const insertSchedule = db.prepare(`
  INSERT OR IGNORE INTO schedules (id, course_id, instructor_id, room_id, day, time_window)
  VALUES (?, ?, ?, ?, ?, ?)
`);
const insertInvoice = db.prepare(`
  INSERT OR IGNORE INTO invoices (id, student_id, total_amount, amount_paid, status, issue_date, due_date, receipt_url)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);
const insertInvoiceItem = db.prepare(`INSERT OR IGNORE INTO invoice_items (id, invoice_id, name, amount) VALUES (?, ?, ?, ?)`);
const insertGrade = db.prepare(`
  INSERT OR IGNORE INTO student_grades (id, student_id, course_id, marks_obtained, grade_letter, semester)
  VALUES (?, ?, ?, ?, ?, ?)
`);
const insertAudit = db.prepare(`INSERT OR IGNORE INTO system_audit_logs (id, user_email, action, details) VALUES (?, ?, ?, ?)`);
const insertSyllabus = db.prepare(`
  INSERT OR IGNORE INTO syllabus_progress (id, course_id, unit_name, coverage_percentage)
  VALUES (?, ?, ?, ?)
`);
const insertAnnouncement = db.prepare(`
  INSERT OR IGNORE INTO campus_announcements (id, title, content, urgency)
  VALUES (?, ?, ?, ?)
`);

// 3. Seed Users & staff
insertUser.run('u-admin', 'admin@abes.edu', hashPassword('admin123'), 'admin');
insertUser.run('u-sandeep', 'sandeep@abes.edu', hashPassword('sandeep123'), 'faculty');
insertUser.run('u-meenakshi', 'meenakshi@abes.edu', hashPassword('meenakshi123'), 'faculty');
insertUser.run('u-alok', 'alok@abes.edu', hashPassword('alok123'), 'faculty');

insertStaff.run('staff-01', 'u-sandeep', 'EMP-ABES-101', 'Dr. Sandeep', 'Sharma', 'Computer Science & Engineering', '+91 98111 22233');
insertStaff.run('staff-02', 'u-meenakshi', 'EMP-ABES-104', 'Prof. Meenakshi', 'Verma', 'Information Technology', '+91 98111 22244');
insertStaff.run('staff-03', 'u-alok', 'EMP-ABES-109', 'Dr. Alok', 'Gupta', 'Computer Science & Engineering', '+91 98111 22255');

// 4. Seed massive realistic scholars dataset (12 Student Profiles for rich directory scrolls!)
const studentSeedData = [
  { id: 'stud-01', uid: 'u-liam', email: 'liam@abes.edu', roll: '2200320100045', first: 'Liam', last: 'Sharma', dob: '2004-05-14', status: 'ACTIVE', program: 'Computer Science & Engineering', year: 2022, contact: '+91 98765 43210', emergency: 'Anil Sharma (Father) - +91 98765 43211', attendance: 88.0 },
  { id: 'stud-02', uid: 'u-aanya', email: 'aanya@abes.edu', roll: '2200320100088', first: 'Aanya', last: 'Verma', dob: '2004-11-20', status: 'ACTIVE', program: 'Computer Science & Engineering', year: 2022, contact: '+91 99112 23344', emergency: 'Suman Verma (Mother) - +91 99112 23345', attendance: 74.0 },
  { id: 'stud-03', uid: 'u-dev', email: 'dev@abes.edu', roll: '2200320100099', first: 'Dev', last: 'Malhotra', dob: '2004-03-12', status: 'ACTIVE', program: 'Computer Science & Engineering', year: 2022, contact: '+91 98123 45678', emergency: 'K. Malhotra (Father) - +91 98123 45679', attendance: 92.5 },
  { id: 'stud-04', uid: 'u-priya', email: 'priya@abes.edu', roll: '2200320100101', first: 'Priya', last: 'Nair', dob: '2004-08-18', status: 'ACTIVE', program: 'Computer Science & Engineering', year: 2022, contact: '+91 99887 76655', emergency: 'Radha Nair (Mother) - +91 99887 76656', attendance: 81.2 },
  { id: 'stud-05', uid: 'u-arjun', email: 'arjun@abes.edu', roll: '2200320100115', first: 'Arjun', last: 'Mehta', dob: '2004-01-25', status: 'ACTIVE', program: 'Computer Science & Engineering', year: 2022, contact: '+91 98555 44433', emergency: 'J. Mehta (Father) - +91 98555 44434', attendance: 65.5 },
  { id: 'stud-06', uid: 'u-ananya', email: 'ananya@abes.edu', roll: '2200320100120', first: 'Ananya', last: 'Sinha', dob: '2004-07-22', status: 'ACTIVE', program: 'Computer Science & Engineering', year: 2022, contact: '+91 97777 66655', emergency: 'R. Sinha (Father) - +91 97777 66656', attendance: 94.0 },
  { id: 'stud-07', uid: 'u-rohan', email: 'rohan@abes.edu', roll: '2200320100133', first: 'Rohan', last: 'Gupta', dob: '2004-12-05', status: 'ACTIVE', program: 'Computer Science & Engineering', year: 2022, contact: '+91 96666 55544', emergency: 'S. Gupta (Father) - +91 96666 55545', attendance: 78.5 },
  { id: 'stud-08', uid: 'u-kartik', email: 'kartik@abes.edu', roll: '2200320100142', first: 'Kartik', last: 'Joshi', dob: '2004-09-14', status: 'ACTIVE', program: 'Computer Science & Engineering', year: 2022, contact: '+91 95555 44422', emergency: 'M. Joshi (Father) - +91 95555 44423', attendance: 89.0 },
  { id: 'stud-09', uid: 'u-ishaan', email: 'ishaan@abes.edu', roll: '2200320100155', first: 'Ishaan', last: 'Reddy', dob: '2004-04-20', status: 'ACTIVE', program: 'Computer Science & Engineering', year: 2022, contact: '+91 94444 33322', emergency: 'V. Reddy (Father) - +91 94444 33323', attendance: 72.0 },
  { id: 'stud-10', uid: 'u-meera', email: 'meera@abes.edu', roll: '2200320100168', first: 'Meera', last: 'Deshmukh', dob: '2004-10-30', status: 'ACTIVE', program: 'Computer Science & Engineering', year: 2022, contact: '+91 93333 22211', emergency: 'A. Deshmukh (Father) - +91 93333 22212', attendance: 97.2 },
  { id: 'stud-11', uid: 'u-kabir', email: 'kabir@abes.edu', roll: '2200320100174', first: 'Kabir', last: 'Singh', dob: '2004-02-17', status: 'ACTIVE', program: 'Computer Science & Engineering', year: 2022, contact: '+91 92222 11100', emergency: 'B. Singh (Father) - +91 92222 11101', attendance: 84.4 },
  { id: 'stud-12', uid: 'u-diya', email: 'diya@abes.edu', roll: '2200320100189', first: 'Diya', last: 'Patel', dob: '2004-06-25', status: 'ACTIVE', program: 'Computer Science & Engineering', year: 2022, contact: '+91 91111 00099', emergency: 'N. Patel (Mother) - +91 91111 00098', attendance: 76.8 }
];

studentSeedData.forEach(s => {
  insertUser.run(s.uid, s.email, hashPassword(s.first.toLowerCase() + '123'), 'student');
  insertStudent.run(s.id, s.uid, s.roll, s.first, s.last, s.dob, s.status, s.program, s.year, s.contact, s.emergency, s.attendance);
});

// 5. Seed active institutional academic modules
insertCourse.run('cour-01', 'CS-601', 'Automata & Compiler Design', 4, 'CSE', 38);
insertCourse.run('cour-02', 'CS-602', 'Database Management Systems', 3, 'CSE', 45);
insertCourse.run('cour-03', 'CS-603', 'Information Security Systems', 4, 'CSE', 30);
insertCourse.run('cour-04', 'CS-604', 'Web Engineering Frameworks', 3, 'CSE', 42);

// 6. Seed active classrooms
insertRoom.run('room-01', 'B-Block Lab 3', 'B-Block Computer Center', 40);
insertRoom.run('room-02', 'CSE Room 102', 'Academic Block 1', 60);
insertRoom.run('room-03', 'B-Block Lab 5', 'B-Block Center', 45);

// 7. Seed active Master Schedule Matrix blocks
insertSchedule.run('sched-01', 'cour-01', 'staff-01', 'room-02', 'Monday', '09:00 - 10:30');
insertSchedule.run('sched-02', 'cour-02', 'staff-01', 'room-01', 'Monday', '10:30 - 12:00');
insertSchedule.run('sched-03', 'cour-03', 'staff-02', 'room-02', 'Monday', '13:00 - 14:30');
insertSchedule.run('sched-04', 'cour-04', 'staff-03', 'room-03', 'Tuesday', '09:00 - 10:30');
insertSchedule.run('sched-05', 'cour-01', 'staff-01', 'room-02', 'Wednesday', '10:30 - 12:00');
insertSchedule.run('sched-06', 'cour-03', 'staff-02', 'room-01', 'Wednesday', '14:30 - 16:00');
insertSchedule.run('sched-07', 'cour-02', 'staff-03', 'room-03', 'Thursday', '13:00 - 14:30');
insertSchedule.run('sched-08', 'cour-04', 'staff-01', 'room-02', 'Friday', '09:00 - 10:30');
insertSchedule.run('sched-09', 'cour-03', 'staff-03', 'room-01', 'Friday', '10:30 - 12:00');

// 8. Seed outstanding Tuition Fees statements & ledger receipts
const invoiceSeedData = [
  { id: 'inv-01', studId: 'stud-01', total: 64500.00, paid: 64500.00, status: 'PAID', issue: '2026-01-10', due: '2026-02-15' },
  { id: 'inv-02', studId: 'stud-01', total: 8500.00, paid: 0.00, status: 'UNPAID', issue: '2026-04-05', due: '2026-08-30' },
  { id: 'inv-03', studId: 'stud-02', total: 58000.00, paid: 20000.00, status: 'UNPAID', issue: '2026-01-10', due: '2026-02-15' },
  { id: 'inv-04', studId: 'stud-03', total: 64500.00, paid: 64500.00, status: 'PAID', issue: '2026-01-10', due: '2026-02-15' },
  { id: 'inv-05', studId: 'stud-04', total: 64500.00, paid: 0.00, status: 'PENDING', issue: '2026-01-10', due: '2026-02-15' },
  { id: 'inv-06', studId: 'stud-05', total: 58000.00, paid: 0.00, status: 'UNPAID', issue: '2026-01-10', due: '2026-02-15' },
  { id: 'inv-07', studId: 'stud-06', total: 64500.00, paid: 64500.00, status: 'PAID', issue: '2026-01-10', due: '2026-02-15' },
  { id: 'inv-08', studId: 'stud-07', total: 64500.00, paid: 64500.00, status: 'PAID', issue: '2026-01-10', due: '2026-02-15' },
  { id: 'inv-09', studId: 'stud-08', total: 58000.00, paid: 58000.00, status: 'PAID', issue: '2026-01-10', due: '2026-02-15' },
  { id: 'inv-10', studId: 'stud-09', total: 64500.00, paid: 0.00, status: 'UNPAID', issue: '2026-01-10', due: '2026-02-15' },
  { id: 'inv-11', studId: 'stud-10', total: 64500.00, paid: 64500.00, status: 'PAID', issue: '2026-01-10', due: '2026-02-15' },
  { id: 'inv-12', studId: 'stud-11', total: 64500.00, paid: 0.00, status: 'PENDING', issue: '2026-01-10', due: '2026-02-15' }
];

invoiceSeedData.forEach(inv => {
  insertInvoice.run(inv.id, inv.studId, inv.total, inv.paid, inv.status, inv.issue, inv.due, null);
  if (inv.total > 50000) {
    insertInvoiceItem.run('item-' + inv.id + '-1', inv.id, 'Academic Tuition (6th Sem)', 55000.00);
    insertInvoiceItem.run('item-' + inv.id + '-2', inv.id, 'Computer Laboratory Charge', 6500.00);
    insertInvoiceItem.run('item-' + inv.id + '-3', inv.id, 'University Examinations Fee', 3000.00);
  } else {
    insertInvoiceItem.run('item-' + inv.id + '-1', inv.id, 'ABES Hostel Maintenance Fee', 7500.00);
    insertInvoiceItem.run('item-' + inv.id + '-2', inv.id, 'Library Outstanding Late Charge', 1000.00);
  }
});

// 9. Seed certified GPA transcripts list
const gradeSeedData = [
  { id: 'g-1', studId: 'stud-01', courId: 'cour-01', marks: 92, grade: 'A+', sem: 6 },
  { id: 'g-2', studId: 'stud-01', courId: 'cour-02', marks: 88, grade: 'A', sem: 6 },
  { id: 'g-3', studId: 'stud-01', courId: 'cour-03', marks: 84, grade: 'B+', sem: 6 },
  
  { id: 'g-4', studId: 'stud-02', courId: 'cour-01', marks: 78, grade: 'B', sem: 6 },
  { id: 'g-5', studId: 'stud-02', courId: 'cour-02', marks: 85, grade: 'A', sem: 6 },
  { id: 'g-6', studId: 'stud-02', courId: 'cour-03', marks: 96, grade: 'A+', sem: 6 },
  
  { id: 'g-7', studId: 'stud-03', courId: 'cour-01', marks: 95, grade: 'A+', sem: 6 },
  { id: 'g-8', studId: 'stud-03', courId: 'cour-02', marks: 92, grade: 'A+', sem: 6 },
  
  { id: 'g-9', studId: 'stud-04', courId: 'cour-01', marks: 82, grade: 'B+', sem: 6 },
  { id: 'g-10', studId: 'stud-04', courId: 'cour-02', marks: 80, grade: 'B', sem: 6 },
  
  { id: 'g-11', studId: 'stud-05', courId: 'cour-01', marks: 68, grade: 'C', sem: 6 },
  { id: 'g-12', studId: 'stud-05', courId: 'cour-03', marks: 62, grade: 'D', sem: 6 }
];

gradeSeedData.forEach(g => {
  insertGrade.run(g.id, g.studId, g.courId, g.marks, g.grade, g.sem);
});

// 10. Seed active system security audit trails (10+ Logs for scrollable tables!)
insertAudit.run('audit-01', 'system@abes.edu', 'SYSTEM_INITIALIZATION', 'ABES GO DDL relational engines loaded successfully.');
insertAudit.run('audit-02', 'admin@abes.edu', 'SELECTION_SEED', 'Seeded initial academic, faculty, and invoice assets.');
insertAudit.run('audit-03', 'admin@abes.edu', 'USER_ENROLLMENT', 'Bulk directory import parsed: Seeded 12 students profiles.');
insertAudit.run('audit-04', 'sandeep@abes.edu', 'ROSTER_COMMIT', 'Committed attendance roster list for CS-601 block.');
insertAudit.run('audit-05', 'admin@abes.edu', 'AI_SOLVER_RUN', 'Executed recursive AI CSP CSP backtracking solver schedule sweep.');
insertAudit.run('audit-06', 'system@abes.edu', 'DB_VACUUM', 'SQLite physical vacuums completed in 1.48 milliseconds.');
insertAudit.run('audit-07', 'admin@abes.edu', 'BURSAR_AUDIT', 'Approved fee statement verification receipts for inv-01.');
insertAudit.run('audit-08', 'sandeep@abes.edu', 'GRADE_POST', 'Posted digital term grades for Liam Sharma (CS-601: 92%).');
insertAudit.run('audit-09', 'meenakshi@abes.edu', 'SYLLABUS_UPDATE', 'Updated IT-601 Unit 1 syllabus completion status to 100%.');
insertAudit.run('audit-10', 'admin@abes.edu', 'BULLETIN_POST', 'Broadcast announcement alert [CRITICAL]: Odd Semester Timetables Released.');
insertAudit.run('audit-11', 'system@abes.edu', 'GEOFENCE_SYNC', 'Synchronized real-time GPS blueprint anchors inside Room 102.');
insertAudit.run('audit-12', 'admin@abes.edu', 'INVOICE_GEN', 'Generated outstanding fee statements (inv-01 to inv-12).');

// 11. Seed concrete syllabus progress
const syllabusSeedData = [
  { id: 'syl-01', courId: 'cour-01', unit: 'Unit 1: Introduction to Compilers & Lexical Analysis', cov: 100.0 },
  { id: 'syl-02', courId: 'cour-01', unit: 'Unit 2: Parsing & Syntax Directed Translation', cov: 75.0 },
  { id: 'syl-03', courId: 'cour-01', unit: 'Unit 3: Intermediate Code Generation', cov: 40.0 },
  { id: 'syl-04', courId: 'cour-01', unit: 'Unit 4: Code Optimization & Run-Time Environments', cov: 0.0 },
  
  { id: 'syl-05', courId: 'cour-02', unit: 'Unit 1: Database Models & Relational Algebra', cov: 100.0 },
  { id: 'syl-06', courId: 'cour-02', unit: 'Unit 2: Structured Query Language (SQL)', cov: 90.0 },
  { id: 'syl-07', courId: 'cour-02', unit: 'Unit 3: Transaction Processing & Recovery Protocols', cov: 15.0 },
  
  { id: 'syl-08', courId: 'cour-03', unit: 'Unit 1: Symmetric Key Ciphers (DES/AES)', cov: 100.0 },
  { id: 'syl-09', courId: 'cour-03', unit: 'Unit 2: Public Key Ciphers (RSA/ECC)', cov: 50.0 }
];

syllabusSeedData.forEach(s => {
  insertSyllabus.run(s.id, s.courId, s.unit, s.cov);
});

// 12. Seed concrete campus announcements
insertAnnouncement.run('ann-01', 'Odd Semester Timetables Released', 'The Odd Semester Examination Schedule has been uploaded to the database registries.', 'CRITICAL');
insertAnnouncement.run('ann-02', 'B-Block Server Maintenance', 'Access to computer terminal pools in Block-B is suspended this Saturday 14:00 - 18:00 due to network optimization.', 'NOTICE');
insertAnnouncement.run('ann-03', 'TECH-FEST 2026 Active', 'Registrations are open for the annual technological engineering symposium. Contact HOD CSE for entries.', 'INFO');

console.log('Extended database tables DDL loaded and Phase II assets seeded.');

export { db };

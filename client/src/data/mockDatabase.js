// ABES GO - Mock Database & Algorithmic Constraint Engines

export const initialStudents = [
  {
    id: "stud-01",
    studentIdNumber: "2200320100045",
    firstName: "Liam",
    lastName: "Sharma",
    dateOfBirth: "2004-05-14",
    enrollmentStatus: "ACTIVE",
    program: "Computer Science & Engineering",
    admissionYear: 2022,
    contactNumber: "+91 98765 43210",
    emergencyContact: "Anil Sharma (Father) - +91 98765 43211",
    attendanceRate: 88,
  },
  {
    id: "stud-02",
    studentIdNumber: "2200320100088",
    firstName: "Aanya",
    lastName: "Verma",
    dateOfBirth: "2004-11-20",
    enrollmentStatus: "ACTIVE",
    program: "Information Technology",
    admissionYear: 2022,
    contactNumber: "+91 99112 23344",
    emergencyContact: "Suman Verma (Mother) - +91 99112 23345",
    attendanceRate: 74,
  },
  {
    id: "stud-03",
    studentIdNumber: "2200320130012",
    firstName: "Kabir",
    lastName: "Malhotra",
    dateOfBirth: "2003-08-05",
    enrollmentStatus: "ACTIVE",
    program: "Electronics & Communication",
    admissionYear: 2022,
    contactNumber: "+91 95554 43322",
    emergencyContact: "R.K. Malhotra (Father) - +91 95554 43323",
    attendanceRate: 92,
  },
  {
    id: "stud-04",
    studentIdNumber: "2200320100112",
    firstName: "Riya",
    lastName: "Gupta",
    dateOfBirth: "2005-02-28",
    enrollmentStatus: "SUSPENDED",
    program: "Computer Science & Engineering",
    admissionYear: 2023,
    contactNumber: "+91 88877 66554",
    emergencyContact: "K.C. Gupta (Father) - +91 88877 66555",
    attendanceRate: 45,
  },
  {
    id: "stud-05",
    studentIdNumber: "2200320400019",
    firstName: "Arjun",
    lastName: "Singh",
    dateOfBirth: "2004-03-12",
    enrollmentStatus: "ACTIVE",
    program: "Mechanical Engineering",
    admissionYear: 2022,
    contactNumber: "+91 77766 55443",
    emergencyContact: "B.P. Singh (Father) - +91 77766 55444",
    attendanceRate: 81,
  }
];

export const initialStaff = [
  {
    id: "staff-01",
    employeeIdNumber: "EMP-ABES-101",
    firstName: "Dr. Sandeep",
    lastName: "Sharma",
    department: "Computer Science & Engineering",
    contactNumber: "+91 98111 22233",
  },
  {
    id: "staff-02",
    employeeIdNumber: "EMP-ABES-104",
    firstName: "Prof. Meenakshi",
    lastName: "Verma",
    department: "Information Technology",
    contactNumber: "+91 98111 22244",
  },
  {
    id: "staff-03",
    employeeIdNumber: "EMP-ABES-108",
    firstName: "Dr. Pankaj",
    lastName: "Malik",
    department: "Electronics & Communication",
    contactNumber: "+91 98111 22255",
  }
];

export const initialRooms = [
  { id: "room-01", name: "B-Block Lab 3", building: "B-Block Computer Center", capacity: 40 },
  { id: "room-02", name: "CSE Room 102", building: "Academic Block 1", capacity: 60 },
  { id: "room-03", name: "ECE Seminar Hall", building: "Academic Block 2", capacity: 120 },
  { id: "room-04", name: "ME Lecture Theater", building: "Mechanical Block", capacity: 50 },
];

export const initialCourses = [
  { id: "cour-01", code: "CS-601", title: "Automata & Compiler Design", credits: 4, department: "CSE", size: 38 },
  { id: "cour-02", code: "CS-602", title: "Database Management Systems", credits: 3, department: "CSE", size: 45 },
  { id: "cour-03", code: "IT-601", title: "Cryptography & Network Security", credits: 4, department: "IT", size: 30 },
  { id: "cour-04", code: "EC-603", title: "Embedded Systems Laboratory", credits: 2, department: "ECE", size: 55 },
  { id: "cour-05", code: "ME-602", title: "Heat & Mass Transfer Processes", credits: 4, department: "ME", size: 48 },
];

// Pre-seeded Calendar Schedules
// Time scale is represented by hour intervals for scheduling simplicity:
// "09:00 - 10:30", "10:30 - 12:00", "13:00 - 14:30", "14:30 - 16:00"
export const initialSchedules = [
  {
    id: "sched-01",
    courseId: "cour-01",
    instructorId: "staff-01",
    roomId: "room-02",
    day: "Monday",
    timeWindow: "09:00 - 10:30",
  },
  {
    id: "sched-02",
    courseId: "cour-02",
    instructorId: "staff-01",
    roomId: "room-01",
    day: "Monday",
    timeWindow: "10:30 - 12:00",
  },
  {
    id: "sched-03",
    courseId: "cour-03",
    instructorId: "staff-02",
    roomId: "room-02",
    day: "Monday",
    timeWindow: "13:00 - 14:30",
  },
  {
    id: "sched-04",
    courseId: "cour-04",
    instructorId: "staff-03",
    roomId: "room-03",
    day: "Tuesday",
    timeWindow: "09:00 - 10:30",
  }
];

// Invoices seed balances
export const initialInvoices = [
  {
    id: "inv-01",
    studentId: "stud-01",
    totalAmount: 64500.00,
    amountPaid: 64500.00,
    status: "PAID",
    issueDate: "2026-01-10",
    dueDate: "2026-02-15",
    items: [
      { name: "Academic Tuition (6th Sem)", amount: 55000.00 },
      { name: "Computer Laboratory Charge", amount: 6500.00 },
      { name: "University Examinations Fee", amount: 3000.00 },
    ],
    receiptUrl: null,
  },
  {
    id: "inv-02",
    studentId: "stud-01",
    totalAmount: 8500.00,
    amountPaid: 0.00,
    status: "OVERDUE",
    issueDate: "2026-04-05",
    dueDate: "2026-05-15",
    items: [
      { name: "ABES Hostel Maintenance Fee", amount: 7500.00 },
      { name: "Library Outstanding Late Book Charge", amount: 1000.00 },
    ],
    receiptUrl: null,
  },
  {
    id: "inv-03",
    studentId: "stud-02",
    totalAmount: 58000.00,
    amountPaid: 20000.00,
    status: "UNPAID",
    issueDate: "2026-01-10",
    dueDate: "2026-02-15",
    items: [
      { name: "Academic Tuition (6th Sem)", amount: 55000.00 },
      { name: "University Registration Charge", amount: 3000.00 },
    ],
    receiptUrl: null,
  }
];

// Pre-seeded active logs for attendance tracking
export const initialAttendance = [
  { id: "att-01", studentId: "stud-01", scheduleId: "sched-01", status: "PRESENT", timestamp: "2026-05-25T09:12:00Z" },
  { id: "att-02", studentId: "stud-02", scheduleId: "sched-01", status: "ABSENT", timestamp: "2026-05-25T09:15:00Z" },
  { id: "att-03", studentId: "stud-03", scheduleId: "sched-01", status: "PRESENT", timestamp: "2026-05-25T09:11:00Z" }
];

/* 
  ALGORITHMIC CONFLICT DETECTION ENGINE (Phase 3)
  Validates schedule placement configurations.
*/
export function validateSchedule(newSlot, allSchedules, allCourses, allRooms) {
  const violations = [];
  const { id, courseId, instructorId, roomId, day, timeWindow } = newSlot;

  // Fetch course and room details
  const targetCourse = allCourses.find(c => c.id === courseId);
  const targetRoom = allRooms.find(r => r.id === roomId);

  // Check schedules for collisions
  allSchedules.forEach(sched => {
    // Skip validating against itself when updating
    if (sched.id === id) return;

    const sameDay = sched.day === day;
    const sameTime = sched.timeWindow === timeWindow;

    if (sameDay && sameTime) {
      // Hard Constraint 1: Room Double-Booking
      if (sched.roomId === roomId) {
        const collidingCourse = allCourses.find(c => c.id === sched.courseId);
        violations.push({
          type: "HARD_ROOM_DOUBLE_BOOKING",
          isHard: true,
          message: `Room "${targetRoom.name}" is already booked for course "${collidingCourse?.title || 'Another Course'}" at this time.`
        });
      }

      // Hard Constraint 2: Faculty Clash
      if (sched.instructorId === instructorId) {
        const collidingCourse = allCourses.find(c => c.id === sched.courseId);
        violations.push({
          type: "HARD_FACULTY_CLASH",
          isHard: true,
          message: `Instructor is already teaching course "${collidingCourse?.title || 'Another Course'}" at this time.`
        });
      }
    }
  });

  // Hard Constraint 3: Room Capacity
  if (targetCourse && targetRoom && targetCourse.size > targetRoom.capacity) {
    violations.push({
      type: "HARD_ROOM_CAPACITY",
      isHard: true,
      message: `Course cohort size (${targetCourse.size}) exceeds physical room capacity for "${targetRoom.name}" (${targetRoom.capacity} seats).`
    });
  }

  // Soft Constraint 1: Back-to-Back Limit (Max 2 consecutive hours)
  const instructorSlotsSameDay = allSchedules.filter(
    s => s.instructorId === instructorId && s.day === day && s.id !== id
  );
  
  if (instructorSlotsSameDay.length >= 2) {
    violations.push({
      type: "SOFT_BACK_TO_BACK_LIMIT",
      isHard: false,
      message: "Warning: Instructor schedule has more than 2 classes scheduled on this day."
    });
  }

  return {
    isValid: violations.filter(v => v.isHard).length === 0,
    violations
  };
}

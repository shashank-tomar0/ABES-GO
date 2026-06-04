import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, RefreshCw, X, User, Key, AlertCircle, 
  Users, Calendar, DollarSign, Bell, Lock, 
  CheckSquare, Award, List, QrCode, LogOut, CheckCircle, 
  Eye, Shield, FileText, Download, Printer, CreditCard, 
  Smartphone, Map, TrendingUp, UserCheck, AlertTriangle, Sliders
} from 'lucide-react';

import LandingPage from './components/LandingPage';
import LoginModal from './components/LoginModal';
import AdminConsole from './components/AdminConsole';
import FacultyConsole from './components/FacultyConsole';
import StudentConsole from './components/StudentConsole';
import { solveTimetableCSP } from './services/timetable';

const API_BASE = typeof window !== 'undefined' && window.location.hostname 
  ? `http://${window.location.hostname}:3001/api` 
  : `${import.meta.env.VITE_API_URL}`;

export default function App() {
  // --- SESSION & USER STATES ---
  const [currentUser, setCurrentUser] = useState(null); // { id, email, role }
  const [currentProfile, setCurrentProfile] = useState(null); // Student or Staff details
  const [showDemoControlRoom, setShowDemoControlRoom] = useState(false);
  const [loginEmail, setLoginEmail] = useState('admin@abes.edu'); 
  const [loginPassword, setLoginPassword] = useState('admin123');
  const [loginError, setLoginError] = useState('');
  const [authenticating, setAuthenticating] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [currentLang, setCurrentLang] = useState('EN'); // 'EN', 'HI', 'ES'

  // --- PLATFORM CORE DATA ---
  const [students, setStudents] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [rooms, setRooms] = useState([
    { id: "room-01", name: "B-Block Lab 3", building: "B-Block Computer Center", capacity: 40 },
    { id: "room-02", name: "CSE Room 102", building: "Academic Block 1", capacity: 60 }
  ]);
  const [courses, setCourses] = useState([
    { id: "cour-01", code: "CS-601", title: "Automata & Compiler Design", credits: 4, department: "CSE", size: 38 },
    { id: "cour-02", code: "CS-602", title: "Database Management Systems", credits: 3, department: "CSE", size: 45 },
    { id: "cour-03", code: "IT-601", title: "Cryptography & Network Security", credits: 4, department: "IT", size: 30 }
  ]);
  const [staff, setStaff] = useState([
    { id: "staff-01", firstName: "Dr. Sandeep", lastName: "Sharma", employeeIdNumber: "EMP-ABES-101" },
    { id: "staff-02", firstName: "Prof. Meenakshi", lastName: "Verma", employeeIdNumber: "EMP-ABES-104" }
  ]);

  // --- ADVANCED ENTERPRISE STATES ---
  const [systemAuditLogs, setSystemAuditLogs] = useState([]);
  const [allGradesList, setAllGradesList] = useState([]);
  const [studentGradesData, setStudentGradesData] = useState({ grades: [], sgpa: '8.50', totalCredits: 0 });
  const [solvingAiSchedules, setSolvingAiSchedules] = useState(false);
  const [syllabusList, setSyllabusList] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  // Form states
  const [announcementForm, setAnnouncementForm] = useState({ title: '', content: '', urgency: 'INFO' });
  const [searchQuery, setSearchQuery] = useState('');
  const [studentForm, setStudentForm] = useState({
    firstName: '', lastName: '', studentIdNumber: '', program: 'Computer Science & Engineering',
    dateOfBirth: '', contactNumber: '', emergencyContact: ''
  });
  const [scheduleForm, setScheduleForm] = useState({
    courseId: 'cour-01', instructorId: 'staff-01', roomId: 'room-01',
    day: 'Monday', timeWindow: '09:00 - 10:30'
  });

  const [timetableConflict, setTimetableConflict] = useState(null);
  const [csvTextData, setCsvTextData] = useState('2200320100991,Rohan,Mishra,2005-06-12,+91 99998 88877\n2200320100992,Sneha,Kapoor,2004-09-18,+91 88877 66554');
  const [csvImporting, setCsvImporting] = useState(false);

  // Student specific views
  const [studentTab, setStudentTab] = useState('home');
  const [studentAttendanceLogs, setStudentAttendanceLogs] = useState([]);
  const [pdfBillInvoice, setPdfBillInvoice] = useState(null);
  const [uploadInvoiceId, setUploadInvoiceId] = useState(null);
  const [gpsSlider, setGpsSlider] = useState(5);
  const [radarActive, setRadarActive] = useState(false);

  // Faculty specific views
  const [facultyTab, setFacultyTab] = useState('roster');
  const [activeLectureSchedule, setActiveLectureSchedule] = useState('sched-01');
  const [facultyRosterList, setFacultyRosterList] = useState({});
  const [qrSpinning, setQrSpinning] = useState(false);
  const [qrTokenValue, setQrTokenValue] = useState('TOKEN-INIT-882');

  // GPA simulator states
  const [whatIfMarks, setWhatIfMarks] = useState({});
  const [checkoutInvoice, setCheckoutInvoice] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentCardNum, setPaymentCardNum] = useState('');
  const [paymentCardName, setPaymentCardName] = useState('');
  const [paymentUpiId, setPaymentUpiId] = useState('liam@upi');
  const [gradingCourseId, setGradingCourseId] = useState('cour-01');
  const [gradingStudentMarks, setGradingStudentMarks] = useState({});
  const [gradingStudentLoading, setGradingStudentLoading] = useState({});
  const [gradingStudentSuccess, setGradingStudentSuccess] = useState({});

  // Recruiter verifier states
  const [employerVerifyId, setEmployerVerifyId] = useState('');
  const [employerVerifyResult, setEmployerVerifyResult] = useState(null);
  const [employerVerifying, setEmployerVerifying] = useState(false);
  const [employerVerifyError, setEmployerVerifyError] = useState('');

  // Connectivity states
  const [isOnline, setIsOnline] = useState(true);
  const [localDirtyQueue, setLocalDirtyQueue] = useState(() => {
    try {
      const saved = localStorage.getItem('abes_go_offline_queue');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [syncing, setSyncing] = useState(false);
  const [syncProgressLogs, setSyncProgressLogs] = useState([]);
  const [notifications, setNotifications] = useState([
    { id: 1, type: 'success', message: 'ABES GO Server connection established.', time: 'Just Now' }
  ]);

  // Sync effect
  useEffect(() => {
    try {
      localStorage.setItem('abes_go_offline_queue', JSON.stringify(localDirtyQueue));
    } catch (e) {
      console.error('Failed to save offline sync queue:', e);
    }
  }, [localDirtyQueue]);

  // Toast Notifications
  const pushNotification = (type, message) => {
    setNotifications(prev => [
      { id: Date.now(), type, message, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
      ...prev
    ]);
  };

  // Sync operations database reconciliation
  const fetchData = async () => {
    if (!isOnline) return;
    try {
      const studRes = await fetch(`${API_BASE}/students`);
      if (studRes.ok) setStudents(await studRes.json());

      const schedRes = await fetch(`${API_BASE}/schedules`);
      if (schedRes.ok) setSchedules(await schedRes.json());

      const invRes = await fetch(`${API_BASE}/billing/invoices`);
      if (invRes.ok) setInvoices(await invRes.json());

      const auditRes = await fetch(`${API_BASE}/audit-logs`);
      if (auditRes.ok) setSystemAuditLogs(await auditRes.json());

      const sylRes = await fetch(`${API_BASE}/syllabus`);
      if (sylRes.ok) setSyllabusList(await sylRes.json());

      const annRes = await fetch(`${API_BASE}/announcements`);
      if (annRes.ok) setAnnouncements(await annRes.json());

      const gradesRes = await fetch(`${API_BASE}/grades`);
      if (gradesRes.ok) setAllGradesList(await gradesRes.json());

      const courseRes = await fetch(`${API_BASE}/courses`);
      if (courseRes.ok) setCourses(await courseRes.json());

      const roomRes = await fetch(`${API_BASE}/rooms`);
      if (roomRes.ok) setRooms(await roomRes.json());

      const staffRes = await fetch(`${API_BASE}/staff`);
      if (staffRes.ok) {
        const staffData = await staffRes.json();
        const mappedStaff = staffData.map(s => ({
          id: s.id,
          firstName: s.first_name,
          lastName: s.last_name,
          employeeIdNumber: s.employee_id_number,
          department: s.department,
          contactNumber: s.contact_number
        }));
        setStaff(mappedStaff);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser, isOnline]);

  // Load student metrics
  useEffect(() => {
    const loadStudentMetrics = async () => {
      if (!currentUser || currentUser.role !== 'student' || !currentProfile || !isOnline) return;
      try {
        const attRes = await fetch(`${API_BASE}/attendance/student/${currentProfile.id}`);
        if (attRes.ok) setStudentAttendanceLogs(await attRes.json());

        const gradeRes = await fetch(`${API_BASE}/grades/student/${currentProfile.id}`);
        if (gradeRes.ok) {
          const data = await gradeRes.json();
          setStudentGradesData(data);
          const marksObj = {};
          data.grades.forEach(g => {
            marksObj[g.course_id] = g.marks_obtained;
          });
          setWhatIfMarks(marksObj);
        }
      } catch (err) {
        console.error('Attendance fetch error:', err);
      }
    };
    loadStudentMetrics();
  }, [currentUser, currentProfile, isOnline, invoices]);

  // Session login
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    setAuthenticating(true);

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Unauthorized access.');

      setCurrentUser(data.user);
      setCurrentProfile(data.profile);
      pushNotification('success', `Session initialized for ${data.user.email} (${data.user.role}).`);
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setAuthenticating(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentProfile(null);
    setStudents([]);
    setSchedules([]);
    setInvoices([]);
    setSystemAuditLogs([]);
    setSyllabusList([]);
    setAnnouncements([]);
    pushNotification('info', 'Session ended successfully.');
  };

  // Create student CRUD
  const handleCreateStudent = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Database Write Failed.');

      pushNotification('success', `Registered student ${studentForm.firstName} ${studentForm.lastName}.`);
      setStudentForm({
        firstName: '', lastName: '', studentIdNumber: '', program: 'Computer Science & Engineering',
        dateOfBirth: '', contactNumber: '', emergencyContact: ''
      });
      fetchData();
    } catch (err) {
      pushNotification('error', err.message);
    }
  };

  // Create schedule
  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scheduleForm)
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setTimetableConflict({ message: data.error.message, code: data.error.code });
        }
        throw new Error(data.error?.message || 'Database Reservation Error.');
      }

      pushNotification('success', 'Committed schedule slot cleanly.');
      setTimetableConflict(null);
      fetchData();
    } catch (err) {
      pushNotification('error', err.message);
    }
  };

  // AI Master Constraint Solver Execution (USP 2)
  const handleAutoGenerateTimetable = async () => {
    setSolvingAiSchedules(true);
    pushNotification('info', 'Running Heuristic AI CSP Backtracking Solver…');

    const timeSlotsList = [
      { id: 1, day: 'Monday', time_window: '09:00 - 10:30' },
      { id: 2, day: 'Tuesday', time_window: '10:30 - 12:00' },
      { id: 3, day: 'Wednesday', time_window: '13:00 - 14:30' },
      { id: 4, day: 'Thursday', time_window: '14:30 - 16:00' },
      { id: 5, day: 'Friday', time_window: '09:00 - 10:30' }
    ];

    const result = solveTimetableCSP(courses, rooms, timeSlotsList, schedules);

    if (result.success) {
      try {
        const res = await fetch(`${API_BASE}/schedules/auto-generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ solvedSchedules: result.assignments })
        });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error?.message || 'Failed to persist timetables.');
        
        pushNotification('success', 'Master schedules solved successfully with zero conflicts.');
        fetchData();
      } catch (err) {
        pushNotification('error', err.message);
      } finally {
        setSolvingAiSchedules(false);
      }
    } else {
      pushNotification('error', 'Timetabling Solver Failed: Constraints exceeded maximum capacities.');
      setSolvingAiSchedules(false);
    }
  };

  // Payment receipts clear
  const handleAuditPaymentReceipt = async (invoiceId, approved) => {
    try {
      const res = await fetch(`${API_BASE}/billing/invoices/${invoiceId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved })
      });
      if (!res.ok) throw new Error('Payment reconciliation audit failed.');
      
      pushNotification(approved ? 'success' : 'error', `Invoice #${invoiceId} payment status set to ${approved ? 'PAID' : 'UNPAID'}.`);
      fetchData();
    } catch (err) {
      pushNotification('error', err.message);
    }
  };

  // CSV bulk import parser
  const handleImportCSVData = async () => {
    if (!csvTextData) return;
    setCsvImporting(true);
    try {
      const res = await fetch(`${API_BASE}/students/bulk-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText: csvTextData, program: 'Computer Science & Engineering' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'CSV parse failed.');

      pushNotification('success', data.message);
      setCsvTextData('');
      fetchData();
    } catch (err) {
      pushNotification('error', err.message);
    } finally {
      setCsvImporting(false);
    }
  };

  // Broadcast announcements
  const handlePostAnnouncement = async (e) => {
    e.preventDefault();
    if (!announcementForm.title || !announcementForm.content) return;
    try {
      const res = await fetch(`${API_BASE}/announcements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(announcementForm)
      });
      if (!res.ok) throw new Error('Failed to post announcement.');

      pushNotification('success', 'Broadcast Bulletin announcement posted successfully.');
      setAnnouncementForm({ title: '', content: '', urgency: 'INFO' });
      fetchData();
    } catch (err) {
      pushNotification('error', err.message);
    }
  };

  // Cycle faculty roster statuses
  const handleCycleFacultyRoster = (studentId) => {
    setFacultyRosterList(prev => {
      const current = prev[studentId] || 'PRESENT';
      let nextStatus = 'PRESENT';
      if (current === 'PRESENT') nextStatus = 'ABSENT';
      else if (current === 'ABSENT') nextStatus = 'LATE';
      else if (current === 'LATE') nextStatus = 'EXEMPTED';
      return { ...prev, [studentId]: nextStatus };
    });
  };

  // Save faculty roster
  const handleSaveFacultyBatch = async () => {
    const selectedScheduleObj = schedules.find(sc => sc.id === activeLectureSchedule);
    const courseId = selectedScheduleObj?.course_id;
    const enrolledStudentIds = allGradesList.filter(g => g.course_id === courseId).map(g => g.student_id);
    const enrolledStudents = students.filter(s => enrolledStudentIds.includes(s.id));
    const activeRosterStudents = enrolledStudents.length > 0 ? enrolledStudents : students;

    const records = activeRosterStudents.map(s => ({
      studentId: s.id,
      status: facultyRosterList[s.id] || 'PRESENT'
    }));

    if (!isOnline) {
      const offlineTransaction = {
        id: `offline-roster-${Date.now()}`,
        type: 'ROSTER_CALL',
        scheduleId: activeLectureSchedule,
        records,
        recordedBy: currentProfile?.id || 'staff-01',
        timestamp: Date.now()
      };
      setLocalDirtyQueue(prev => [...prev, offlineTransaction]);
      pushNotification('warning', 'Offline Mode: Attendance call cached in browser localStorage.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/attendance/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduleId: activeLectureSchedule,
          records,
          recordedBy: currentProfile?.id || 'staff-01'
        })
      });
      if (!res.ok) throw new Error('Roster call database save failed.');

      pushNotification('success', 'Roster call saved to database successfully.');
      fetchData();
    } catch (err) {
      pushNotification('error', err.message);
    }
  };

  // Post grades
  const handlePostTermGrade = async (studentId, courseId) => {
    const scoreKey = `${studentId}-${courseId}`;
    const marksVal = gradingStudentMarks[scoreKey];
    if (marksVal === undefined) return;

    const marks = parseInt(marksVal, 10);
    if (isNaN(marks) || marks < 0 || marks > 100) {
      pushNotification('error', 'Marks must be an integer between 0 and 100.');
      return;
    }

    setGradingStudentLoading(prev => ({ ...prev, [scoreKey]: true }));
    setGradingStudentSuccess(prev => ({ ...prev, [scoreKey]: false }));

    try {
      const res = await fetch(`${API_BASE}/grades/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, courseId, marksObtained: marks, semester: 6 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to update grades database.');

      pushNotification('success', `Dynamic Grade posted: ${marks}% (${data.gradeLetter})`);
      setGradingStudentSuccess(prev => ({ ...prev, [scoreKey]: true }));
      fetchData();
    } catch (err) {
      pushNotification('error', err.message);
    } finally {
      setGradingStudentLoading(prev => ({ ...prev, [scoreKey]: false }));
    }
  };

  // Update syllabus progress
  const handleUpdateSyllabusProgress = async (id, currentVal) => {
    const nextVal = currentVal >= 100 ? 0 : currentVal + 25;
    try {
      const res = await fetch(`${API_BASE}/syllabus/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syllabusId: id, coveragePercentage: nextVal })
      });
      if (!res.ok) throw new Error('Syllabus write failed.');
      pushNotification('success', 'Syllabus coverage progress updated.');
      fetchData();
    } catch (err) {
      pushNotification('error', err.message);
    }
  };

  // Upload receipts screenshot
  const handleUploadWireReceipt = async () => {
    if (!uploadInvoiceId) return;
    try {
      const res = await fetch(`${API_BASE}/billing/invoices/${uploadInvoiceId}/upload-receipt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: false })
      });
      if (!res.ok) throw new Error('Transaction slip upload failed.');
      
      pushNotification('success', 'Receipt verification screenshot uploaded successfully for audit review.');
      setUploadInvoiceId(null);
      fetchData();
    } catch (err) {
      pushNotification('error', err.message);
    }
  };

  // Scan dynamic geofenced QR
  const handleScanDynamicQr = (scheduleId = 'sched-01', token = 'MANUAL-TOKEN', lat = 28.6756, lng = 77.4402) => {
    setRadarActive(true);
    setTimeout(async () => {
      setRadarActive(false);
      try {
        const res = await fetch(`${API_BASE}/attendance/qr-sign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            studentId: currentProfile.id, 
            scheduleId, 
            token,
            latitude: lat,
            longitude: lng
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || 'Proximity check failed.');
        
        pushNotification('success', data.message);
        fetchData();
      } catch (err) {
        pushNotification('error', err.message);
      }
    }, 1800);
  };

  // Recruiter verifier
  const handleEmployerVerifySubmit = async (e) => {
    e.preventDefault();
    setEmployerVerifyError('');
    setEmployerVerifyResult(null);
    setEmployerVerifying(true);
    try {
      const res = await fetch(`${API_BASE}/auth/recruiter-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rollNumber: employerVerifyId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Registry verification failed.');
      
      setEmployerVerifyResult(data);
      pushNotification('success', 'Verification complete: Record authentic.');
    } catch (err) {
      setEmployerVerifyError(err.message);
    } finally {
      setEmployerVerifying(false);
    }
  };

  // Offline local cache queue sync
  const handleTriggerQueueSync = async () => {
    setSyncing(true);
    setSyncProgressLogs(['Re-connecting corporate sync links…', 'Querying local SQLite transaction log delta…']);
    
    setTimeout(async () => {
      let failed = false;
      for (const item of localDirtyQueue) {
        try {
          const res = await fetch(`${API_BASE}/attendance/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              scheduleId: item.scheduleId, 
              records: item.records, 
              recordedBy: item.recordedBy 
            })
          });
          if (!res.ok) throw new Error();
          setSyncProgressLogs(prev => [...prev, `Reconciled roster call transaction ${item.id} committed successfully.`]);
        } catch (e) {
          failed = true;
          setSyncProgressLogs(prev => [...prev, `Error: Roster transaction sync failed for schedule ID ${item.scheduleId}.`]);
        }
      }

      if (!failed) {
        setLocalDirtyQueue([]);
        localStorage.removeItem('abes_go_offline_queue');
        pushNotification('success', 'Relational cached sync delta committed to central SQLite ledger cleanly.');
      } else {
        pushNotification('error', 'Operational reconciliation completed with partial conflict errors.');
      }
      
      setSyncing(false);
      fetchData();
    }, 2000);
  };

  const handleToggleNetworkSim = () => {
    setIsOnline(!isOnline);
    pushNotification(isOnline ? 'warning' : 'success', isOnline ? 'Transitioned to browser Local Cache mode.' : 'Re-connected to university enterprise server.');
  };

  const handleDirectInvoicePayment = async (e) => {
    e.preventDefault();
    if (!checkoutInvoice) return;
    setPaymentProcessing(true);
    pushNotification('info', `Contacting bursar secure payment gateway using ${paymentMethod.toUpperCase()}…`);

    setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/billing/invoices/${checkoutInvoice.id}/pay-direct`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        if (!res.ok) throw new Error('Gateway payment clearance failed.');

        setPaymentSuccess(true);
        pushNotification('success', 'Digital balance clear and ledger receipt issued.');
        fetchData();
        setTimeout(() => {
          setCheckoutInvoice(null);
          setPaymentSuccess(false);
          setPaymentProcessing(false);
        }, 1500);
      } catch (err) {
        pushNotification('error', err.message);
        setPaymentProcessing(false);
      }
    }, 1800);
  };

  const handleExportAuditLogs = () => {
    try {
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(systemAuditLogs, null, 2))}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute('download', `ABES_GO_Security_Audit_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      pushNotification('success', 'Security audit logs exported to JSON successfully.');
    } catch (err) {
      pushNotification('error', 'Exporter failure: ' + err.message);
    }
  };

  const TRANSLATIONS = {
    EN: {
      enterPortal: "Enter Portal",
      heroTagline: "01 / NAAC A+ ACCREDITED ERP",
      heroTitle: "We create Awesome ",
      heroSubtext: "An intelligent, full-stack college administration dashboard custom-tailored for ABES. Designed from first-principles to deliver conflict-free schedules, dynamic rolls, and instant billing realizations.",
      rating: "5.0 Rating",
      verified: "Gold verified by NAAC & University Reviewers.",
      demoTitle: "MOCK WORKSPACE DEMO",
      demoSubtitle: "Secured relational SQLite framework active.",
      accessConsole: "Access Console Portals",
      words: ["ERPs", "Timetables", "Rosters", "GPAs", "Invoices"],
      navAbout: "About Us",
      navCases: "Academics",
      navReviews: "Reviews",
      navContact: "Admissions",
      servicesGridTitle: "01 — Our Services",
      servicesGridSubtext: "As a tight-knit team of technical experts, we create secure databases, digital experiences, and native applications.",
      service1Title: "AI Heuristic Timetable Solver",
      service1Desc: "Recursive backtracking CSP engine dynamically checks room capacities, instructor conflicts, and time clashing within transaction blocks cleanly.",
      service2Title: "Live Proximity Geo-Checkin",
      service2Desc: "Restricts classroom roll calls using strict 20-meter boundary fences and rotating dynamic QR security tokens. Prevents proxy attendance logs.",
      service3Title: "Bursar Payment Clearance",
      service3Desc: "Integrated checkout simulation settles semester fee statements, reconciles ledgers, writes events, and supports audit timeline report exports."
    },
    HI: {
      enterPortal: "पोर्टल खोलें",
      heroTagline: "01 / नैक ए+ मान्यता प्राप्त ईआरपी",
      heroTitle: "हम बनाते हैं शानदार ",
      heroSubtext: "एबीईएस के लिए विशेष रूप से तैयार किया गया एक बुद्धिमान, फुल-स्टैक कॉलेज प्रशासन डैशबोर्ड। संघर्ष-मुक्त कार्यक्रम, समय सारिणी और तत्काल रोल के लिए डिज़ाइन किया गया है।",
      rating: "5.0 रेटिंग",
      verified: "नैक और विश्वविद्यालय समीक्षकों द्वारा स्वर्ण सत्यापित।",
      demoTitle: "प्रस्तुति कार्यक्षेत्र डेमो",
      demoSubtitle: "सुरक्षित संबंधपरक SQLite ढांचा सक्रिय है।",
      accessConsole: "कंसोल पोर्टल खोलें",
      words: ["ईआरपी", "समय सारणी", "रोस्टर", "जीपीए", "चालान"],
      navAbout: "हमारे बारे में",
      navCases: "Academics",
      navReviews: "Reviews",
      navContact: "Admissions",
      servicesGridTitle: "01 — हमारी सेवाएं",
      servicesGridSubtext: "तकनीकी विशेषज्ञों की एक टीम के रूप में, हम सुरक्षित डेटाबेस, डिजिटल अनुभव और देशी अनुप्रयोग बनाते हैं।",
      service1Title: "अनुमानी शेड्यूलिंग सॉल्वर",
      service1Desc: "रिकर्सिव सीएसपी अनुमानी शेड्यूलिंग शेड्यूलर इंजन गतिशील रूप से कमरों की क्षमता, प्रशिक्षक संघर्षों और समय के टकराव की जांच करता है।",
      service2Title: "भौगोलिक कक्षा चेक-इन",
      service2Desc: "कक्षा के रोल कॉल को 20 मीटर की सीमा और घूमते हुए गतिशील क्यूआर सुरक्षा टोकन का उपयोग करके प्रतिबंधित करता है।",
      service3Title: "बर्सर शुल्क समाधान",
      service3Desc: "एकीकृत चेकआउट सिमुलेशन सेमेस्टर शुल्क विवरणों का निपटान करता है, लेजर का मिलान करता है और ऑडिट निर्यात का समर्थन करता।"
    },
    ES: {
      enterPortal: "Entrar al Portal",
      heroTagline: "01 / ERP ACREDITADO NAAC A+",
      heroTitle: "Creamos ERP ",
      heroSubtext: "Un panel de administración universitaria inteligente adaptado a la medida de ABES. Diseñado desde los primeros principios para ofrecer horarios sin conflictos y listas dinámicas.",
      rating: "Clasificación 5.0",
      verified: "Verificación de oro por NAAC y revisores universitarios.",
      demoTitle: "DEMO DE PRESENTACIÓN",
      demoSubtitle: "Marco SQLite relacional seguro activo.",
      accessConsole: "Acceder a Consolas",
      words: ["ERPs", "Horarios", "Listas", "GPAs", "Facturas"],
      navAbout: "Nosotros",
      navCases: "Academia",
      navReviews: "Reseñas",
      navContact: "Admisiones",
      servicesGridTitle: "01 — Nuestros Servicios",
      servicesGridSubtext: "Como un equipo experto, creamos bases de datos seguras, experiencias digitales y aplicaciones nativas.",
      service1Title: "Buscador de horarios heurísticos",
      service1Desc: "El motor de retroceso recursivo CSP verifica dinámicamente la capacidad de aulas y conflictos de instructores.",
      service2Title: "Control de proximidad",
      service2Desc: "Restringe las llamadas de asistencia utilizando cercas de proximidad de 20 metros y tokens QR dinámicos rotativos.",
      service3Title: "Reconciliación bursátil",
      service3Desc: "La simulación de pago integrado liquida estados de cuenta, concilia libros de contabilidad y exporta auditorías en JSON."
    }
  };

  // --- RENDER ROUTING ---
  if (!currentUser) {
    return (
      <>
        <LandingPage 
          currentLang={currentLang}
          setCurrentLang={setCurrentLang}
          setShowLoginModal={setShowLoginModal}
          TRANSLATIONS={TRANSLATIONS}
          employerVerifyId={employerVerifyId}
          setEmployerVerifyId={setEmployerVerifyId}
          employerVerifyResult={employerVerifyResult}
          setEmployerVerifyResult={setEmployerVerifyResult}
          employerVerifying={employerVerifying}
          employerVerifyError={employerVerifyError}
          setEmployerVerifyError={setEmployerVerifyError}
          handleEmployerVerifySubmit={handleEmployerVerifySubmit}
        />

        {showLoginModal && (
          <LoginModal 
            setShowLoginModal={setShowLoginModal}
            loginEmail={loginEmail}
            setLoginEmail={setLoginEmail}
            loginPassword={loginPassword}
            setLoginPassword={setLoginPassword}
            handleLoginSubmit={handleLoginSubmit}
            authenticating={authenticating}
            loginError={loginError}
          />
        )}
      </>
    );
  }

  return (
    <div className="app-container">
      
      {/* LEFT COLUMN: ACTIVE WORKSPACE CONSOLE PANELS */}
      <div className="portal-pane">
        
        {/* Announcements marquee bulletin */}
        {announcements.length > 0 && (
          <div style={{ background: '#09090d', border: '1px solid rgba(255, 255, 255, 0.04)', borderLeft: '4px solid #ef4444', padding: '10px 24px', borderRadius: '16px', marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center' }}>
            <span className="qclay-badge-pill danger" style={{ fontSize: '10px', fontWeight: 800 }}>BULLETIN</span>
            <marquee style={{ fontSize: '12px', color: '#fff', fontWeight: 600 }}>
              {announcements.map(ann => `[${ann.urgency}] ${ann.title}: ${ann.content}`).join('   |   ')}
            </marquee>
          </div>
        )}

        {/* Brand Operations top bar */}
        <div className="qclay-card" style={{ padding: '20px 28px', marginBottom: '24px', borderRadius: '24px', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <span className="display-title" style={{ fontSize: '24px', fontWeight: 700 }}>ABES GO</span>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginLeft: '16px', fontWeight: 700, letterSpacing: '0.08em' }}>ENTERPRISE OPERATIONS SERVER</span>
          </div>
          
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <button 
              onClick={handleToggleNetworkSim} 
              className="qclay-btn-pill secondary" 
              style={{ border: 'none', background: 'transparent', padding: 0, color: isOnline ? '#10b981' : '#ef4444', fontSize: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span className={`status-dot ${isOnline ? 'online' : 'offline'}`} aria-hidden="true"></span>
              {isOnline ? "ONLINE SERVER" : "LOCAL CACHE"}
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderLeft: '1px solid rgba(255,255,255,0.06)', paddingLeft: '20px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#fff' }}>{currentUser.email}</span>
              <button 
                onClick={() => setShowDemoControlRoom(!showDemoControlRoom)} 
                className="qclay-btn-pill secondary" 
                style={{ border: '1px solid rgba(255,255,255,0.08)', padding: '6px 12px', fontSize: '11px', color: 'var(--abes-gold)', display: 'flex', alignItems: 'center', gap: '6px' }}
                aria-label="Toggle Demo Control Room Drawer"
              >
                <Sliders size={12} aria-hidden="true" /> Demo Control
              </button>
              <button onClick={handleLogout} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="End session and sign out">
                <LogOut size={15} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        {/* Render clean workspace based on user role */}
        {currentUser.role === 'admin' && (
          <AdminConsole 
            students={students}
            schedules={schedules}
            invoices={invoices}
            rooms={rooms}
            courses={courses}
            staff={staff}
            systemAuditLogs={systemAuditLogs}
            announcements={announcements}
            announcementForm={announcementForm}
            setAnnouncementForm={setAnnouncementForm}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            studentForm={studentForm}
            setStudentForm={setStudentForm}
            scheduleForm={scheduleForm}
            setScheduleForm={setScheduleForm}
            timetableConflict={timetableConflict}
            setTimetableConflict={setTimetableConflict}
            csvTextData={csvTextData}
            setCsvTextData={setCsvTextData}
            csvImporting={csvImporting}
            handleCreateStudent={handleCreateStudent}
            handleCreateSchedule={handleCreateSchedule}
            handleAutoGenerateTimetable={handleAutoGenerateTimetable}
            solvingAiSchedules={solvingAiSchedules}
            handleAuditPaymentReceipt={handleAuditPaymentReceipt}
            handleImportCSVData={handleImportCSVData}
            handlePostAnnouncement={handlePostAnnouncement}
            handleExportAuditLogs={handleExportAuditLogs}
            pushNotification={pushNotification}
            currentUser={currentUser}
          />
        )}

        {currentUser.role === 'faculty' && (
          <FacultyConsole 
            currentUser={currentUser}
            currentProfile={currentProfile}
            students={students}
            schedules={schedules}
            courses={courses}
            syllabusList={syllabusList}
            activeLectureSchedule={activeLectureSchedule}
            setActiveLectureSchedule={setActiveLectureSchedule}
            facultyRosterList={facultyRosterList}
            handleCycleFacultyRoster={handleCycleFacultyRoster}
            handleSaveFacultyBatch={handleSaveFacultyBatch}
            gradingCourseId={gradingCourseId}
            setGradingCourseId={setGradingCourseId}
            allGradesList={allGradesList}
            gradingStudentMarks={gradingStudentMarks}
            setGradingStudentMarks={setGradingStudentMarks}
            gradingStudentLoading={gradingStudentLoading}
            gradingStudentSuccess={gradingStudentSuccess}
            handlePostTermGrade={handlePostTermGrade}
            handleUpdateSyllabusProgress={handleUpdateSyllabusProgress}
            pushNotification={pushNotification}
          />
        )}

        {currentUser.role === 'student' && currentProfile && (
          <StudentConsole 
            currentUser={currentUser}
            currentProfile={currentProfile}
            schedules={schedules}
            courses={courses}
            rooms={rooms}
            syllabusList={syllabusList}
            invoices={invoices}
            studentAttendanceLogs={studentAttendanceLogs}
            pdfBillInvoice={pdfBillInvoice}
            setPdfBillInvoice={setPdfBillInvoice}
            uploadInvoiceId={uploadInvoiceId}
            setUploadInvoiceId={setUploadInvoiceId}
            gpsSlider={gpsSlider}
            setGpsSlider={setGpsSlider}
            handleScanDynamicQr={handleScanDynamicQr}
            radarActive={radarActive}
            studentGradesData={studentGradesData}
            whatIfMarks={whatIfMarks}
            setWhatIfMarks={setWhatIfMarks}
            setCheckoutInvoice={setCheckoutInvoice}
            handleUploadWireReceipt={handleUploadWireReceipt}
            pushNotification={pushNotification}
            allGradesList={allGradesList}
          />
        )}

      </div>

      {/* Sliding Demo Control Room Side-Drawer Panel */}
      {showDemoControlRoom && (
        <div className="demo-control-drawer">
          <div className="demo-control-backdrop" onClick={() => setShowDemoControlRoom(false)} />
          <div className="demo-control-content">
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '16px', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--abes-gold)', letterSpacing: '0.08em' }}>DEMO CONTROL ROOM</span>
              <button 
                onClick={() => setShowDemoControlRoom(false)}
                style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                aria-label="Close demo settings drawer"
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Synchronized Offline Toast notification logger */}
              <div className="qclay-card" style={{ padding: '24px', gap: '16px', borderRadius: '24px' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(255,255,255,0.4)', display: 'block', letterSpacing: '0.08em' }}>CORPORATE LOGS & EVENT TRACKS</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '160px', overflowY: 'auto' }} aria-live="polite">
                  {notifications.map(n => (
                    <div key={n.id} style={{ fontSize: '11px', background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: n.type === 'error' ? '#ef4444' : n.type === 'warning' ? 'var(--abes-gold)' : '#fff', fontWeight: 500 }}>{n.message}</span>
                      <span className="tabular-nums" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px' }}>{n.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sync operations manager block if dirty items exist */}
              {localDirtyQueue.length > 0 && (
                <div className="qclay-card" style={{ padding: '20px 24px', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <span className="tabular-nums" style={{ fontSize: '13px', fontWeight: 700, display: 'block', color: '#fff' }}>Unsynced Changes: {localDirtyQueue.length}</span>
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>Buffered offline transaction delta.</span>
                    </div>
                    <button className="qclay-btn-pill" style={{ padding: '8px 14px', fontSize: '11px' }} onClick={handleTriggerQueueSync}>
                      Sync Online
                    </button>
                  </div>
                </div>
              )}

              {/* Recruiter verification secure scanner preview block */}
              <div className="qclay-card" style={{ padding: '24px', borderRadius: '24px', gap: '16px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--abes-gold)', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Eye size={14} aria-hidden="true" /> Recruiter Verification Desk
                </h4>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', lineHeight: '1.5' }}>
                  Simulates background recruiter scanning certified student marksheets. Accesses records delta safely.
                </p>
                
                <form onSubmit={handleEmployerVerifySubmit} style={{ display: 'flex', gap: '8px', width: '100%' }}>
                  <input 
                    aria-label="recruiter student roll id verify input"
                    name="rollNumber"
                    autoComplete="off"
                    type="text" className="qclay-input-capsule" style={{ height: '38px', fontSize: '12px', padding: '6px 12px', flex: 1 }} placeholder="Student Roll ID..."
                    value={employerVerifyId} onChange={e => setEmployerVerifyId(e.target.value)} required
                  />
                  <button type="submit" disabled={employerVerifying} className="qclay-btn-pill" style={{ height: '38px', padding: '8px 16px', fontSize: '12px' }}>
                    Verify
                  </button>
                </form>

                {employerVerifyError && (
                  <span style={{ fontSize: '11px', color: '#ef4444', display: 'block' }}>{employerVerifyError}</span>
                )}

                {employerVerifyResult && (
                  <div className="qclay-card" style={{ padding: '16px', background: '#0c0c12', borderRadius: '16px', border: '1px solid rgba(16,185,129,0.15)', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span className="qclay-badge-pill success" style={{ fontSize: '9px', alignSelf: 'flex-start' }}>✓ VERIFIED AUTHENTIC</span>
                    <span style={{ color: '#fff' }}>Name: <strong>{employerVerifyResult.student.firstName} {employerVerifyResult.student.lastName}</strong></span>
                    <span style={{ color: 'rgba(255,255,255,0.45)' }}>Program: {employerVerifyResult.student.program}</span>
                    <span className="tabular-nums" style={{ display: 'block', marginTop: '2px', color: 'var(--abes-gold)', fontWeight: 600 }}>Verified SGPA: {employerVerifyResult.sgpa} / 10.0</span>
                  </div>
                )}
              </div>

              {/* Educational Guidelines Info Card */}
              <div className="qclay-card" style={{ padding: '24px', borderRadius: '24px', gap: '12px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--abes-gold)', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Shield size={14} aria-hidden="true" /> Operations Verification Guide
                </h4>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <p>• Authenticate as <strong style={{ color: '#fff' }}>admin@abes.edu</strong> to solve constraint schedules, post bulletins, or clear escrow invoices.</p>
                  <p>• Authenticate as <strong style={{ color: '#fff' }}>sandeep@abes.edu</strong> to record roster attendance, update syllabus completion, or generate check-in tokens.</p>
                  <p>• Authenticate as <strong style={{ color: '#fff' }}>liam@abes.edu</strong> to test check-in geofences, view academic transcripts, or simulate What-If GPA targets.</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Syncing Overlay animation */}
      {syncing && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(9,13,24,0.92)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div className="glass-panel" style={{ padding: '36px', maxWidth: '440px', width: '100%', textAlign: 'center', border: '1px solid var(--border-glow)' }}>
            <RefreshCw className="animate-spin" size={40} color="var(--abes-blue)" style={{ margin: '0 auto 16px auto' }} aria-hidden="true" />
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '6px' }}>Merging Offline Cached Transactions</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>Reconciling offline delta changes back into central SQLite schema.</p>
            <div style={{ background: 'rgba(0,0,0,0.5)', borderRadius: '8px', padding: '12px', textAlign: 'left', maxHeight: '110px', overflowY: 'auto' }}>
              {syncProgressLogs.map((log, id) => (
                <div key={id} style={{ fontSize: '11px', fontFamily: 'monospace', color: '#10b981', marginBottom: '2px' }}>&gt; {log}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Printable Invoice Overlay */}
      {pdfBillInvoice && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(9,13,24,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 999 }}>
          <div className="glass-panel" style={{ padding: '36px', maxWidth: '640px', width: '100%', background: '#ffffff', color: '#000', border: 'none', borderRadius: '16px', boxShadow: '0 30px 60px rgba(0,0,0,0.5)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #e2e8f0', paddingBottom: '16px', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'hsl(217, 91%, 36%)', fontSize: '22px' }}>ABES ENGINEERING COLLEGE</h2>
                <span style={{ fontSize: '10px', color: '#64748b', display: 'block', fontWeight: 600 }}>CAMPUS: NH-24, BYPASS ROAD, GHAZIABAD, UP - 201009</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#334155' }}>SEMESTER INVOICE</h3>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Reference: <strong className="tabular-nums">#ABES-{pdfBillInvoice.id.substring(0, 8).toUpperCase()}</strong></span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '12px', marginBottom: '20px' }}>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontWeight: 700, fontSize: '10px' }}>BILLED TO LEARNER:</span>
                <strong style={{ fontSize: '13px', color: '#1e293b' }}>Liam Sharma (CSE Term-6)</strong>
                <span className="tabular-nums" style={{ display: 'block', color: '#475569' }}>Roll ID: 2200320100045</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: '#64748b', display: 'block', fontWeight: 700, fontSize: '10px' }}>ACCOUNT AUDIT STATEMENT:</span>
                <span style={{ display: 'block', color: '#475569' }}>Issue Date: {pdfBillInvoice.issue_date || pdfBillInvoice.issueDate}</span>
                <span style={{ display: 'block', color: '#475569' }}>Deadline: {pdfBillInvoice.due_date || pdfBillInvoice.dueDate}</span>
                <span className="tabular-nums" style={{ 
                  display: 'inline-block', marginTop: '4px', fontSize: '10px', padding: '3px 8px', borderRadius: '4px', fontWeight: 800,
                  background: pdfBillInvoice.status === 'PAID' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                  color: pdfBillInvoice.status === 'PAID' ? '#10b981' : '#ef4444'
                }}>
                  {pdfBillInvoice.status}
                </span>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #cbd5e1', color: '#475569', fontWeight: 700 }}>
                    <th style={{ padding: '8px 0' }}>Billed Charge Category</th>
                    <th style={{ padding: '8px 0', textAlign: 'right' }}>Item Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {pdfBillInvoice.items?.map((item, id) => (
                    <tr key={id} style={{ borderBottom: '1px solid #f1f5f9', color: '#334155' }}>
                      <td style={{ padding: '8px 0' }}>{item.name}</td>
                      <td className="tabular-nums" style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600 }}>₹{item.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>
                    <td style={{ padding: '12px 0 0 0' }}>Total Semester Outstanding Due</td>
                    <td className="tabular-nums" style={{ padding: '12px 0 0 0', textAlign: 'right', color: 'hsl(217, 91%, 36%)' }}>₹{pdfBillInvoice.total_amount.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
              <div style={{ fontSize: '10px', color: '#64748b', maxWidth: '340px', lineHeight: '1.4' }}>
                * This document constitutes a certified electronic billing statement generated by the ABES GO Administration Platform. Records remain subject to database audits.
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: '70px', height: '70px', border: '3px double hsl(217, 91%, 36%)', borderRadius: '50%', color: 'hsl(217, 91%, 36%)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', fontWeight: 800, fontSize: '8px', transform: 'rotate(-8deg)', margin: '0 auto 4px auto' }}>
                  <span>ABES FIN</span>
                  <span>AUTHORIZED</span>
                </div>
                <span style={{ fontSize: '9px', color: '#475569', display: 'block' }}>Clearance Bursar Seal</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button 
                className="premium-btn" style={{ background: 'hsl(217, 91%, 36%)', border: 'none', padding: '8px 16px', fontSize: '12px' }}
                onClick={() => { alert('Document saved inside local printer spooler.'); setPdfBillInvoice(null); }}
              >
                <Download size={14} aria-hidden="true" /> Download PDF Transcript
              </button>
              <button 
                className="premium-btn secondary" style={{ border: '1px solid #cbd5e1', color: '#334155', background: '#f8fafc', padding: '8px 16px', fontSize: '12px' }}
                onClick={() => setPdfBillInvoice(null)}
              >
                Close Bill View
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Secure Checkout dialog overlay */}
      {checkoutInvoice && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(9,13,24,0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div className="glass-panel" style={{ padding: '32px', maxWidth: '480px', width: '100%', border: '1px solid var(--border-glow)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
              <h3 className="display-title" style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Lock size={16} aria-hidden="true" color="var(--abes-gold)" /> ABES Secure Gateway
              </h3>
              <button style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => setCheckoutInvoice(null)} aria-label="Close payment gateway overlay">
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {paymentProcessing ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                {paymentSuccess ? (
                  <div>
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--success-glow)', border: '2px solid var(--success)', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 20px auto' }}>
                      <CheckCircle size={36} aria-hidden="true" color="var(--success)" />
                    </div>
                    <h4 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>Payment Approved!</h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Ledger balance settled instantly. Redirecting to billing statement…</p>
                  </div>
                ) : (
                  <div>
                    <RefreshCw className="animate-spin" size={40} color="var(--abes-gold)" style={{ margin: '0 auto 20px auto' }} aria-hidden="true" />
                    <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>Contacting Bank Services…</h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Securing transactional tunnel. Do not close or refresh this session tab.</p>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleDirectInvoicePayment} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ background: 'rgba(255,255,255,0.01)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>GRAND TRANSACTION SUM</span>
                    <strong className="tabular-nums" style={{ fontSize: '18px', color: 'var(--success)' }}>₹{checkoutInvoice.total_amount.toLocaleString()}</strong>
                  </div>
                  <span className="status-badge late" style={{ fontSize: '9px', padding: '3px 8px' }}>Bursar Escrow</span>
                </div>

                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>SECURED METHOD *</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button type="button" className={`premium-btn ${paymentMethod === 'upi' ? '' : 'secondary'}`} onClick={() => setPaymentMethod('upi')} style={{ padding: '10px' }}>UPI Apps</button>
                    <button type="button" className={`premium-btn ${paymentMethod === 'card' ? '' : 'secondary'}`} onClick={() => setPaymentMethod('card')} style={{ padding: '10px' }}>Card Gateway</button>
                  </div>
                </div>

                {paymentMethod === 'upi' ? (
                  <div>
                    <label htmlFor="checkout-upi" style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>VIRTUAL PAYMENT ADDRESS (VPA) *</label>
                    <input 
                      id="checkout-upi"
                      name="upiId"
                      autocomplete="off"
                      type="text" className="premium-input" value={paymentUpiId} onChange={e => setPaymentUpiId(e.target.value)} required 
                      placeholder="e.g. rollnumber@upi…"
                    />
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <label htmlFor="checkout-card-num" style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>CARD NUMBER *</label>
                      <input 
                        id="checkout-card-num"
                        name="cardNumber"
                        autocomplete="cc-number"
                        type="text" className="premium-input" value={paymentCardNum} onChange={e => setPaymentCardNum(e.target.value)} required 
                        placeholder="4111 2222 3333 4444"
                      />
                    </div>
                    <div>
                      <label htmlFor="checkout-card-name" style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>CARDHOLDER REGISTERED NAME *</label>
                      <input 
                        id="checkout-card-name"
                        name="cardName"
                        autocomplete="cc-name"
                        type="text" className="premium-input" value={paymentCardName} onChange={e => setPaymentCardName(e.target.value)} required 
                        placeholder="e.g. Liam Sharma…"
                      />
                    </div>
                  </div>
                )}

                <button type="submit" className="premium-btn" style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, var(--success) 0%, #047857 100%)', border: 'none', marginTop: '10px' }}>
                  Authorize & Release Escrow
                </button>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}

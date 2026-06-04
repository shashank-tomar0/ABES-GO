import React, { useState } from 'react';
import { 
  Users, Calendar, DollarSign, Bell, Lock, Plus, Layers, 
  RefreshCw, Database, AlertTriangle, TrendingUp, CheckCircle, 
  X, FileText, Shield, Download, MapPin
} from 'lucide-react';
import { solveTimetableCSP, calculateRoomHeatmap } from '../services/timetable';

export default function AdminConsole({
  students,
  schedules,
  invoices,
  rooms,
  courses,
  staff,
  systemAuditLogs,
  announcements,
  announcementForm,
  setAnnouncementForm,
  searchQuery,
  setSearchQuery,
  studentForm,
  setStudentForm,
  scheduleForm,
  setScheduleForm,
  timetableConflict,
  setTimetableConflict,
  csvTextData,
  setCsvTextData,
  csvImporting,
  handleCreateStudent,
  handleCreateSchedule,
  handleAutoGenerateTimetable,
  solvingAiSchedules,
  handleAuditPaymentReceipt,
  handleImportCSVData,
  handlePostAnnouncement,
  handleExportAuditLogs,
  pushNotification,
  currentUser
}) {
  const [adminTab, setAdminTab] = useState('students');
  const [attendanceConfigs, setAttendanceConfigs] = useState({});
  const [configSaving, setConfigSaving] = useState({});

  // Fetch configs for all courses
  React.useEffect(() => {
    if (adminTab === 'attendance' && currentUser) {
      courses.forEach(c => {
        fetch(`http://localhost:3000/api/internal/attendance-config/${c.id}`, {
          headers: { 'x-user-id': currentUser.id, 'x-user-role': currentUser.role }
        })
        .then(res => res.json())
        .then(data => {
          if (!data.error) {
            setAttendanceConfigs(prev => ({ ...prev, [c.id]: data }));
          }
        })
        .catch(console.error);
      });
    }
  }, [adminTab, courses, currentUser]);

  const handleConfigChange = (courseId, index, field, value) => {
    const newConfigs = [...(attendanceConfigs[courseId] || [])];
    newConfigs[index] = { ...newConfigs[index], [field]: parseFloat(value) || 0 };
    setAttendanceConfigs(prev => ({ ...prev, [courseId]: newConfigs }));
  };

  const handleSaveConfig = async (courseId) => {
    setConfigSaving(prev => ({ ...prev, [courseId]: true }));
    try {
      const config = attendanceConfigs[courseId];
      const res = await fetch(`http://localhost:3000/api/internal/attendance-config/${courseId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role
        },
        body: JSON.stringify({ thresholds: config })
      });
      if (!res.ok) throw new Error('Failed to save config');
      pushNotification('success', 'Attendance mapping configuration saved.');
    } catch (err) {
      pushNotification('error', err.message);
    } finally {
      setConfigSaving(prev => ({ ...prev, [courseId]: false }));
    }
  };

  // Dynamic Financial Aggregations
  let csePaid = 0, cseBilled = 0;
  let itPaid = 0, itBilled = 0;
  let ecePaid = 0, eceBilled = 0;

  invoices.forEach(inv => {
    const studId = inv.studentId || inv.student_id;
    const stud = students.find(s => s.id === studId);
    if (!stud) return;

    const prog = stud.program || '';
    if (prog.includes('Computer Science') || prog.includes('CSE')) {
      csePaid += inv.amount_paid || 0;
      cseBilled += inv.total_amount || 0;
    } else if (prog.includes('Information Technology') || prog.includes('IT')) {
      itPaid += inv.amount_paid || 0;
      itBilled += inv.total_amount || 0;
    } else {
      ecePaid += inv.amount_paid || 0;
      eceBilled += inv.total_amount || 0;
    }
  });

  const maxPaid = Math.max(csePaid, itPaid, ecePaid, 1);

  const cseFill = `${(csePaid / maxPaid) * 100}%`;
  const itFill = `${(itPaid / maxPaid) * 100}%`;
  const eceFill = `${(ecePaid / maxPaid) * 100}%`;

  const totalBilled = invoices.reduce((acc, inv) => acc + (inv.total_amount || 0), 0);
  const totalPaid = invoices.reduce((acc, inv) => acc + (inv.amount_paid || 0), 0);
  const realizationRatio = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 100;
  const totalArrears = totalBilled - totalPaid;
  const arrearsRatio = 100 - realizationRatio;

  const timeSlots = [
    { day: 'Monday', time_window: '09:00 - 10:30' },
    { day: 'Monday', time_window: '10:30 - 12:00' },
    { day: 'Monday', time_window: '13:00 - 14:30' },
    { day: 'Monday', time_window: '14:30 - 16:00' },
    { day: 'Tuesday', time_window: '09:00 - 10:30' },
    { day: 'Tuesday', time_window: '10:30 - 12:00' },
    { day: 'Tuesday', time_window: '13:00 - 14:30' },
    { day: 'Tuesday', time_window: '14:30 - 16:00' },
    { day: 'Wednesday', time_window: '09:00 - 10:30' },
    { day: 'Wednesday', time_window: '10:30 - 12:00' },
    { day: 'Wednesday', time_window: '13:00 - 14:30' },
    { day: 'Wednesday', time_window: '14:30 - 16:00' },
    { day: 'Thursday', time_window: '09:00 - 10:30' },
    { day: 'Thursday', time_window: '10:30 - 12:00' },
    { day: 'Thursday', time_window: '13:00 - 14:30' },
    { day: 'Thursday', time_window: '14:30 - 16:00' },
    { day: 'Friday', time_window: '09:00 - 10:30' },
    { day: 'Friday', time_window: '10:30 - 12:00' },
    { day: 'Friday', time_window: '13:00 - 14:30' },
    { day: 'Friday', time_window: '14:30 - 16:00' }
  ];

  const heatmapData = calculateRoomHeatmap(schedules, rooms, timeSlots);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', position: 'relative', zIndex: 10 }}>
      
      {/* Aurora visual glow background */}
      <div className="aurora-backdrop" style={{ top: '-10%', left: '30%', opacity: 0.5 }} aria-hidden="true"></div>

      {/* Executive KPI widgets inside QClay cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
        <div className="qclay-card" style={{ padding: '24px' }}>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', display: 'block', fontWeight: 700, letterSpacing: '0.1em' }}>TOTAL SCHOLARS REGISTERED</span>
          <strong className="tabular-nums" style={{ fontSize: '28px', display: 'block', margin: '8px 0 4px 0', color: '#fff', fontWeight: 600 }}>{students.length} Scholars</strong>
          <span className="qclay-badge-pill success" style={{ fontSize: '9px', alignSelf: 'flex-start', marginTop: '6px' }}>Active database profiles</span>
        </div>

        <div className="qclay-card" style={{ padding: '24px' }}>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', display: 'block', fontWeight: 700, letterSpacing: '0.1em' }}>MEAN CAMPUS ATTENDANCE</span>
          <strong className="tabular-nums" style={{ fontSize: '28px', display: 'block', margin: '8px 0 4px 0', color: 'var(--abes-gold)', fontWeight: 600 }}>
            {students.length > 0 ? (students.reduce((acc, s) => acc + (s.attendance_rate || 100.0), 0) / students.length).toFixed(1) : '85.0'}% Rate
          </strong>
          <span className="qclay-badge-pill neutral" style={{ fontSize: '9px', alignSelf: 'flex-start', marginTop: '6px' }}>Target: &gt;= 75% limit</span>
        </div>

        <div className="qclay-card" style={{ padding: '24px' }}>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', display: 'block', fontWeight: 700, letterSpacing: '0.1em' }}>BURSAR COLLECTIONS RATIO</span>
          <strong className="tabular-nums" style={{ fontSize: '28px', display: 'block', margin: '8px 0 4px 0', color: '#10b981', fontWeight: 600 }}>
            {invoices.length > 0 ? ((invoices.reduce((acc, inv) => acc + inv.amount_paid, 0) / invoices.reduce((acc, inv) => acc + inv.total_amount, 0)) * 100).toFixed(0) : '0'}% Cleared
          </strong>
          <span className="tabular-nums" style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', display: 'block', marginTop: '4px' }}>
            ₹{invoices.reduce((acc, inv) => acc + inv.amount_paid, 0).toLocaleString()} Collected
          </span>
        </div>

        <div className="qclay-card" style={{ padding: '24px' }}>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', display: 'block', fontWeight: 700, letterSpacing: '0.1em' }}>ACTIVE TIMETABLE SCHEDULES</span>
          <strong className="tabular-nums" style={{ fontSize: '28px', display: 'block', margin: '8px 0 4px 0', color: '#fff', fontWeight: 600 }}>{schedules.length} Class Blocks</strong>
          <span className="qclay-badge-pill neutral" style={{ fontSize: '9px', alignSelf: 'flex-start', marginTop: '6px' }}>AI conflict-checked</span>
        </div>
      </div>
      
      {/* Subnav Pill Tabs Capsule */}
      <div className="qclay-subnav-capsule">
        <button className={`qclay-subnav-item ${adminTab === 'students' ? 'active' : ''}`} onClick={() => setAdminTab('students')}>
          <Users size={14} aria-hidden="true" /> Student Lifecycle CRUD
        </button>
        <button className={`qclay-subnav-item ${adminTab === 'schedules' ? 'active' : ''}`} onClick={() => setAdminTab('schedules')}>
          <Calendar size={14} aria-hidden="true" /> master AI Scheduler
        </button>
        <button className={`qclay-subnav-item ${adminTab === 'billing' ? 'active' : ''}`} onClick={() => setAdminTab('billing')}>
          <DollarSign size={14} aria-hidden="true" /> Financial Audits & Analytics
        </button>
        <button className={`qclay-subnav-item ${adminTab === 'announce' ? 'active' : ''}`} onClick={() => setAdminTab('announce')}>
          <Bell size={14} aria-hidden="true" /> Bulletin Broadcast
        </button>
        <button className={`qclay-subnav-item ${adminTab === 'audit' ? 'active' : ''}`} onClick={() => setAdminTab('audit')}>
          <Lock size={14} aria-hidden="true" /> System Audit Trails
        </button>
        <button className={`qclay-subnav-item ${adminTab === 'attendance' ? 'active' : ''}`} onClick={() => setAdminTab('attendance')}>
          <CheckCircle size={14} aria-hidden="true" /> Attendance Marks Config
        </button>
      </div>

      {/* Tab 1: Student Lifecycle CRUD */}
      {adminTab === 'students' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
            
            {/* Single enrollment */}
            <div className="qclay-card">
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#fff', marginBottom: '20px' }}>Register New Profile</h3>
              <form onSubmit={handleCreateStudent} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <input 
                    name="firstName"
                    aria-label="First Name"
                    type="text" className="qclay-input-capsule" placeholder="First Name *" value={studentForm.firstName}
                    onChange={e => setStudentForm({...studentForm, firstName: e.target.value})} required
                    autoComplete="off"
                  />
                  <input 
                    name="lastName"
                    aria-label="Last Name"
                    type="text" className="qclay-input-capsule" placeholder="Last Name *" value={studentForm.lastName}
                    onChange={e => setStudentForm({...studentForm, lastName: e.target.value})} required
                    autoComplete="off"
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <input 
                    name="studentId"
                    aria-label="Student Roll Number"
                    type="text" className="qclay-input-capsule" placeholder="Roll Number (UQ) *" value={studentForm.studentIdNumber}
                    onChange={e => setStudentForm({...studentForm, studentIdNumber: e.target.value})} required
                    autoComplete="off"
                  />
                  <input 
                    name="dob"
                    aria-label="Date of Birth"
                    type="date" className="qclay-input-capsule" placeholder="DOB *" value={studentForm.dateOfBirth}
                    onChange={e => setStudentForm({...studentForm, dateOfBirth: e.target.value})} required
                  />
                </div>
                <select 
                  name="program"
                  aria-label="Academic Program Selection"
                  className="qclay-input-capsule" value={studentForm.program}
                  onChange={e => setStudentForm({...studentForm, program: e.target.value})}
                  style={{ appearance: 'none', background: 'rgba(255,255,255,0.02)' }}
                >
                  <option style={{ background: '#09090d' }}>Computer Science & Engineering</option>
                  <option style={{ background: '#09090d' }}>Information Technology</option>
                  <option style={{ background: '#09090d' }}>Electronics & Communication</option>
                </select>
                <button type="submit" className="qclay-btn-pill"><Plus size={14} aria-hidden="true" /> Save Profile Record</button>
              </form>
            </div>

            {/* CSV spreadsheet Roster Import */}
            <div className="qclay-card">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>Syllabus Cohort Bulk Import</h3>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.5', marginBottom: '16px' }}>
                    Input student records as CSV rows formatted as: `RollNumber,FirstName,LastName,DOB(YYYY-MM-DD),Phone`.
                  </p>
                  <textarea 
                    aria-label="CSV input payload field"
                    className="qclay-input-capsule" style={{ minHeight: '110px', fontFamily: 'monospace', fontSize: '12px', resize: 'none', borderRadius: '16px' }}
                    value={csvTextData} onChange={e => setCsvTextData(e.target.value)}
                    placeholder="2200320100099,Liam,Sharma,2004-05-12,9876543210…"
                  />
                </div>
                <button 
                  onClick={handleImportCSVData} disabled={csvImporting} className="qclay-btn-pill secondary" 
                  style={{ width: '100%', marginTop: '16px' }}
                >
                  {csvImporting ? <RefreshCw className="animate-spin" size={14} aria-hidden="true" /> : <><Layers size={14} aria-hidden="true" /> Parse CSV Batch Rows</>}
                </button>
              </div>
            </div>

          </div>

          {/* Directory table inside Hologram QClay card */}
          <div className="qclay-card qclay-hologram-glow">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#fff' }}>Active University Directory</h3>
              <input 
                aria-label="Search directory"
                type="text" className="qclay-input-capsule" style={{ width: '260px', height: '38px', padding: '6px 16px' }} placeholder="Search name or ID…"
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>
                    <th style={{ padding: '14px' }}>Roll Number</th>
                    <th style={{ padding: '14px' }}>Student Name</th>
                    <th style={{ padding: '14px' }}>Branch & Cohort</th>
                    <th style={{ padding: '14px' }}>Contact Registry</th>
                    <th style={{ padding: '14px' }}>Attendance Rate</th>
                    <th style={{ padding: '14px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.filter(s => 
                    s.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    s.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    s.student_id_number.includes(searchQuery)
                  ).map(stud => (
                    <tr key={stud.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', transition: 'background-color 0.2s' }}>
                      <td className="tabular-nums" style={{ padding: '14px', fontWeight: 700, color: 'var(--abes-gold)' }}>{stud.student_id_number}</td>
                      <td style={{ padding: '14px', fontWeight: 600, color: '#fff' }}>{stud.first_name} {stud.last_name}</td>
                      <td style={{ padding: '14px', color: 'rgba(255,255,255,0.5)' }}>
                        <span style={{ display: 'block' }}>{stud.program}</span>
                        <span className="tabular-nums" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>Class of {stud.admission_year || 2022}</span>
                      </td>
                      <td style={{ padding: '14px', color: 'rgba(255,255,255,0.5)' }}>
                        <span style={{ display: 'block', fontSize: '12px' }}>{stud.contact_number}</span>
                        <span style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{stud.emergency_contact?.split(' - ')[0]}</span>
                      </td>
                      <td className="tabular-nums" style={{ padding: '14px' }}>
                        <strong style={{ color: stud.attendance_rate >= 75 ? '#10b981' : '#ef4444' }}>{stud.attendance_rate?.toFixed(1) || '100.0'}%</strong>
                        <span className="qclay-badge-pill neutral" style={{ fontSize: '8px', padding: '2px 6px', display: 'inline-block', marginLeft: '6px' }}>
                          {stud.attendance_rate >= 75 ? 'ELIGIBLE' : 'SHORTAGE'}
                        </span>
                      </td>
                      <td style={{ padding: '14px' }}>
                        <span className="qclay-badge-pill success" style={{ fontSize: '9px' }}>{stud.enrollment_status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Master Scheduler & AI TIMETABLE SOLVER */}
      {adminTab === 'schedules' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '32px' }}>
            <div className="qclay-card" style={{ height: 'fit-content', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Heuristic AI Solver Panel */}
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#fff', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Database size={18} aria-hidden="true" color="rgba(255,255,255,0.6)" /> Heuristic AI Scheduler
                </h3>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.4', marginBottom: '18px' }}>
                  Generates class timetables instantly, resolving days, rooms, and staff conflicts using backtracking constraint sweeping.
                </p>
                <button 
                  onClick={handleAutoGenerateTimetable} disabled={solvingAiSchedules} className="qclay-btn-pill"
                  style={{ width: '100%' }}
                >
                  {solvingAiSchedules ? (
                    <><RefreshCw className="animate-spin" size={14} aria-hidden="true" /> Solving Constraints Solver…</>
                  ) : (
                    <><Layers size={14} aria-hidden="true" /> AI Auto-Generate Timetable</>
                  )}
                </button>
              </div>

              {/* Manual Scheduler Form */}
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '16px' }}>Manual Overrides Allocator</h4>
                <form onSubmit={handleCreateSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label htmlFor="sched-course-id" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>Active Course Syllabus</label>
                    <select id="sched-course-id" className="qclay-input-capsule" style={{ appearance: 'none', background: 'rgba(255,255,255,0.02)' }} value={scheduleForm.courseId} onChange={e => setScheduleForm({...scheduleForm, courseId: e.target.value})}>
                      {courses.map(c => <option key={c.id} value={c.id} style={{ background: '#09090d' }}>{c.code} - {c.title}</option>)}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="sched-instructor-id" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>Academic Instructor</label>
                    <select id="sched-instructor-id" className="qclay-input-capsule" style={{ appearance: 'none', background: 'rgba(255,255,255,0.02)' }} value={scheduleForm.instructorId} onChange={e => setScheduleForm({...scheduleForm, instructorId: e.target.value})}>
                      {staff.map(s => <option key={s.id} value={s.id} style={{ background: '#09090d' }}>{s.firstName} {s.lastName}</option>)}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="sched-room-id" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>Lecture Room Block</label>
                    <select id="sched-room-id" className="qclay-input-capsule" style={{ appearance: 'none', background: 'rgba(255,255,255,0.02)' }} value={scheduleForm.roomId} onChange={e => setScheduleForm({...scheduleForm, roomId: e.target.value})}>
                      {rooms.map(r => <option key={r.id} value={r.id} style={{ background: '#09090d' }}>{r.name} ({r.capacity} seats)</option>)}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label htmlFor="sched-day" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>Day</label>
                      <select id="sched-day" className="qclay-input-capsule" style={{ appearance: 'none', background: 'rgba(255,255,255,0.02)' }} value={scheduleForm.day} onChange={e => setScheduleForm({...scheduleForm, day: e.target.value})}>
                        <option style={{ background: '#09090d' }}>Monday</option>
                        <option style={{ background: '#09090d' }}>Tuesday</option>
                        <option style={{ background: '#09090d' }}>Wednesday</option>
                        <option style={{ background: '#09090d' }}>Thursday</option>
                        <option style={{ background: '#09090d' }}>Friday</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="sched-time" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>Time Window</label>
                      <select id="sched-time" className="qclay-input-capsule" style={{ appearance: 'none', background: 'rgba(255,255,255,0.02)' }} value={scheduleForm.timeWindow} onChange={e => setScheduleForm({...scheduleForm, timeWindow: e.target.value})}>
                        <option style={{ background: '#09090d' }}>09:00 - 10:30</option>
                        <option style={{ background: '#09090d' }}>10:30 - 12:00</option>
                        <option style={{ background: '#09090d' }}>13:00 - 14:30</option>
                        <option style={{ background: '#09090d' }}>14:30 - 16:00</option>
                      </select>
                    </div>
                  </div>

                  <button type="submit" className="qclay-btn-pill">Schedule Class Session</button>
                </form>
              </div>

              {/* Transaction conflict alerts */}
              {timetableConflict && (
                <div style={{ padding: '16px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '16px' }}>
                  <span style={{ color: 'var(--danger)', fontWeight: 800, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <AlertTriangle size={15} aria-hidden="true" /> Transaction Conflict Blocked
                  </span>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.4' }}>{timetableConflict.message}</p>
                  <button className="qclay-btn-pill secondary" style={{ width: '100%', fontSize: '11px', marginTop: '12px', padding: '6px 12px' }} onClick={() => setTimetableConflict(null)}>
                    Clear Warnings
                  </button>
                </div>
              )}
            </div>

            {/* Live grid calendar */}
            <div className="qclay-card">
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#fff', marginBottom: '24px' }}>Master Schedule Matrix</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(dayOfWeek => {
                  const daySlots = schedules.filter(s => s.day === dayOfWeek);
                  return (
                    <div key={dayOfWeek} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '14px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--abes-gold)', display: 'block', marginBottom: '8px' }}>{dayOfWeek}</span>
                      {daySlots.length === 0 ? (
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>No lectures scheduled.</span>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '12px' }}>
                          {daySlots.map(sl => {
                            const c = courses.find(item => item.id === sl.course_id);
                            const r = rooms.find(item => item.id === sl.room_id);
                            return (
                              <div key={sl.id} className="qclay-card" style={{ padding: '14px', background: 'rgba(255,255,255,0.01)', borderLeft: '2px solid var(--abes-blue)', borderRadius: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                                  <strong style={{ color: '#fff' }}>{c?.code}</strong>
                                  <span className="tabular-nums" style={{ color: 'rgba(255,255,255,0.4)' }}>{sl.time_window}</span>
                                </div>
                                <span style={{ fontSize: '12px', display: 'block', marginTop: '4px', fontWeight: 600, color: '#fff' }}>{c?.title}</span>
                                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', display: 'block', marginTop: '6px' }}>Room: {r?.name}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Master Classroom Conflict Heatmap Matrix */}
          <div className="qclay-card">
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#fff', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin size={20} aria-hidden="true" color="rgba(255,255,255,0.6)" /> Master Classroom Conflict Heatmap
            </h3>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '24px' }}>
              Visualizes slot occupancy counts. Soft gradient cylinders represent allocated active scheduling.
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '16px', overflowX: 'auto' }}>
              {/* Row headers */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'space-around', fontWeight: 700, fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                {rooms.map(r => (
                  <div key={r.id} style={{ height: '40px', display: 'flex', alignItems: 'center' }}>
                    {r.name}
                  </div>
                ))}
              </div>

              {/* Heatmap Grid slots */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '600px' }}>
                {rooms.map(room => (
                  <div key={room.id} style={{ display: 'grid', gridTemplateColumns: 'repeat(20, 1fr)', gap: '4px', height: '40px' }}>
                    {timeSlots.map((ts, idx) => {
                      const occupancyVal = heatmapData[room.id]?.[`${ts.day}:${ts.time_window}`] || 0;
                      return (
                        <div 
                          key={idx}
                          title={`${room.name} | ${ts.day} ${ts.time_window}: Occupied (${occupancyVal})`}
                          style={{
                            borderRadius: '6px',
                            background: occupancyVal === 0 ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.15)',
                            border: '1px solid rgba(255, 255, 255, 0.04)',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            fontSize: '10px',
                            fontWeight: 800,
                            color: '#fff',
                            cursor: 'pointer',
                            transition: 'var(--transition)'
                          }}
                        >
                          {occupancyVal}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', marginTop: '24px', fontSize: '11px', color: 'rgba(255,255,255,0.4)', justifyContent: 'flex-end' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255,255,255,0.04)' }}></div>
                <span>Vacant Slot (0 Course)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.15)' }}></div>
                <span>Occupied Slot (1 Course)</span>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Tab 3: Financial Receipts Auditing */}
      {adminTab === 'billing' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
            
            {/* Chart 1: Financial Collections Trajectory */}
            <div className="qclay-card">
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--abes-gold)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <TrendingUp size={16} aria-hidden="true" /> ABES Realized Collections (By Program / Batch)
              </h4>
              
              <div className="qclay-cylinder-chart" aria-hidden="true" style={{ height: '180px', margin: 0 }}>
                {[
                  { label: 'CSE Block', amount: `₹${csePaid.toLocaleString()}`, fill: cseFill },
                  { label: 'IT Block', amount: `₹${itPaid.toLocaleString()}`, fill: itFill },
                  { label: 'ECE Block', amount: `₹${ecePaid.toLocaleString()}`, fill: eceFill }
                ].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '22%' }}>
                    <span className="tabular-nums" style={{ fontSize: '11px', color: '#10b981', fontWeight: 700, marginBottom: '6px' }}>{item.amount}</span>
                    <div className="qclay-cylinder-bar" style={{ height: '120px', width: '16px' }}>
                      <div className="qclay-cylinder-fill" style={{ height: item.fill }}>
                        <span className="qclay-cylinder-dot"></span>
                      </div>
                    </div>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '10px', fontWeight: 600 }}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Chart 2: Collections velocity gauge */}
            <div className="qclay-card">
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--abes-gold)', marginBottom: '16px' }}>Fee Realization Gauge</h4>
              
              {/* Wireframe Concentric Circle indicator (mirrors gauge perfectly!) */}
              <div className="qclay-gauge-wrap" aria-hidden="true" style={{ width: '120px', height: '120px' }}>
                <div className="qclay-gauge-circle"></div>
                <div className="qclay-gauge-circle" style={{ width: '85px', height: '85px', borderDasharray: '2,2' }}></div>
                <div className="qclay-gauge-dot"></div>
                <strong className="tabular-nums" style={{ fontSize: '20px', color: '#10b981', position: 'absolute', fontWeight: 600 }}>{realizationRatio}%</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '20px' }}>
                <span>Overdue: <strong className="tabular-nums" style={{ color: 'var(--danger)' }}>{arrearsRatio}%</strong></span>
                <span>Staged: <strong className="tabular-nums" style={{ color: '#fff' }}>₹{totalArrears.toLocaleString()} Owed</strong></span>
              </div>
            </div>

          </div>

          {/* Invoices audits ledger table */}
          <div className="qclay-card qclay-hologram-glow">
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#fff', marginBottom: '24px' }}>Bursar Clearance Auditing Ledger</h3>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>
                    <th style={{ padding: '14px' }}>Student Profile</th>
                    <th style={{ padding: '14px' }}>Tuition Items</th>
                    <th style={{ padding: '14px' }}>Grand Total Owed</th>
                    <th style={{ padding: '14px' }}>Payment Status</th>
                    <th style={{ padding: '14px' }}>Clearance Audits</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => {
                    const stud = students.find(s => s.id === inv.studentId || s.id === inv.student_id);
                    return (
                      <tr key={inv.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                        <td style={{ padding: '14px' }}>
                          <strong style={{ display: 'block', color: '#fff' }}>{stud?.first_name} {stud?.last_name}</strong>
                          <span className="tabular-nums" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Roll: {stud?.student_id_number}</span>
                        </td>
                        <td style={{ padding: '14px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {inv.items?.map((it, idx) => (
                              <span key={idx} style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>• {it.name} (<span className="tabular-nums">₹{it.amount.toLocaleString()}</span>)</span>
                            ))}
                          </div>
                        </td>
                        <td className="tabular-nums" style={{ padding: '14px', fontWeight: 700, color: '#fff' }}>₹{inv.total_amount.toLocaleString()}</td>
                        <td style={{ padding: '14px' }}>
                          <span className={`invoice-badge ${inv.status.toLowerCase()}`}>{inv.status}</span>
                        </td>
                        <td style={{ padding: '14px' }}>
                          {inv.status === 'PENDING' ? (
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button className="qclay-btn-pill" style={{ padding: '6px 14px', fontSize: '11px' }} onClick={() => handleAuditPaymentReceipt(inv.id, true)}>Authorize</button>
                              <button className="qclay-btn-pill secondary" style={{ padding: '6px 14px', fontSize: '11px', color: 'var(--danger)' }} onClick={() => handleAuditPaymentReceipt(inv.id, false)}>Reject</button>
                              <button className="qclay-btn-pill secondary" style={{ padding: '6px', border: 'none' }} onClick={() => alert('Viewing uploaded transaction verification slips.')} aria-label="View invoice receipt details">
                                <FileText size={14} aria-hidden="true" />
                              </button>
                            </div>
                          ) : inv.status === 'PAID' ? (
                            <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircle size={14} aria-hidden="true" /> Reconciled & Approved
                            </span>
                          ) : (
                            <span style={{ fontStyle: 'italic', fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>Awaiting receipt upload…</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* Tab 4: Announcements Broadcast notice creation */}
      {adminTab === 'announce' && (
        <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '32px' }}>
          <div className="qclay-card" style={{ height: 'fit-content' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#fff', marginBottom: '20px' }}>Create Global Broadcast Notice</h3>
            
            <form onSubmit={handlePostAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label htmlFor="announcement-urgency" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>Urgency Level *</label>
                <select 
                  id="announcement-urgency"
                  className="qclay-input-capsule" style={{ appearance: 'none', background: 'rgba(255,255,255,0.02)' }} value={announcementForm.urgency}
                  onChange={e => setAnnouncementForm({ ...announcementForm, urgency: e.target.value })}
                >
                  <option value="CRITICAL" style={{ background: '#09090d' }}>CRITICAL URGENT ALERT (Red banner)</option>
                  <option value="NOTICE" style={{ background: '#09090d' }}>Standard Operational Notice (Yellow)</option>
                  <option value="INFO" style={{ background: '#09090d' }}>Platform Information update (Blue)</option>
                </select>
              </div>

              <div>
                <label htmlFor="announcement-title" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>Bulletin Headline *</label>
                <input 
                  id="announcement-title"
                  type="text" className="qclay-input-capsule" placeholder="e.g. Examinations Timetables Released" required
                  value={announcementForm.title} onChange={e => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="announcement-content" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>Notice Details *</label>
                <textarea 
                  id="announcement-content"
                  className="qclay-input-capsule" style={{ minHeight: '110px', resize: 'none', borderRadius: '16px' }} placeholder="Provide detailed bulletin instructions…" required
                  value={announcementForm.content} onChange={e => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
                />
              </div>

              <button type="submit" className="qclay-btn-pill">
                <Bell size={14} aria-hidden="true" /> Broadcast Notice
              </button>
            </form>
          </div>

          <div className="qclay-card">
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#fff', marginBottom: '24px' }}>Active Bulletin Archive ({announcements.length})</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {announcements.map(ann => (
                <div 
                  key={ann.id} className="qclay-card" 
                  style={{ 
                    padding: '16px 20px', background: 'rgba(255,255,255,0.01)', borderLeft: `3px solid ${
                      ann.urgency === 'CRITICAL' ? 'var(--danger)' : ann.urgency === 'NOTICE' ? 'var(--abes-gold)' : 'var(--abes-blue)'
                    }`, borderRadius: '16px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '14px', color: '#fff' }}>{ann.title}</strong>
                    <span className="tabular-nums" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{new Date(ann.created_at).toLocaleString()}</span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '8px', lineHeight: '1.4' }}>{ann.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: System Audit Trails */}
      {adminTab === 'audit' && (
        <div className="qclay-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <Shield size={20} aria-hidden="true" color="rgba(255,255,255,0.6)" /> Security Action Audit Trails
            </h3>
            <button className="qclay-btn-pill secondary" onClick={handleExportAuditLogs}>
              <Download size={14} aria-hidden="true" /> Export Audit Logs (.JSON)
            </button>
          </div>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '24px' }}>Absolute secure operational events compiled dynamically to ensure FERPA compliant transparency.</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px', overflowY: 'auto' }}>
            {systemAuditLogs.map(log => (
              <div key={log.id} style={{ display: 'flex', justify: 'space-between', fontSize: '12px', background: 'rgba(255,255,255,0.01)', padding: '12px 18px', borderRadius: '16px', borderLeft: '3px solid var(--abes-blue)', borderTop: '1px solid rgba(255,255,255,0.02)', borderRight: '1px solid rgba(255,255,255,0.02)', borderRight: '1px solid rgba(255,255,255,0.02)' }}>
                <div>
                  <span style={{ color: 'var(--abes-gold)', fontWeight: 800, marginRight: '10px' }}>{log.action}</span>
                  <span style={{ color: '#fff' }}>{log.details}</span>
                  <span style={{ display: 'block', fontSize: '10px', color: 'rgba(255,255,255,0.35)', marginTop: '4px' }}>Triggered by: <strong>{log.user_email}</strong></span>
                </div>
                <span className="tabular-nums" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px' }}>{new Date(log.timestamp).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 6: Attendance Marks Configuration */}
      {adminTab === 'attendance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div>
            <h3 className="display-title" style={{ fontSize: '20px', marginBottom: '8px' }}>Attendance to Marks Mapping Configuration</h3>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>Configure the conversion scale for attendance percentages to internal marks (max 5) per course.</span>
          </div>

          {courses.map(course => (
            <div key={course.id} className="qclay-card" style={{ gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>{course.code} - {course.title}</h4>
                <button 
                  className="qclay-btn-pill"
                  onClick={() => handleSaveConfig(course.id)}
                  disabled={configSaving[course.id]}
                >
                  {configSaving[course.id] ? <RefreshCw className="animate-spin" size={14} /> : <CheckCircle size={14} />}
                  Save Config
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>
                      <th style={{ padding: '14px' }}>Min Percentage (%)</th>
                      <th style={{ padding: '14px' }}>Max Percentage (%)</th>
                      <th style={{ padding: '14px' }}>Marks Awarded (out of 5)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(attendanceConfigs[course.id] || []).map((band, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                        <td style={{ padding: '8px 14px' }}>
                          <input 
                            type="number" className="qclay-input-capsule" style={{ width: '100px', padding: '6px 12px' }}
                            value={band.min_percent} onChange={e => handleConfigChange(course.id, idx, 'min_percent', e.target.value)}
                          />
                        </td>
                        <td style={{ padding: '8px 14px' }}>
                          <input 
                            type="number" className="qclay-input-capsule" style={{ width: '100px', padding: '6px 12px' }}
                            value={band.max_percent} onChange={e => handleConfigChange(course.id, idx, 'max_percent', e.target.value)}
                          />
                        </td>
                        <td style={{ padding: '8px 14px' }}>
                          <input 
                            type="number" className="qclay-input-capsule" style={{ width: '100px', padding: '6px 12px' }}
                            value={band.marks_awarded} onChange={e => handleConfigChange(course.id, idx, 'marks_awarded', e.target.value)}
                          />
                        </td>
                      </tr>
                    ))}
                    {(!attendanceConfigs[course.id] || attendanceConfigs[course.id].length === 0) && (
                      <tr>
                        <td colSpan="3" style={{ padding: '14px', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>Loading configuration...</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

import React, { useState } from 'react';
import { 
  UserCheck, Calendar, List, Award, CreditCard, 
  CheckCircle, AlertCircle, Map, TrendingUp, Printer, 
  Upload, Download, Smartphone
} from 'lucide-react';
import { verifyTokenSignature, calculateGeodistance } from '../services/crypto';

export default function StudentConsole({
  currentUser,
  currentProfile,
  schedules,
  courses,
  rooms,
  syllabusList,
  invoices,
  studentAttendanceLogs,
  pdfBillInvoice,
  setPdfBillInvoice,
  uploadInvoiceId,
  setUploadInvoiceId,
  gpsSlider,
  setGpsSlider,
  handleScanDynamicQr,
  radarActive,
  studentGradesData,
  whatIfMarks,
  setWhatIfMarks,
  setCheckoutInvoice,
  handleUploadWireReceipt,
  pushNotification
}) {
  const [studentTab, setStudentTab] = useState('home');
  const [manualScannedToken, setManualScannedToken] = useState('');
  const [qrScanningActive, setQrScanningActive] = useState(false);

  const calculateAttendancePercentage = () => {
    if (studentAttendanceLogs.length === 0) return '100.0';
    const present = studentAttendanceLogs.filter(l => l.status === 'PRESENT' || l.status === 'LATE').length;
    return ((present / studentAttendanceLogs.length) * 100).toFixed(1);
  };

  const getSimulatedSgpa = () => {
    if (!studentGradesData.grades || studentGradesData.grades.length === 0) return '8.50';
    let totalPoints = 0;
    let totalCredits = 0;
    
    studentGradesData.grades.forEach(g => {
      const currentSimVal = whatIfMarks[g.course_id] !== undefined ? whatIfMarks[g.course_id] : g.marks_obtained;
      let gp = 0;
      if (currentSimVal >= 90) gp = 10;
      else if (currentSimVal >= 80) gp = 9;
      else if (currentSimVal >= 70) gp = 8;
      else if (currentSimVal >= 60) gp = 7;
      else if (currentSimVal >= 50) gp = 6;
      else gp = 5;

      totalPoints += gp * g.credits;
      totalCredits += g.credits;
    });

    return totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '8.50';
  };

  const currentSimSgpa = Number(getSimulatedSgpa());

  const handlePerformAntiCheatCheckin = (e) => {
    e.preventDefault();
    if (!manualScannedToken) {
      pushNotification('error', 'Scanned token input cannot be empty.');
      return;
    }

    const parts = manualScannedToken.split(':');
    if (parts.length !== 5) {
      pushNotification('error', 'Security Breach: Invalid QR Token signature encoding.');
      return;
    }

    const [timestamp, scheduleId, roomXStr, roomYStr, signature] = parts;
    const roomX = Number(roomXStr);
    const roomY = Number(roomYStr);

    const studentX = roomX + (gpsSlider > 20 ? (gpsSlider * 1.5) : (gpsSlider * 0.2));
    const studentY = roomY + (gpsSlider > 20 ? (gpsSlider * 1.2) : (gpsSlider * 0.1));

    const distance = calculateGeodistance(studentX, studentY, roomX, roomY);

    if (distance > 15) {
      pushNotification('error', `Geofence Violation: Student coordinates outside classroom geofence proximity threshold (${distance.toFixed(1)}m > 15m limit).`);
      return;
    }

    const validation = verifyTokenSignature(signature, timestamp, scheduleId, roomX, roomY);

    if (!validation.valid) {
      if (validation.reason === 'TOKEN_EXPIRED') {
        pushNotification('error', 'Security Timeout: Token expired. Shared attendance screenshot detected.');
      } else {
        pushNotification('error', 'Cryptographic Error: Signature authentication failed. Roster call blocked.');
      }
      return;
    }

    pushNotification('success', `Roster check-in validated successfully! Distance: ${distance.toFixed(1)}m. Secure transaction logged.`);
    setManualScannedToken('');
    setQrScanningActive(false);
    
    handleScanDynamicQr();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', position: 'relative' }}>
      
      {/* Aurora glow effect */}
      <div className="aurora-backdrop" style={{ top: '-15%', left: '20%', opacity: 0.35 }} aria-hidden="true"></div>

      {/* Premium Capsule Tab Selector Menu */}
      <div className="qclay-subnav-capsule" role="tablist" aria-label="Student Actions Console">
        <button 
          className={`qclay-subnav-item ${studentTab === 'home' ? 'active' : ''}`} 
          onClick={() => setStudentTab('home')} 
          role="tab"
          aria-selected={studentTab === 'home'}
        >
          <UserCheck size={14} aria-hidden="true" /> Attendance & Map
        </button>
        <button 
          className={`qclay-subnav-item ${studentTab === 'schedule' ? 'active' : ''}`} 
          onClick={() => setStudentTab('schedule')} 
          role="tab"
          aria-selected={studentTab === 'schedule'}
        >
          <Calendar size={14} aria-hidden="true" /> Academic Timetable
        </button>
        <button 
          className={`qclay-subnav-item ${studentTab === 'syllabus' ? 'active' : ''}`} 
          onClick={() => setStudentTab('syllabus')} 
          role="tab"
          aria-selected={studentTab === 'syllabus'}
        >
          <List size={14} aria-hidden="true" /> Course Progress
        </button>
        <button 
          className={`qclay-subnav-item ${studentTab === 'grades' ? 'active' : ''}`} 
          onClick={() => setStudentTab('grades')} 
          role="tab"
          aria-selected={studentTab === 'grades'}
        >
          <Award size={14} aria-hidden="true" /> Grades & CGPA
        </button>
        <button 
          className={`qclay-subnav-item ${studentTab === 'billing' ? 'active' : ''}`} 
          onClick={() => setStudentTab('billing')} 
          role="tab"
          aria-selected={studentTab === 'billing'}
        >
          <CreditCard size={14} aria-hidden="true" /> Tuition Invoices
        </button>
      </div>

      {/* Tab 1: Attendance & Mapping */}
      {studentTab === 'home' && (
        <div className="qclay-tab-panel" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px', flexWrap: 'wrap' }}>
            
            {/* Eligibility Ring Panel */}
            <div className="qclay-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '20px' }}>
              <div>
                <h3 className="display-title" style={{ fontSize: '20px', marginBottom: '8px' }}>Eligibility Index Matrix</h3>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>ABES mandates a minimum of 75% attendance to qualify for terminal exams.</span>
              </div>

              <div style={{ display: 'flex', gap: '32px', alignItems: 'center', flexWrap: 'wrap' }}>
                
                {/* SVG circular gauge */}
                <div style={{ position: 'relative', width: '120px', height: '120px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <svg width="120" height="120" style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
                    <circle cx="60" cy="60" r="50" fill="transparent" stroke="rgba(255,255,255,0.02)" strokeWidth="6" />
                    <circle 
                      cx="60" 
                      cy="60" 
                      r="50" 
                      fill="transparent" 
                      stroke={Number(calculateAttendancePercentage()) >= 75 ? '#ffffff' : '#ef4444'} 
                      strokeWidth="6" 
                      strokeDasharray={`${2 * Math.PI * 50}`} 
                      strokeDashoffset={`${2 * Math.PI * 50 * (1 - Number(calculateAttendancePercentage()) / 100)}`} 
                      style={{ transition: 'stroke-dashoffset 0.8s ease' }} 
                    />
                  </svg>
                  <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <strong className="tabular-nums" style={{ fontSize: '20px', color: '#fff', fontWeight: 600 }}>{calculateAttendancePercentage()}%</strong>
                    <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: '0.05em' }}>ATTENDED</span>
                  </div>
                </div>

                <div style={{ flex: 1, minWidth: '180px' }}>
                  {Number(calculateAttendancePercentage()) >= 75 ? (
                    <span style={{ color: '#ffffff', fontWeight: 700, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle size={16} style={{ color: '#10b981' }} aria-hidden="true" /> Examination Qualified
                    </span>
                  ) : (
                    <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <AlertCircle size={16} aria-hidden="true" /> Attendance Shortage Blocked
                    </span>
                  )}
                  <span style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '8px', lineHeight: '1.5' }}>
                    Scholastic check-ins: <strong className="tabular-nums" style={{ color: '#fff' }}>{studentAttendanceLogs.filter(l => l.status === 'PRESENT' || l.status === 'LATE').length}</strong> / <span className="tabular-nums">{studentAttendanceLogs.length}</span> lecture slots.
                  </span>
                </div>
              </div>
            </div>

            {/* Anti-cheat Proximity Sign-in */}
            <div className="qclay-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '20px' }}>
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--abes-gold)', marginBottom: '8px', letterSpacing: '0.05em' }}>ANTI-CHEAT GEOFENCE SWEEP</h4>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.5' }}>Proximity sweep requires user GPS coordinates to fall within a 15-meter threshold of Lecture Room 102.</p>
                
                <div style={{ margin: '16px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '8px' }}>
                    <span className="tabular-nums">GPS Proximity: <strong>{gpsSlider}m</strong></span>
                    <span style={{ color: gpsSlider > 15 ? '#ef4444' : '#10b981', fontWeight: 700 }}>{gpsSlider > 15 ? "OUT OF BOUNDS" : "INSIDE GEOFENCE"}</span>
                  </div>
                  <input 
                    aria-label="Set classroom proximity GPS distance slider"
                    type="range" min="3" max="40" value={gpsSlider} 
                    onChange={e => setGpsSlider(Number(e.target.value))} 
                    style={{ 
                      width: '100%', 
                      accentColor: '#ffffff',
                      height: '4px',
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: '2px',
                      outline: 'none'
                    }} 
                  />
                </div>
              </div>

              {qrScanningActive ? (
                <form onSubmit={handlePerformAntiCheatCheckin} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input 
                    aria-label="Enter dynamic raw QR checkin token"
                    type="text" className="qclay-input-capsule" style={{ fontSize: '11px', padding: '10px 16px' }}
                    placeholder="Paste broadcast payload signature..."
                    value={manualScannedToken} 
                    onChange={e => setManualScannedToken(e.target.value)} 
                    required
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="submit" className="qclay-btn-pill" style={{ flex: 1, padding: '8px 12px', fontSize: '12px' }}>Verify Signature</button>
                    <button type="button" className="qclay-btn-pill secondary" style={{ padding: '8px 14px', fontSize: '12px' }} onClick={() => setQrScanningActive(false)}>X</button>
                  </div>
                </form>
              ) : (
                <button 
                  className="qclay-btn-pill" 
                  onClick={() => setQrScanningActive(true)}
                  style={{ width: '100%', background: '#ffffff', color: '#040406' }}
                >
                  Scan Dynamic QR Token
                </button>
              )}
            </div>

          </div>

          {/* Premium Vector Blueprint Map with Radar Pulse */}
          <div className="qclay-card" style={{ gap: '20px' }}>
            <div>
              <h3 className="display-title" style={{ fontSize: '20px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Map size={18} aria-hidden="true" style={{ color: '#fff' }} /> Geofencing Real-time Blueprint Map
              </h3>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>Vector grid representation displaying target classroom anchors and scholar coordinate alignment.</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
              <svg width="100%" height="220" viewBox="0 0 480 220" style={{ background: '#050508', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '20px' }} aria-hidden="true">
                <defs>
                  <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255, 255, 255, 0.015)" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
                
                {/* Block 1 */}
                <rect x="30" y="30" width="130" height="110" rx="16" fill="rgba(255,255,255,0.01)" stroke="rgba(255,255,255,0.05)" strokeWidth="1.5" />
                <text x="95" y="85" fill="rgba(255,255,255,0.3)" fontSize="10" fontWeight="700" textAnchor="middle" letterSpacing="0.05em">B-BLOCK LAB</text>
                
                {/* Room 102 Area */}
                <rect x="290" y="30" width="160" height="120" rx="16" fill="rgba(255,255,255,0.01)" stroke={gpsSlider > 15 ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.1)"} strokeWidth="1.5" />
                <text x="370" y="85" fill={gpsSlider > 15 ? "#ef4444" : "#ffffff"} fontSize="10" fontWeight="700" textAnchor="middle" letterSpacing="0.05em">CSE ROOM 102</text>
                
                {/* Proximity Circle */}
                <circle cx="370" cy="90" r="35" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="4 4" />
                <circle cx="370" cy="90" r="3.5" fill="#ffffff" />
                
                {/* Dynamic radar animation waves */}
                {radarActive && (
                  <circle cx={gpsSlider <= 15 ? 370 : 200} cy={gpsSlider <= 15 ? 90 : 105} r="4" fill="none" stroke={gpsSlider <= 15 ? "#ffffff" : "#ef4444"} strokeWidth="1.5">
                    <animate attributeName="r" values="4;70" dur="2.2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.8;0" dur="2.2s" repeatCount="indefinite" />
                  </circle>
                )}
                
                {/* Active Student position node */}
                {gpsSlider <= 15 ? (
                  <g transform="translate(370, 90)">
                    <circle cx="0" cy="0" r="10" fill="#ffffff" opacity="0.15" />
                    <circle cx="0" cy="0" r="5" fill="#ffffff" />
                  </g>
                ) : (
                  <g transform="translate(200, 105)">
                    <circle cx="0" cy="0" r="10" fill="#ef4444" opacity="0.15" />
                    <circle cx="0" cy="0" r="5" fill="#ef4444" />
                  </g>
                )}
                
                <text x="240" y="195" fill="rgba(255,255,255,0.3)" fontSize="10" fontWeight="500" textAnchor="middle">
                  {gpsSlider <= 15 ? "Scholar geofence verified. Signature sequence active." : "Proximity Warning: Outside target classroom parameters."}
                </text>
              </svg>
            </div>
          </div>

          {/* Verification Logs list */}
          <div className="qclay-card" style={{ gap: '20px' }}>
            <h3 className="display-title" style={{ fontSize: '18px' }}>Attendance Transaction Logs</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {studentAttendanceLogs.map(l => (
                <div 
                  key={l.id} 
                  className="qclay-card" 
                  style={{ 
                    padding: '16px 20px', 
                    background: '#0c0c12', 
                    display: 'flex', 
                    flexDirection: 'row',
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.03)'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <strong style={{ fontSize: '14px', color: '#fff' }}>Secure Coordinate Check-in</strong>
                    <span className="tabular-nums" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{new Date(l.timestamp).toLocaleString()}</span>
                  </div>
                  <span className={`qclay-badge-pill ${l.status === 'PRESENT' ? 'success' : l.status === 'LATE' ? 'warning' : 'danger'}`} style={{ fontSize: '9px' }}>{l.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Timetable */}
      {studentTab === 'schedule' && (
        <div className="qclay-card qclay-tab-panel" style={{ gap: '28px' }}>
          <div>
            <h3 className="display-title" style={{ fontSize: '20px', marginBottom: '8px' }}>Personal Curriculum Timetable</h3>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>Assigned scholastic timetable schedules, classroom indexes, and calendar slots.</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {schedules.map(sc => {
              const c = courses.find(item => item.id === sc.course_id);
              const r = rooms.find(item => item.id === sc.room_id);
              return (
                <div 
                  key={sc.id} 
                  className="qclay-card qclay-hologram-glow" 
                  style={{ 
                    padding: '20px 24px', 
                    background: '#0c0c12',
                    borderRadius: '20px',
                    border: '1px solid rgba(255,255,255,0.03)',
                    borderLeft: '4px solid #ffffff'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, marginBottom: '6px' }}>
                    <span style={{ color: 'var(--abes-gold)', letterSpacing: '0.05em' }}>{sc.day.toUpperCase()}</span>
                    <span className="tabular-nums" style={{ color: 'rgba(255,255,255,0.4)' }}>{sc.time_window}</span>
                  </div>
                  <h4 style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>{c?.code} • {c?.title}</h4>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', display: 'block', marginTop: '6px' }}>Lecture Hall Location: <strong style={{ color: '#fff' }}>{r?.name}</strong></span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Student Tab 3: Syllabus Tracking Panel */}
      {studentTab === 'syllabus' && (
        <div className="qclay-card qclay-tab-panel" style={{ gap: '28px' }}>
          <div>
            <h3 className="display-title" style={{ fontSize: '20px', marginBottom: '8px' }}>CSE Syllabus Completion Index</h3>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>Track official syllabus progression percentages and topic completions.</span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {syllabusList.map(syl => (
              <div 
                key={syl.id} 
                className="qclay-card" 
                style={{ 
                  padding: '24px', 
                  background: '#0c0c12',
                  borderRadius: '20px',
                  border: '1px solid rgba(255,255,255,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700 }}>
                  <span style={{ color: 'var(--abes-gold)', letterSpacing: '0.05em' }}>{syl.code} • {syl.title}</span>
                  <span className="tabular-nums" style={{ color: syl.coverage_percentage >= 75 ? '#10b981' : '#ffffff' }}>PROGRESS: {syl.coverage_percentage}%</span>
                </div>
                
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>{syl.unit_name}</div>
                
                {/* Thin custom meter bar */}
                <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.02)', borderRadius: '99px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      width: `${syl.coverage_percentage}%`, 
                      height: '100%', 
                      background: 'linear-gradient(90deg, #ffffff 0%, rgba(255,255,255,0.3) 100%)', 
                      borderRadius: '99px', 
                      transition: 'width 0.4s ease' 
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Student Tab 4: Transcripts and grades Benchmarking */}
      {studentTab === 'grades' && (
        <div className="qclay-tab-panel" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px', flexWrap: 'wrap' }}>
            
            {/* Elegant Wireframe Standings Graph */}
            <div className="qclay-card" style={{ gap: '20px' }}>
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--abes-gold)', letterSpacing: '0.05em', marginBottom: '4px' }}>PEER BENCHMARK STANDINGS</h4>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Real-time ranking comparing individual lecture standings against class average.</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                <svg width="100%" height="150" viewBox="0 0 440 150" aria-hidden="true" style={{ background: '#050508', border: '1px solid rgba(255,255,255,0.02)', borderRadius: '16px', padding: '10px' }}>
                  {/* Grid Lines */}
                  <line x1="40" y1="20" x2="400" y2="20" stroke="rgba(255,255,255,0.015)" strokeWidth="1" />
                  <line x1="40" y1="60" x2="400" y2="60" stroke="rgba(255,255,255,0.015)" strokeWidth="1" />
                  <line x1="40" y1="100" x2="400" y2="100" stroke="rgba(255,255,255,0.015)" strokeWidth="1" />

                  {/* Class Mean Path */}
                  <path d="M 40 100 L 150 75 L 260 90 L 370 55" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeDasharray="4 4" />
                  
                  {/* Liam Path */}
                  <path d="M 40 40 L 150 50 L 260 65 L 370 35" fill="none" stroke="#ffffff" strokeWidth="2.5" />
                  
                  {/* Graph Anchors */}
                  <circle cx="40" cy="40" r="4.5" fill="#ffffff" stroke="#050508" strokeWidth="1" />
                  <circle cx="150" cy="50" r="4.5" fill="#ffffff" stroke="#050508" strokeWidth="1" />
                  <circle cx="260" cy="65" r="4.5" fill="#ffffff" stroke="#050508" strokeWidth="1" />
                  <circle cx="370" cy="35" r="4.5" fill="#ffffff" stroke="#050508" strokeWidth="1" />
                  
                  <text x="40" y="130" fill="rgba(255,255,255,0.3)" fontSize="9" fontWeight="600" textAnchor="middle">CS-601 (A+)</text>
                  <text x="150" y="130" fill="rgba(255,255,255,0.3)" fontSize="9" fontWeight="600" textAnchor="middle">CS-602 (A)</text>
                  <text x="260" y="130" fill="rgba(255,255,255,0.3)" fontSize="9" fontWeight="600" textAnchor="middle">IT-601 (B+)</text>
                  <text x="370" y="130" fill="rgba(255,255,255,0.3)" fontSize="9" fontWeight="600" textAnchor="middle">ME-601 (O)</text>
                  
                  <circle cx="310" cy="15" r="3.5" fill="#ffffff" />
                  <text x="320" y="18" fill="rgba(255,255,255,0.4)" fontSize="9" fontWeight="700">MY GRADE</text>
                  <line x1="210" y1="15" x2="230" y2="15" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeDasharray="3 3" />
                  <text x="238" y="18" fill="rgba(255,255,255,0.4)" fontSize="9" fontWeight="700">CLASS AVG</text>
                </svg>
              </div>
            </div>

            {/* What-If GPA Target Simulator Card */}
            {studentGradesData.grades && studentGradesData.grades.length > 0 && (
              <div className="qclay-card" style={{ gap: '20px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--abes-gold)', letterSpacing: '0.05em', marginBottom: '4px' }}>WHAT-IF GPA SIMULATOR</h4>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Slide target marks to simulate SGPA standings.</span>
                  </div>
                  
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>SIMULATED SGPA</span>
                    <strong className="tabular-nums" style={{ fontSize: '24px', color: '#fff', display: 'block' }}>{getSimulatedSgpa()} / 10.00</strong>
                    <span className={`qclay-badge-pill ${currentSimSgpa >= 8.5 ? 'success' : 'neutral'}`} style={{ fontSize: '9px', marginTop: '4px' }}>
                      {currentSimSgpa >= 8.5 ? "HONOURS CLASSIFICATION" : "FIRST DIVISION BAND"}
                    </span>
                  </div>
                </div>

                {/* Eligibility waiver banner */}
                <div 
                  style={{
                    padding: '12px 16px', 
                    borderRadius: '16px', 
                    background: currentSimSgpa >= 8.5 ? 'rgba(16,185,129,0.03)' : 'rgba(255,255,255,0.01)',
                    border: `1px solid ${currentSimSgpa >= 8.5 ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.03)'}`,
                    display: 'flex', 
                    gap: '10px', 
                    alignItems: 'center'
                  }}
                >
                  <Smartphone size={15} aria-hidden="true" color={currentSimSgpa >= 8.5 ? '#10b981' : 'rgba(255,255,255,0.4)'} />
                  <span style={{ fontSize: '11px', color: currentSimSgpa >= 8.5 ? '#10b981' : 'rgba(255,255,255,0.45)', fontWeight: 500 }}>
                    {currentSimSgpa >= 8.5 
                      ? "Eligibility waivers met: SGPA standing meets Honours threshold criteria." 
                      : "Honours warning: Projections below 8.50 CGPA waiver retention limits."
                    }
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                  {studentGradesData.grades.map(g => {
                    const currentSimVal = whatIfMarks[g.course_id] !== undefined ? whatIfMarks[g.course_id] : g.marks_obtained;
                    return (
                      <div key={g.id} style={{ background: 'rgba(255,255,255,0.01)', padding: '10px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.02)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '6px', fontWeight: 600 }}>
                          <span>{g.code} • {g.title}</span>
                          <span className="tabular-nums" style={{ color: 'var(--abes-gold)' }}>{currentSimVal}%</span>
                        </div>
                        <input 
                          aria-label={`Slide target grade percentage for course ${g.code}`}
                          type="range" min="30" max="100" value={currentSimVal} 
                          onChange={e => setWhatIfMarks({ ...whatIfMarks, [g.course_id]: parseInt(e.target.value, 10) })}
                          style={{ 
                            width: '100%', 
                            accentColor: '#ffffff',
                            height: '4px',
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '2px',
                            outline: 'none'
                          }} 
                        />
                      </div>
                    );
                  })}
                </div>

                <button 
                  className="qclay-btn-pill secondary" 
                  style={{ width: '100%', padding: '8px', fontSize: '11px' }}
                  onClick={() => {
                    const resetObj = {};
                    studentGradesData.grades.forEach(g => {
                      resetObj[g.course_id] = g.marks_obtained;
                    });
                    setWhatIfMarks(resetObj);
                    pushNotification('info', 'Simulator reset to permanent registry standing.');
                  }}
                >
                  Reset Projections
                </button>
              </div>
            )}

          </div>

          <div className="qclay-card" style={{ gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h3 className="display-title" style={{ fontSize: '20px', marginBottom: '4px' }}>Certified Digital Academic Transcript</h3>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>Permanent ledger entries representing authorized grade registry records.</span>
              </div>
              <button 
                className="qclay-btn-pill secondary" 
                style={{ padding: '8px 16px', fontSize: '12px', height: '40px' }} 
                onClick={() => setPdfBillInvoice({ 
                  id: 'transcript-' + currentProfile.id, 
                  total_amount: 0.0, 
                  issue_date: '2026-05-30', 
                  due_date: 'Official Release', 
                  status: 'PAID', 
                  items: studentGradesData.grades.map(g => ({ name: `${g.code}: ${g.title} (${g.grade_letter})`, amount: 0.0 })) 
                })}
              >
                <Printer size={13} aria-hidden="true" /> View Transcript PDF
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', flexWrap: 'wrap' }}>
              <div className="qclay-card" style={{ padding: '20px', borderLeft: '4px solid var(--abes-gold)', background: '#0c0c12' }}>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', display: 'block', fontWeight: 700 }}>SEMESTER GPA (SGPA)</span>
                <strong className="tabular-nums" style={{ fontSize: '28px', color: '#fff', display: 'block', marginTop: '6px', fontWeight: 600 }}>{studentGradesData.sgpa} / 10.00</strong>
                <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 500 }}>First Division Honours Standing</span>
              </div>
              <div className="qclay-card" style={{ padding: '20px', borderLeft: '4px solid #ffffff', background: '#0c0c12' }}>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', display: 'block', fontWeight: 700 }}>CURRICULUM CREDITS</span>
                <strong className="tabular-nums" style={{ fontSize: '28px', color: '#fff', display: 'block', marginTop: '6px', fontWeight: 600 }}>{studentGradesData.totalCredits} Sec</strong>
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)' }}>100% Core courses completed</span>
              </div>
            </div>

            <div style={{ overflowX: 'auto', width: '100%' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>
                    <th style={{ padding: '12px 10px' }}>COURSE</th>
                    <th style={{ padding: '12px 10px' }}>TITLE</th>
                    <th style={{ padding: '12px 10px' }}>CREDITS</th>
                    <th style={{ padding: '12px 10px' }}>GRADE</th>
                    <th style={{ padding: '12px 10px', textAlign: 'right' }}>SCORE (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {studentGradesData.grades.map(g => (
                    <tr key={g.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                      <td style={{ padding: '14px 10px', fontWeight: 700, color: '#fff' }}>{g.code}</td>
                      <td style={{ padding: '14px 10px', color: 'rgba(255,255,255,0.8)' }}>{g.title}</td>
                      <td className="tabular-nums" style={{ padding: '14px 10px', color: 'rgba(255,255,255,0.4)' }}>{g.credits}</td>
                      <td style={{ padding: '14px 10px' }}>
                        <span className="qclay-badge-pill success" style={{ fontSize: '9px', padding: '3px 8px', fontWeight: 800 }}>
                          {g.grade_letter}
                        </span>
                      </td>
                      <td className="tabular-nums" style={{ padding: '14px 10px', textAlign: 'right', fontWeight: 600, color: '#fff' }}>{g.marks_obtained}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Fee statement */}
      {studentTab === 'billing' && (
        <div className="qclay-card qclay-tab-panel" style={{ gap: '28px' }}>
          <div>
            <h3 className="display-title" style={{ fontSize: '20px', marginBottom: '8px' }}>University Ledger Fee Statements</h3>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>Track fee statements, clear outstanding balances, or upload transactions receipts.</span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {invoices.filter(i => i.studentId === currentProfile.id || i.student_id === currentProfile.id).map(inv => {
              let badgeType = 'neutral';
              if (inv.status === 'PAID') badgeType = 'success';
              else if (inv.status === 'UNPAID') badgeType = 'danger';
              else if (inv.status === 'PENDING') badgeType = 'warning';

              return (
                <div 
                  key={inv.id} 
                  className="qclay-card qclay-hologram-glow" 
                  style={{ 
                    padding: '24px', 
                    background: '#0c0c12',
                    borderRadius: '20px',
                    border: '1px solid rgba(255,255,255,0.03)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                    <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.4)' }}>REF REFERENCE: #{inv.id}</span>
                    <span className={`qclay-badge-pill ${badgeType}`} style={{ fontSize: '10px' }}>{inv.status}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '16px', marginBottom: '16px' }}>
                    {inv.items?.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <span style={{ color: 'rgba(255,255,255,0.45)' }}>{item.name}</span>
                        <span className="tabular-nums" style={{ color: '#fff', fontWeight: 500 }}>₹{item.amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 700, marginBottom: '20px' }}>
                    <span style={{ color: '#fff' }}>Semester Balance Total</span>
                    <span className="tabular-nums" style={{ color: 'var(--abes-gold)' }}>₹{inv.total_amount.toLocaleString()}</span>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {inv.status === 'UNPAID' && (
                      <div style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '220px' }}>
                        <button 
                          className="qclay-btn-pill" 
                          style={{ flex: 1, padding: '8px', fontSize: '12px', background: '#ffffff', color: '#040406' }} 
                          onClick={() => setCheckoutInvoice(inv)}
                        >
                          <CreditCard size={13} aria-hidden="true" /> Pay Online
                        </button>
                        <button 
                          className="qclay-btn-pill secondary" 
                          style={{ flex: 1, padding: '8px', fontSize: '12px' }} 
                          onClick={() => setUploadInvoiceId(inv.id)}
                        >
                          <Upload size={13} aria-hidden="true" /> Upload Receipt
                        </button>
                      </div>
                    )}
                    {inv.status === 'PENDING' && (
                      <div className="qclay-badge-pill warning" style={{ flex: 1, justifyContent: 'center', padding: '10px', fontSize: '11px' }}>
                        UNDER AUDIT VERIFICATION REVIEW
                      </div>
                    )}
                    <button 
                      className="qclay-btn-pill secondary" 
                      style={{ padding: '8px 18px', fontSize: '12px', height: '40px' }} 
                      onClick={() => setPdfBillInvoice(inv)}
                    >
                      <Printer size={13} aria-hidden="true" /> Print Invoice
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {uploadInvoiceId && (
            <div 
              className="qclay-card" 
              style={{ 
                marginTop: '24px', 
                padding: '24px', 
                background: 'rgba(245, 158, 11, 0.02)', 
                border: '1px solid rgba(245, 158, 11, 0.1)', 
                borderRadius: '20px',
                gap: '16px' 
              }}
            >
              <div>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--abes-gold)', display: 'block', marginBottom: '4px' }}>ATTACH WIRE TRANSACTION RECEIPT</span>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.4' }}>Submit wire receipt payment screenshot. Processing occurs securely within client context.</p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="qclay-btn-pill" onClick={handleUploadWireReceipt} style={{ fontSize: '11px', padding: '8px 16px' }}>Submit screenshot.png</button>
                <button className="qclay-btn-pill secondary" onClick={() => setUploadInvoiceId(null)} style={{ fontSize: '11px', padding: '8px 16px' }}>Discard</button>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

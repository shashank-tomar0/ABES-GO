import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, Award, List, QrCode, CheckCircle, 
  RefreshCw, CheckSquare as SaveIcon
} from 'lucide-react';
import { generateTokenSignature } from '../services/crypto';

export default function FacultyConsole({
  currentUser,
  currentProfile,
  students,
  schedules,
  courses,
  syllabusList,
  activeLectureSchedule,
  setActiveLectureSchedule,
  facultyRosterList,
  handleCycleFacultyRoster,
  handleSaveFacultyBatch,
  gradingCourseId,
  setGradingCourseId,
  allGradesList,
  gradingStudentMarks,
  setGradingStudentMarks,
  gradingStudentLoading,
  gradingStudentSuccess,
  handlePostTermGrade,
  handleUpdateSyllabusProgress,
  pushNotification
}) {
  const [facultyTab, setFacultyTab] = useState('roster');
  const [facultyQrSpinning, setFacultyQrSpinning] = useState(false);
  const [facultyQrToken, setFacultyQrToken] = useState('TOKEN-INIT-101');
  const [facultyRawToken, setFacultyRawToken] = useState('');

  // Filter schedules taught by the logged-in instructor
  const facultySchedules = schedules.filter(sc => sc.instructor_id === currentProfile?.id);
  const facultyCourseIds = facultySchedules.map(sc => sc.course_id);
  const facultyCourses = courses.filter(c => facultyCourseIds.includes(c.id));

  // Determine active schedule's course
  const activeSchedule = schedules.find(sc => sc.id === activeLectureSchedule);
  const activeCourseId = activeSchedule ? activeSchedule.course_id : null;

  // Sync activeLectureSchedule to faculty's own schedules
  useEffect(() => {
    if (facultySchedules.length > 0) {
      const exists = facultySchedules.some(sc => sc.id === activeLectureSchedule);
      if (!exists) {
        setActiveLectureSchedule(facultySchedules[0].id);
      }
    }
  }, [activeLectureSchedule, facultySchedules, setActiveLectureSchedule]);

  // Sync gradingCourseId to faculty's own courses
  useEffect(() => {
    if (facultyCourses.length > 0) {
      const exists = facultyCourses.some(c => c.id === gradingCourseId);
      if (!exists) {
        setGradingCourseId(facultyCourses[0].id);
      }
    }
  }, [gradingCourseId, facultyCourses, setGradingCourseId]);

  // Filter student rows in Roster and Grading panels to show only enrolled students
  const activeCourseStudents = students.filter(stud => 
    allGradesList.some(g => g.student_id === stud.id && g.course_id === activeCourseId)
  );

  const gradingCourseStudents = students.filter(stud => 
    allGradesList.some(g => g.student_id === stud.id && g.course_id === gradingCourseId)
  );

  // Cryptographic time-decaying dynamic QR rotation
  useEffect(() => {
    let interval;
    if (facultyQrSpinning) {
      const updateToken = () => {
        const timestamp = Date.now();
        const roomX = 375;
        const roomY = 80;
        
        // Generate secure signature
        const sig = generateTokenSignature(timestamp, activeLectureSchedule, roomX, roomY);
        // Pack into time-decay payload
        const packedPayload = `${timestamp}:${activeLectureSchedule}:${roomX}:${roomY}:${sig}`;
        
        setFacultyQrToken(sig.substr(0, 10).toUpperCase());
        setFacultyRawToken(packedPayload);
      };
      
      updateToken();
      interval = setInterval(updateToken, 15000);
    }
    return () => clearInterval(interval);
  }, [facultyQrSpinning, activeLectureSchedule]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', position: 'relative' }}>
      
      {/* Aurora nebulas visual backdrop */}
      <div className="aurora-backdrop" style={{ top: '-20%', left: '40%', opacity: 0.35 }} aria-hidden="true"></div>

      {/* Modern Capsule Tab Selector Row */}
      <div className="qclay-subnav-capsule" role="tablist" aria-label="Faculty Console Modules">
        <button 
          className={`qclay-subnav-item ${facultyTab === 'roster' ? 'active' : ''}`} 
          onClick={() => setFacultyTab('roster')} 
          role="tab"
          aria-selected={facultyTab === 'roster'}
        >
          <CheckSquare size={14} aria-hidden="true" /> Attendance Roster Logger
        </button>
        <button 
          className={`qclay-subnav-item ${facultyTab === 'grades' ? 'active' : ''}`} 
          onClick={() => setFacultyTab('grades')} 
          role="tab"
          aria-selected={facultyTab === 'grades'}
        >
          <Award size={14} aria-hidden="true" /> Term Grading Portal
        </button>
        <button 
          className={`qclay-subnav-item ${facultyTab === 'syllabus' ? 'active' : ''}`} 
          onClick={() => setFacultyTab('syllabus')} 
          role="tab"
          aria-selected={facultyTab === 'syllabus'}
        >
          <List size={14} aria-hidden="true" /> Course Syllabus Progress
        </button>
        <button 
          className={`qclay-subnav-item ${facultyTab === 'qr' ? 'active' : ''}`} 
          onClick={() => setFacultyTab('qr')} 
          role="tab"
          aria-selected={facultyTab === 'qr'}
        >
          <QrCode size={14} aria-hidden="true" /> Dynamic QR Broadcast
        </button>
      </div>

      {/* Faculty Tab 1: Attendance roster */}
      {facultyTab === 'roster' && (
        <div className="qclay-card qclay-tab-panel" style={{ gap: '28px' }}>
          <div>
            <h3 className="display-title" style={{ fontSize: '20px', marginBottom: '8px' }}>Faculty Class Roster Ledger</h3>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>Commence class register sessions by validating scholars database profiles.</span>
          </div>
          
          <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '220px' }}>
              <label htmlFor="lecture-selector" style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '8px', fontWeight: 700, letterSpacing: '0.05em' }}>SELECT SCHEDULED BLOCK</label>
              <select 
                id="lecture-selector" 
                className="qclay-input-capsule" 
                value={activeLectureSchedule} 
                onChange={e => setActiveLectureSchedule(e.target.value)}
                style={{ paddingRight: '40px', appearance: 'none', backgroundPosition: 'right 20px center' }}
              >
                {facultySchedules.map(sc => {
                  const c = courses.find(item => item.id === sc.course_id);
                  return <option key={sc.id} value={sc.id} style={{ background: '#09090d', color: '#fff' }}>{c?.code} ({sc.day} - {sc.time_window})</option>
                })}
              </select>
            </div>
            <button className="qclay-btn-pill" onClick={handleSaveFacultyBatch} style={{ height: '45px' }}>
              <CheckCircle size={15} aria-hidden="true" /> Save & Commit Roster Call
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {activeCourseStudents.length === 0 ? (
              <div className="qclay-card" style={{ padding: '24px', textAlign: 'center', background: '#0c0c12', color: 'rgba(255,255,255,0.4)', borderRadius: '20px', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
                No students enrolled in this course module.
              </div>
            ) : (
              activeCourseStudents.map(stud => {
                const st = facultyRosterList[stud.id] || 'PRESENT';
                let badgeType = 'neutral';
                if (st === 'PRESENT') badgeType = 'success';
                else if (st === 'ABSENT') badgeType = 'danger';
                else if (st === 'LATE') badgeType = 'warning';
                else if (st === 'EXEMPTED') badgeType = 'neutral';

                return (
                  <button 
                    key={stud.id} 
                    className="qclay-card qclay-hologram-glow" 
                    style={{ 
                      width: '100%', 
                      padding: '16px 24px', 
                      background: '#0c0c12',
                      display: 'flex', 
                      flexDirection: 'row',
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      cursor: 'pointer',
                      borderRadius: '20px',
                      border: '1px solid rgba(255, 255, 255, 0.04)',
                      borderLeft: `4px solid ${st === 'PRESENT' ? '#10b981' : st === 'ABSENT' ? '#ef4444' : st === 'LATE' ? '#f59e0b' : st === 'EXEMPTED' ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.25)'}`,
                      color: '#fff',
                      textAlign: 'left'
                    }}
                    onClick={() => handleCycleFacultyRoster(stud.id)}
                    aria-label={`Cycle attendance status for student ${stud.first_name} ${stud.last_name}`}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <strong style={{ fontSize: '15px', display: 'block', fontWeight: 600 }}>{stud.first_name} {stud.last_name}</strong>
                      <span className="tabular-nums" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Roll Index: {stud.student_id_number}</span>
                    </div>
                    <span className={`qclay-badge-pill ${badgeType}`} style={{ fontSize: '10px', minWidth: '80px', justifyContent: 'center' }}>{st}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Faculty Tab: Term Grading Portal */}
      {facultyTab === 'grades' && (
        <div className="qclay-card qclay-tab-panel" style={{ gap: '28px' }}>
          <div>
            <h3 className="display-title" style={{ fontSize: '20px', marginBottom: '8px' }}>Faculty Term Grading Panel</h3>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>Log and post student assessment marks directly to their certified digital transcript registries.</span>
          </div>
          
          <div>
            <label htmlFor="course-selector" style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '8px', fontWeight: 700, letterSpacing: '0.05em' }}>SELECT ACTIVE COURSE MODULE</label>
            <select id="course-selector" className="qclay-input-capsule" value={gradingCourseId} onChange={e => setGradingCourseId(e.target.value)}>
              {facultyCourses.map(c => <option key={c.id} value={c.id} style={{ background: '#09090d', color: '#fff' }}>{c.code} - {c.title}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {gradingCourseStudents.length === 0 ? (
              <div className="qclay-card" style={{ padding: '24px', textAlign: 'center', background: '#0c0c12', color: 'rgba(255,255,255,0.4)', borderRadius: '20px', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
                No students enrolled in the selected course.
              </div>
            ) : (
              gradingCourseStudents.map(stud => {
                const currentGradeRecord = allGradesList.find(g => g.student_id === stud.id && g.course_id === gradingCourseId);
                const officialMark = currentGradeRecord ? currentGradeRecord.marks_obtained : 'Not Set';
                const officialGrade = currentGradeRecord ? currentGradeRecord.grade_letter : '--';

                const scoreKey = `${stud.id}-${gradingCourseId}`;
                const customVal = gradingStudentMarks[scoreKey] !== undefined ? gradingStudentMarks[scoreKey] : (currentGradeRecord ? currentGradeRecord.marks_obtained : '');

                return (
                  <div 
                    key={stud.id} 
                    className="qclay-card" 
                    style={{ 
                      padding: '20px 24px', 
                      background: '#0c0c12', 
                      display: 'flex', 
                      flexDirection: 'row',
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '16px',
                      borderRadius: '20px'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <strong style={{ fontSize: '15px', display: 'block', fontWeight: 600 }}>{stud.first_name} {stud.last_name}</strong>
                      <span className="tabular-nums" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Roll Index: {stud.student_id_number}</span>
                      <span style={{ display: 'block', fontSize: '12px', color: 'var(--abes-gold)', marginTop: '4px', fontWeight: 500 }}>
                        Registry standing: <strong className="tabular-nums">{officialMark}% ({officialGrade})</strong>
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input 
                          aria-label={`Enter marks percentage for student ${stud.first_name} ${stud.last_name}`}
                          type="number" min="0" max="100" className="qclay-input-capsule" style={{ width: '90px', padding: '10px', fontSize: '13px', textAlign: 'center' }} 
                          placeholder="Marks %" value={customVal}
                          onChange={e => setGradingStudentMarks({ ...gradingStudentMarks, [scoreKey]: e.target.value })}
                          autoComplete="off"
                          spellCheck={false}
                        />
                        <span className="tabular-nums" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>%</span>
                      </div>

                      <button 
                        className="qclay-btn-pill" 
                        style={{ padding: '8px 18px', fontSize: '12px', height: '40px' }}
                        disabled={gradingStudentLoading[scoreKey]}
                        onClick={() => handlePostTermGrade(stud.id, gradingCourseId)}
                      >
                        {gradingStudentLoading[scoreKey] ? (
                          <RefreshCw size={12} className="animate-spin" aria-hidden="true" />
                        ) : gradingStudentSuccess[scoreKey] ? (
                          <SaveIcon size={12} style={{ color: '#10b981' }} aria-hidden="true" />
                        ) : "Post Grade"}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Faculty Tab 2: Syllabus Progress Editor */}
      {facultyTab === 'syllabus' && (
        <div className="qclay-card qclay-tab-panel" style={{ gap: '28px' }}>
          <div>
            <h3 className="display-title" style={{ fontSize: '20px', marginBottom: '8px' }}>Syllabus Coverage Tracking Portal</h3>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>Log unit completions relative to standard ABES CSE academic course syllabi. Tap cards to increase percentage metrics.</span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {syllabusList.map(syl => (
              <button 
                key={syl.id} 
                className="qclay-card qclay-hologram-glow" 
                style={{ 
                  width: '100%', 
                  textAlign: 'left', 
                  display: 'flex', 
                  flexDirection: 'column',
                  padding: '24px', 
                  background: '#0c0c12', 
                  cursor: 'pointer', 
                  border: '1px solid rgba(255,255,255,0.04)', 
                  color: '#fff', 
                  borderRadius: '20px', 
                  gap: '12px' 
                }}
                onClick={() => handleUpdateSyllabusProgress(syl.id, syl.coverage_percentage)}
                aria-label={`Increment syllabus coverage for course ${syl.code}`}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', width: '100%', fontWeight: 700 }}>
                  <span style={{ color: 'var(--abes-gold)', letterSpacing: '0.05em' }}>{syl.code} • {syl.title}</span>
                  <span className="tabular-nums" style={{ color: '#fff' }}>UNIT COVERAGE: {syl.coverage_percentage}%</span>
                </div>
                
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff', textAlign: 'left' }}>{syl.unit_name}</div>
                
                {/* Visual elegant progress meter */}
                <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.02)', borderRadius: '99px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      width: `${syl.coverage_percentage}%`, 
                      height: '100%', 
                      background: 'linear-gradient(90deg, #ffffff 0%, rgba(255,255,255,0.3) 100%)', 
                      borderRadius: '99px', 
                      transition: 'width 0.4s cubic-bezier(0.1, 0.8, 0.3, 1)' 
                    }}
                  ></div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Faculty Tab 3: QR Broadcast */}
      {facultyTab === 'qr' && (
        <div className="qclay-card qclay-tab-panel" style={{ gap: '28px', alignItems: 'center', textAlign: 'center' }}>
          <div>
            <h3 className="display-title" style={{ fontSize: '20px', marginBottom: '8px' }}>Dynamic Cryptographic QR Token Broadcaster</h3>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', maxWidth: '540px', display: 'block', margin: '0 auto' }}>
              Broadcast secure, geofenced one-time check-in tokens. System auto-recalculates signature profiles every **15 seconds** with dynamic coordinates mapping.
            </span>
          </div>

          {/* Concentric 3D Wireframe Vector Widget */}
          <div style={{ position: 'relative', width: '260px', height: '260px', margin: '12px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            
            {/* Outer Concentric Spinning Ring */}
            <svg 
              width="260" 
              height="260" 
              style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(0deg)', transition: 'transform 0.5s ease', animation: facultyQrSpinning ? 'spin 16s linear infinite' : 'none' }}
            >
              <circle cx="130" cy="130" r="110" fill="none" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="1" />
              <circle cx="130" cy="130" r="110" fill="none" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="1.5" strokeDasharray="30 150" />
            </svg>
            
            {/* Middle Reverse Ring */}
            <svg 
              width="260" 
              height="260" 
              style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(0deg)', transition: 'transform 0.5s ease', animation: facultyQrSpinning ? 'spin 10s linear infinite reverse' : 'none' }}
            >
              <circle cx="130" cy="130" r="85" fill="none" stroke="rgba(255, 255, 255, 0.02)" strokeWidth="1" />
              <circle cx="130" cy="130" r="85" fill="none" stroke="rgba(255, 255, 255, 0.22)" strokeWidth="1.5" strokeDasharray="20 80" />
            </svg>

            {/* Orbiting Orb Meter */}
            <div className="qclay-gauge-wrap" style={{ width: '220px', height: '220px', position: 'absolute' }}>
              <div className="qclay-gauge-circle" style={{ border: '1px solid rgba(255,255,255,0.01)' }}></div>
              {facultyQrSpinning && <div className="qclay-gauge-dot" style={{ animationDuration: '7s' }}></div>}
            </div>

            {/* Secure Code payload center block */}
            <div style={{ position: 'absolute', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <QrCode size={105} color={facultyQrSpinning ? '#ffffff' : 'rgba(255,255,255,0.2)'} />
            </div>

            {facultyQrSpinning && (
              <div 
                title={facultyRawToken}
                style={{ 
                  position: 'absolute', bottom: '15px', left: '50%', transform: 'translateX(-50%)', 
                  background: '#ffffff', color: '#040406', fontSize: '11px', padding: '6px 14px', 
                  borderRadius: '9999px', fontWeight: 800, whiteSpace: 'nowrap', maxWidth: '180px', 
                  overflow: 'hidden', textOverflow: 'ellipsis', border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
                }}
              >
                {facultyQrToken}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', alignItems: 'center' }}>
            <button 
              className="qclay-btn-pill" 
              style={{ background: facultyQrSpinning ? '#ef4444' : '#ffffff', color: facultyQrSpinning ? '#ffffff' : '#040406' }} 
              onClick={() => {
                setFacultyQrSpinning(!facultyQrSpinning);
                pushNotification('info', facultyQrSpinning ? 'Secure QR token broadcast terminated.' : 'Dynamic coordinates verification active.');
              }}
            >
              {facultyQrSpinning ? "Terminate Token Broadcast" : "Initialize Secure QR Broadcast"}
            </button>

            {facultyQrSpinning && (
              <div 
                className="qclay-card" 
                style={{ 
                  width: '100%', 
                  maxWidth: '540px', 
                  padding: '16px 20px', 
                  background: '#0c0c12', 
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.04)'
                }}
              >
                <span className="tabular-nums" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', display: 'block', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                  Dynamic Cryptographic Payload Signature: <strong style={{ color: '#fff' }}>{facultyRawToken}</strong>
                </span>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

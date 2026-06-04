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

  // Internal Marks State
  const [internalTab, setInternalTab] = useState('assignments');
  const [internalCourseId, setInternalCourseId] = useState(null);
  const [internalData, setInternalData] = useState(null);
  const [internalCalcData, setInternalCalcData] = useState({});
  const [internalLoading, setInternalLoading] = useState(false);
  const [internalForm, setInternalForm] = useState({});
  const [quizForm, setQuizForm] = useState({ title: '', date_conducted: '' });
  const [activeQuizId, setActiveQuizId] = useState(null);
  const [bonusForm, setBonusForm] = useState({});

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
      if (!internalCourseId) {
        setInternalCourseId(facultyCourses[0].id);
      }
    }
  }, [gradingCourseId, facultyCourses, setGradingCourseId, internalCourseId]);

  const activeInternalCourseStudents = students.filter(stud => 
    allGradesList.some(g => g.student_id === stud.id && g.course_id === internalCourseId)
  );

  const fetchInternalMarksData = async () => {
    if (!internalCourseId || facultyTab !== 'internal') return;
    setInternalLoading(true);
    try {
      const res = await fetch(`http://localhost:3000/api/internal/${internalCourseId}`, {
        headers: { 'x-user-id': currentUser.id, 'x-user-role': currentUser.role }
      });
      const data = await res.json();
      if (!data.error) {
        setInternalData(data);
        if (data.quizzes?.length > 0 && !activeQuizId) {
          setActiveQuizId(data.quizzes[0].id);
        }
        
        // Fetch calculations for all students
        const calcs = {};
        for (const stud of activeInternalCourseStudents) {
          const calcRes = await fetch(`http://localhost:3000/api/internal/${internalCourseId}/${stud.id}`, {
            headers: { 'x-user-id': currentUser.id, 'x-user-role': currentUser.role }
          });
          const calcData = await calcRes.json();
          if (!calcData.error) calcs[stud.id] = calcData;
        }
        setInternalCalcData(calcs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setInternalLoading(false);
    }
  };

  useEffect(() => {
    fetchInternalMarksData();
  }, [internalCourseId, facultyTab]);

  const handleInternalMarkSave = async (studentId, type, payload) => {
    try {
      let endpoint = '';
      if (type === 'assignments') endpoint = `/api/internal/assignments/${internalCourseId}/${studentId}/marks`;
      else if (type === 'quiz') endpoint = `/api/internal/quizzes/${payload.quizId}/${studentId}/marks`;
      else if (type === 'bonus') endpoint = `/api/internal/bonus/${internalCourseId}/${studentId}`;
      else if (type === 'sessional') endpoint = `/api/internal/sessional/${internalCourseId}/${payload.testNumber}/marks`;

      const res = await fetch(`http://localhost:3000${endpoint}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to save marks');
      pushNotification('success', 'Marks saved successfully.');
      fetchInternalMarksData();
    } catch (err) {
      pushNotification('error', err.message);
    }
  };

  const handleCreateQuiz = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`http://localhost:3000/api/internal/quizzes/${internalCourseId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role
        },
        body: JSON.stringify(quizForm)
      });
      if (!res.ok) throw new Error('Failed to create quiz');
      pushNotification('success', 'Quiz created successfully.');
      setQuizForm({ title: '', date_conducted: '' });
      fetchInternalMarksData();
    } catch (err) {
      pushNotification('error', err.message);
    }
  };

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
        <button 
          className={`qclay-subnav-item ${facultyTab === 'internal' ? 'active' : ''}`} 
          onClick={() => setFacultyTab('internal')} 
          role="tab"
          aria-selected={facultyTab === 'internal'}
        >
          <Award size={14} aria-hidden="true" /> Internal Marks
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

      {/* Faculty Tab 4: Internal Marks Portal */}
      {facultyTab === 'internal' && (
        <div className="qclay-tab-panel" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '32px', alignItems: 'start' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Top Controls */}
            <div className="qclay-card" style={{ padding: '24px', gap: '20px' }}>
              <div>
                <h3 className="display-title" style={{ fontSize: '20px', marginBottom: '8px' }}>Internal Assessment Marks</h3>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>Manage continuous evaluation records (Assignments, Quizzes, Sessionals, and Bonuses).</span>
              </div>
              
              <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '220px' }}>
                  <label htmlFor="internal-course-selector" style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '8px', fontWeight: 700, letterSpacing: '0.05em' }}>SELECT COURSE CONTEXT</label>
                  <select 
                    id="internal-course-selector" 
                    className="qclay-input-capsule" 
                    value={internalCourseId || ''} 
                    onChange={e => setInternalCourseId(e.target.value)}
                    style={{ paddingRight: '40px', appearance: 'none' }}
                  >
                    {facultyCourses.map(c => <option key={c.id} value={c.id} style={{ background: '#09090d', color: '#fff' }}>{c.code} - {c.title}</option>)}
                  </select>
                </div>
              </div>

              {internalData?.is_locked && (
                <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Lock size={14} color="#ef4444" />
                  <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 600 }}>LOCKED: Administrative freeze is active for this course. All fields are read-only.</span>
                </div>
              )}

              {/* Internal Sub-Tabs */}
              <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                {['assignments', 'quizzes', 'sessionals', 'bonus'].map(tab => (
                  <button 
                    key={tab}
                    className={`qclay-btn-pill ${internalTab === tab ? '' : 'secondary'}`}
                    style={{ padding: '6px 14px', fontSize: '12px' }}
                    onClick={() => setInternalTab(tab)}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Assignments View */}
            {internalTab === 'assignments' && (
              <div className="qclay-card" style={{ padding: '24px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '20px' }}>Assignments Log (Max 10)</h4>
                {activeInternalCourseStudents.map(stud => {
                  const sId = stud.id;
                  const currentRec = internalData?.assignments?.find(a => a.student_id === sId) || {};
                  const localState = internalForm[`asn_${sId}`] || { ...currentRec };
                  return (
                    <div key={sId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ width: '180px' }}>
                        <strong style={{ fontSize: '14px', color: '#fff', display: 'block' }}>{stud.first_name} {stud.last_name}</strong>
                        <span className="tabular-nums" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{stud.student_id_number}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        {[1, 2, 3, 4, 5].map(num => {
                          const val = localState[`a${num}`];
                          return (
                            <div key={num} style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>A{num}</span>
                              <input 
                                type="number" min="0" max="10" 
                                className="premium-input" 
                                style={{ width: '60px', padding: '8px', textAlign: 'center', fontSize: '12px' }}
                                value={val === undefined || val === null ? '' : val}
                                onChange={e => setInternalForm(prev => ({ ...prev, [`asn_${sId}`]: { ...localState, [`a${num}`]: e.target.value === '' ? null : Number(e.target.value) } }))}
                                disabled={internalData?.is_locked}
                              />
                              {(val === undefined || val === null || val === '') && <span className="qclay-badge-pill danger" style={{ fontSize: '8px', padding: '2px 4px' }}>MISSING</span>}
                            </div>
                          );
                        })}
                      </div>
                      <button 
                        className="qclay-btn-pill" style={{ padding: '8px 16px', fontSize: '11px' }}
                        disabled={internalData?.is_locked}
                        onClick={() => handleInternalMarkSave(sId, 'assignments', { 
                          a1: localState.a1, a2: localState.a2, a3: localState.a3, a4: localState.a4, a5: localState.a5 
                        })}
                      >
                        Save
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Quizzes View */}
            {internalTab === 'quizzes' && (
              <div className="qclay-card" style={{ padding: '24px', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>Quizzes Log (Max 10)</h4>
                  {!internalData?.is_locked && (
                    <form onSubmit={handleCreateQuiz} style={{ display: 'flex', gap: '8px' }}>
                      <input type="text" className="premium-input" style={{ padding: '6px 12px', fontSize: '12px' }} placeholder="Quiz Title" value={quizForm.title} onChange={e => setQuizForm({...quizForm, title: e.target.value})} required />
                      <input type="date" className="premium-input" style={{ padding: '6px 12px', fontSize: '12px' }} value={quizForm.date_conducted} onChange={e => setQuizForm({...quizForm, date_conducted: e.target.value})} required />
                      <button type="submit" className="qclay-btn-pill" style={{ fontSize: '11px' }}>Add Quiz</button>
                    </form>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
                  {internalData?.quizzes?.map(q => (
                    <button 
                      key={q.id} className={`qclay-btn-pill ${activeQuizId === q.id ? '' : 'secondary'}`} style={{ fontSize: '11px', padding: '6px 12px' }}
                      onClick={() => setActiveQuizId(q.id)}
                    >
                      {q.title}
                    </button>
                  ))}
                  {(!internalData?.quizzes || internalData.quizzes.length === 0) && <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>No quizzes created yet.</span>}
                </div>

                {activeQuizId && (
                  <div>
                    {activeInternalCourseStudents.map(stud => {
                      const marks = internalData?.quizMarks?.filter(qm => qm.quiz_id === activeQuizId && qm.student_id === stud.id) || [];
                      const val = internalForm[`quiz_${activeQuizId}_${stud.id}`] !== undefined ? internalForm[`quiz_${activeQuizId}_${stud.id}`] : (marks.length ? marks[0].marks : '');
                      
                      const studCalcs = internalCalcData[stud.id]?.calculation?.components?.quiz || { scores: [], isTop5: () => false };
                      const isTop5 = studCalcs.scores.some(s => s.id === activeQuizId && s.isTop5);

                      return (
                        <div key={stud.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ width: '180px' }}>
                            <strong style={{ fontSize: '13px', color: '#fff', display: 'block' }}>{stud.first_name} {stud.last_name}</strong>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            {isTop5 && <span className="qclay-badge-pill success" style={{ fontSize: '9px' }}>TOP 5</span>}
                            <input 
                              type="number" min="0" max="10" className="premium-input" style={{ width: '80px', padding: '6px', textAlign: 'center' }}
                              value={val} onChange={e => setInternalForm(prev => ({ ...prev, [`quiz_${activeQuizId}_${stud.id}`]: e.target.value }))}
                              disabled={internalData?.is_locked}
                            />
                            <button 
                              className="qclay-btn-pill secondary" style={{ fontSize: '11px', padding: '6px 12px' }} disabled={internalData?.is_locked}
                              onClick={() => handleInternalMarkSave(stud.id, 'quiz', { quizId: activeQuizId, marks: Number(val) })}
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Sessionals View */}
            {internalTab === 'sessionals' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                {[1, 2, 3].map(stNum => {
                  const maxMarks = stNum === 3 ? 40 : 30;
                  return (
                    <div key={stNum} className="qclay-card" style={{ padding: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>ST {stNum}</h4>
                        <span className="qclay-badge-pill neutral" style={{ fontSize: '10px' }}>Max: {maxMarks}</span>
                      </div>
                      <input type="date" className="premium-input" style={{ marginBottom: '16px', padding: '6px 12px', fontSize: '12px' }} disabled={internalData?.is_locked} />
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {activeInternalCourseStudents.map(stud => {
                          const marks = internalData?.sessionals?.find(s => s.test_number === stNum && s.student_id === stud.id);
                          const val = internalForm[`st_${stNum}_${stud.id}`] !== undefined ? internalForm[`st_${stNum}_${stud.id}`] : (marks ? marks.marks : '');
                          
                          const bestTests = internalCalcData[stud.id]?.calculation?.components?.sessional?.best_tests || [];
                          const isBest = bestTests.some(t => t.test_number === stNum);

                          return (
                            <div key={stud.id} style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '8px', borderRadius: '8px', border: isBest ? '1px solid rgba(255,255,255,0.1)' : 'none', background: isBest ? 'rgba(255,255,255,0.02)' : 'transparent' }} className={isBest ? 'qclay-hologram-glow' : ''}>
                              <span style={{ fontSize: '12px', flex: 1, color: '#fff' }}>{stud.first_name}</span>
                              <input 
                                type="number" min="0" max={maxMarks} className="premium-input" style={{ width: '60px', padding: '4px', textAlign: 'center', fontSize: '12px' }}
                                value={val} onChange={e => setInternalForm(prev => ({ ...prev, [`st_${stNum}_${stud.id}`]: e.target.value }))}
                                disabled={internalData?.is_locked}
                              />
                            </div>
                          );
                        })}
                      </div>
                      <button 
                        className="qclay-btn-pill" style={{ width: '100%', marginTop: '16px', fontSize: '11px' }} disabled={internalData?.is_locked}
                        onClick={() => {
                          const updates = activeInternalCourseStudents.map(stud => ({
                            studentId: stud.id,
                            marks: Number(internalForm[`st_${stNum}_${stud.id}`])
                          })).filter(u => !isNaN(u.marks));
                          handleInternalMarkSave(null, 'sessional', { testNumber: stNum, studentMarks: updates });
                        }}
                      >
                        Bulk Save ST{stNum}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bonus View */}
            {internalTab === 'bonus' && (
              <div className="qclay-card" style={{ padding: '24px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '20px' }}>Bonus Points</h4>
                {activeInternalCourseStudents.map(stud => {
                  const bRec = internalData?.bonus?.find(b => b.student_id === stud.id);
                  const fMarks = bonusForm[`m_${stud.id}`] !== undefined ? bonusForm[`m_${stud.id}`] : (bRec ? bRec.marks : '');
                  const fReason = bonusForm[`r_${stud.id}`] !== undefined ? bonusForm[`r_${stud.id}`] : (bRec ? bRec.reason : '');
                  
                  return (
                    <div key={stud.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ width: '160px' }}>
                        <strong style={{ fontSize: '13px', color: '#fff', display: 'block' }}>{stud.first_name} {stud.last_name}</strong>
                      </div>
                      <div style={{ display: 'flex', gap: '12px', flex: 1 }}>
                        <input 
                          type="number" min="0" max="5" className="premium-input" style={{ width: '80px', padding: '8px', fontSize: '12px' }} placeholder="Marks"
                          value={fMarks} onChange={e => setBonusForm(prev => ({ ...prev, [`m_${stud.id}`]: e.target.value }))} disabled={internalData?.is_locked}
                        />
                        <input 
                          type="text" className="premium-input" style={{ flex: 1, padding: '8px', fontSize: '12px' }} placeholder="Mandatory Reason"
                          value={fReason} onChange={e => setBonusForm(prev => ({ ...prev, [`r_${stud.id}`]: e.target.value }))} disabled={internalData?.is_locked}
                        />
                      </div>
                      <button 
                        className={`qclay-btn-pill ${bRec ? 'secondary' : ''}`} style={{ fontSize: '11px', marginLeft: '16px' }} disabled={internalData?.is_locked}
                        onClick={() => {
                          if (!fReason) return pushNotification('error', 'Reason is mandatory for bonus marks.');
                          handleInternalMarkSave(stud.id, 'bonus', { marks: Number(fMarks), reason: fReason });
                        }}
                      >
                        {bRec ? 'Edit Bonus' : 'Add Bonus'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Summary Panel */}
          <div className="qclay-card qclay-hologram-glow" style={{ position: 'sticky', top: '24px', padding: '24px', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>Summary Auditor</h3>
              <select 
                className="qclay-input-capsule" style={{ width: '140px', padding: '4px 8px', fontSize: '11px' }}
                onChange={e => setInternalForm(prev => ({ ...prev, activeSummaryStudent: e.target.value }))}
              >
                <option value="">Select Student...</option>
                {activeInternalCourseStudents.map(s => <option key={s.id} value={s.id} style={{ background: '#09090d' }}>{s.first_name}</option>)}
              </select>
            </div>

            {internalForm.activeSummaryStudent && internalCalcData[internalForm.activeSummaryStudent] ? (() => {
              const calc = internalCalcData[internalForm.activeSummaryStudent].calculation;
              const { assignments, quiz, sessional, attendance, bonus, grandTotal } = calc.summary;
              
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>Assignments Total</span>
                    <span className="tabular-nums" style={{ color: '#fff', fontWeight: 600 }}>{assignments.scaled} / 5</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>Quizzes (Top 5)</span>
                    <span className="tabular-nums" style={{ color: '#fff', fontWeight: 600 }}>{quiz.scaled} / 5</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>Sessionals (Best 2)</span>
                    <span className="tabular-nums" style={{ color: '#fff', fontWeight: 600 }}>{sessional.scaled} / 15</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>Attendance ({attendance.percent}%)</span>
                    <span className="tabular-nums" style={{ color: '#fff', fontWeight: 600 }}>{attendance.awarded} / 5</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>Bonus Marks</span>
                    <span className="tabular-nums" style={{ color: 'var(--abes-gold)', fontWeight: 600 }}>+{bonus.awarded}</span>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '8px' }}>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: '0.1em' }}>GRAND INTERNAL TOTAL</span>
                    <strong className="tabular-nums" style={{ fontSize: '42px', color: '#fff', fontWeight: 800, marginTop: '8px' }}>{grandTotal} <span style={{ fontSize: '20px', color: 'rgba(255,255,255,0.4)' }}>/ 30</span></strong>
                  </div>
                </div>
              );
            })() : (
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '40px 0', fontSize: '12px' }}>
                Select a student from the dropdown to view live calculation summary.
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}

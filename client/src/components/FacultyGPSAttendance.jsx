import React, { useState, useEffect, useRef } from 'react';
import { Play, MapPin, AlertCircle, CheckCircle, Clock, X, Check, Save } from 'lucide-react';

export default function FacultyGPSAttendance({ currentUser, courses, schedules, pushNotification }) {
  const [activeView, setActiveView] = useState('today'); // today, live, review
  const [session, setSession] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [responses, setResponses] = useState({ present: [], flagged: [], noResponse: [] });
  const [lateRequests, setLateRequests] = useState([]);
  const ws = useRef(null);
  const [qrFallback, setQrFallback] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  
  // States for review
  const [overrides, setOverrides] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Filter today's schedules
  const today = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];
  const todaysSchedules = schedules.filter(sc => sc.instructor_id === currentUser.id && sc.day === today);

  const handleStartSession = async (scheduleId) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/attendance/session/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id, 'x-user-role': 'faculty' },
        body: JSON.stringify({ schedule_id: scheduleId, qr_fallback_enabled: qrFallback })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      
      setSession(data);
      setCountdown(45);
      setActiveView('live');
      connectWebSocket(data.session_id);
    } catch (err) {
      pushNotification('error', err.message);
    }
  };

  const connectWebSocket = (sessionId) => {
    ws.current = new WebSocket(`${import.meta.env.VITE_API_URL.replace('http', 'ws').replace('/api', '')}?token=mock_jwt&session_id=${sessionId}`);
    ws.current.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'STUDENT_RESPONSE') {
        setResponses(prev => {
          const isFlagged = msg.auto_status === 'FLAGGED';
          return {
            ...prev,
            [isFlagged ? 'flagged' : 'present']: [...prev[isFlagged ? 'flagged' : 'present'], msg]
          };
        });
      }
    };
  };

  useEffect(() => {
    let timer;
    if (activeView === 'live' && countdown > 0) {
      timer = setInterval(() => setCountdown(c => c - 1), 1000);
    } else if (activeView === 'live' && countdown === 0) {
      // Auto transition to review
      setActiveView('review');
      fetchReviewData();
    }
    return () => clearInterval(timer);
  }, [activeView, countdown]);

  const fetchReviewData = async () => {
    if (!session) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/attendance/session/${session.session_id}/review`, {
        headers: { 'x-user-id': currentUser.id, 'x-user-role': 'faculty' }
      });
      const data = await res.json();
      if (!data.error) {
        setResponses({
          present: data.responses.auto_present,
          flagged: data.responses.flagged,
          noResponse: data.responses.out_of_range // + we should fetch enrolled students to diff for true no-response
        });
        setLateRequests(data.late_requests || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitReview = async () => {
    const hasUnresolvedFlags = responses.flagged.some(r => !overrides[r.student_id]);
    if (hasUnresolvedFlags) {
      pushNotification('error', 'Please resolve all flagged responses before submitting.');
      return;
    }
    
    setSubmitting(true);
    try {
      const ovArray = Object.keys(overrides).map(id => ({ student_id: id, ...overrides[id] }));
      const res = await fetch(`${import.meta.env.VITE_API_URL}/attendance/session/${session.session_id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id, 'x-user-role': 'faculty' },
        body: JSON.stringify({ overrides: ovArray })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      
      pushNotification('success', 'Attendance submitted successfully.');
      setActiveView('today');
      setSession(null);
    } catch (err) {
      pushNotification('error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="qclay-card qclay-tab-panel" style={{ gap: '28px' }}>
      {activeView === 'today' && (
        <>
          <div>
            <h3 className="display-title" style={{ fontSize: '20px', marginBottom: '8px' }}>Today's GPS Lectures</h3>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>Smart geofenced attendance sessions mapped to your schedule.</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px' }}>
            <input type="checkbox" id="qrFallback" checked={qrFallback} onChange={e => setQrFallback(e.target.checked)} />
            <label htmlFor="qrFallback" style={{ fontSize: '12px', color: '#fff' }}>Enable QR Fallback (for older devices)</label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
            {todaysSchedules.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', background: '#0c0c12', borderRadius: '16px' }}>
                No lectures scheduled for today.
              </div>
            ) : todaysSchedules.map(sc => {
              const course = courses.find(c => c.id === sc.course_id);
              return (
                <div key={sc.id} className="qclay-card" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ fontSize: '16px', color: '#fff', display: 'block' }}>{course?.title} ({course?.code})</strong>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>{sc.time_window} • Room {sc.room_id}</span>
                  </div>
                  <button className="qclay-btn-pill" onClick={() => handleStartSession(sc.id)}>
                    <Play size={14} /> Start Attendance
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {activeView === 'live' && (
        <div style={{ textAlign: 'center' }}>
          <h2 className="qclay-hologram-glow" style={{ fontSize: '48px', color: '#fff', margin: '20px 0', fontFamily: 'monospace' }}>
            00:{countdown.toString().padStart(2, '0')}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', textAlign: 'left', marginTop: '32px' }}>
            <div className="qclay-card" style={{ padding: '16px', borderTop: '2px solid #10b981' }}>
              <h4 style={{ color: '#10b981', marginBottom: '12px' }}>Present ({responses.present.length})</h4>
              {responses.present.map((r, i) => <div key={i} style={{ fontSize:'12px', padding:'8px', background:'rgba(255,255,255,0.05)', marginBottom:'4px', borderRadius:'4px' }}>{r.name}</div>)}
            </div>
            <div className="qclay-card" style={{ padding: '16px', borderTop: '2px solid #f59e0b' }}>
              <h4 style={{ color: '#f59e0b', marginBottom: '12px' }}>Flagged ({responses.flagged.length})</h4>
              {responses.flagged.map((r, i) => <div key={i} style={{ fontSize:'12px', padding:'8px', background:'rgba(245,158,11,0.1)', marginBottom:'4px', borderRadius:'4px' }}>{r.name} <br/><span style={{fontSize:'9px', color:'#f59e0b'}}>{r.flag_reason}</span></div>)}
            </div>
            <div className="qclay-card" style={{ padding: '16px', borderTop: '2px solid rgba(255,255,255,0.2)' }}>
              <h4 style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '12px' }}>Awaiting...</h4>
            </div>
          </div>
        </div>
      )}

      {activeView === 'review' && (
        <>
          <div>
            <h3 className="display-title" style={{ fontSize: '20px', marginBottom: '8px' }}>Review Attendance</h3>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>Resolve flagged entries and confirm final roster.</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Flagged */}
            <div className="qclay-card" style={{ padding: '16px', borderColor: '#f59e0b' }}>
              <h4 style={{ color: '#f59e0b', marginBottom: '12px' }}>Needs Review ({responses.flagged.length})</h4>
              {responses.flagged.map(r => (
                <div key={r.student_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(255,255,255,0.02)', marginBottom: '8px', borderRadius: '8px' }}>
                  <div>
                    <strong style={{ fontSize: '14px', color: '#fff', display: 'block' }}>{r.first_name} {r.last_name}</strong>
                    <span className="qclay-badge-pill warning" style={{ fontSize: '9px', marginTop: '4px' }}>{r.flag_reason}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <select 
                      className="qclay-input-capsule" 
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                      value={overrides[r.student_id]?.final_status || ''}
                      onChange={e => setOverrides(prev => ({ ...prev, [r.student_id]: { ...prev[r.student_id], final_status: e.target.value } }))}
                    >
                      <option value="">--Select--</option>
                      <option value="PRESENT">Mark Present</option>
                      <option value="ABSENT">Mark Absent</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Present */}
            <div className="qclay-card" style={{ padding: '16px' }}>
              <h4 style={{ color: '#10b981', marginBottom: '12px' }}>Auto Present ({responses.present.length})</h4>
              {responses.present.map(r => (
                 <div key={r.student_id} style={{ fontSize:'13px', padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                   {r.first_name} {r.last_name} ({r.distance_m ? r.distance_m.toFixed(1) : 0}m away)
                 </div>
              ))}
            </div>

            <button className="qclay-btn-pill" onClick={handleSubmitReview} disabled={submitting} style={{ width: '100%', height: '48px', marginTop: '16px' }}>
              {submitting ? 'Submitting...' : 'Confirm & Submit Attendance'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

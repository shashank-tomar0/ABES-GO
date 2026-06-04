import React, { useState, useEffect } from 'react';
import { Play, MapPin, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { generateDeviceFingerprint } from '../services/deviceUtils';

export default function StudentGPSAttendance({ currentUser, courses, schedules, pushNotification }) {
  const [activeView, setActiveView] = useState('home'); // home, active
  const [deviceToken, setDeviceToken] = useState(localStorage.getItem('device_token') || null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { status, distance_m, message }
  
  // A mock active session that would normally be triggered by FCM or WebSocket
  const [activeSession, setActiveSession] = useState(null);
  
  useEffect(() => {
    // Register device on load
    const registerDevice = async () => {
      try {
        const fp = await generateDeviceFingerprint();
        const res = await fetch(`${import.meta.env.VITE_API_URL}/device/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id, 'x-user-role': 'student' },
          body: JSON.stringify({ device_fingerprint: fp })
        });
        const data = await res.json();
        if (data.success && data.device_token) {
          localStorage.setItem('device_token', data.device_token);
          setDeviceToken(data.device_token);
        }
      } catch (err) {
        console.error("Device register failed", err);
      }
    };
    if (!deviceToken) registerDevice();
  }, [currentUser, deviceToken]);

  const handleMarkPresent = async () => {
    if (!activeSession) return;
    setSubmitting(true);
    setResult(null);
    
    try {
      // Get GPS
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
      });
      
      const fp = await generateDeviceFingerprint();
      
      const res = await fetch(`${import.meta.env.VITE_API_URL}/attendance/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id, 'x-user-role': 'student' },
        body: JSON.stringify({
          session_id: activeSession.session_id,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          device_fingerprint: fp,
          device_token: deviceToken
        })
      });
      
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      
      setResult(data);
    } catch (err) {
      pushNotification('error', err.message);
      setResult({ status: 'ERROR', message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Mocking the incoming FCM notification to trigger an active session
  useEffect(() => {
    // In a real app this would be triggered by an FCM listener
    const mockBannerTimer = setTimeout(() => {
      // Just mock it so we can test the UI
      setActiveSession({ session_id: 'mock-session-123', course_name: 'CS-601' });
    }, 5000);
    return () => clearTimeout(mockBannerTimer);
  }, []);

  return (
    <div className="qclay-card qclay-tab-panel" style={{ gap: '28px', position: 'relative' }}>
      
      {activeSession && activeView === 'home' && (
        <div 
          className="qclay-card qclay-hologram-glow" 
          style={{ background: 'rgba(16, 185, 129, 0.1)', borderColor: '#10b981', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          onClick={() => setActiveView('active')}
        >
          <div>
            <strong style={{ color: '#10b981' }}>Attendance open for {activeSession.course_name}</strong>
            <span style={{ display: 'block', fontSize: '12px', color: '#fff' }}>Tap to mark present now.</span>
          </div>
          <Play color="#10b981" />
        </div>
      )}

      {activeView === 'home' && (
        <>
          <div>
            <h3 className="display-title" style={{ fontSize: '20px', marginBottom: '8px' }}>My Attendance History</h3>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>Track your lecture attendance.</span>
          </div>
          <div style={{ padding: '24px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', background: '#0c0c12', borderRadius: '16px' }}>
            No recent lectures today. Waiting for instructor.
          </div>
        </>
      )}

      {activeView === 'active' && (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <h2 style={{ fontSize: '24px', color: '#fff', marginBottom: '40px' }}>{activeSession?.course_name}</h2>
          
          {!result && (
            <button 
              className={`qclay-btn-pill ${submitting ? 'qclay-hologram-glow' : ''}`}
              style={{ width: '180px', height: '180px', borderRadius: '90px', fontSize: '18px', fontWeight: 'bold' }}
              onClick={handleMarkPresent}
              disabled={submitting}
            >
              {submitting ? 'Verifying GPS...' : 'MARK PRESENT'}
            </button>
          )}

          {result && result.status === 'PRESENT' && (
            <div style={{ color: '#10b981' }}>
              <CheckCircle size={64} style={{ margin: '0 auto 16px auto' }} />
              <h3 style={{ fontSize: '24px', fontWeight: 'bold' }}>PRESENT MARKED</h3>
              <p style={{ marginTop: '8px', opacity: 0.8 }}>Distance: {result.distance_m?.toFixed(1)}m</p>
            </div>
          )}

          {result && result.status === 'OUT_OF_RANGE' && (
            <div style={{ color: '#f59e0b' }}>
              <AlertCircle size={64} style={{ margin: '0 auto 16px auto' }} />
              <h3 style={{ fontSize: '24px', fontWeight: 'bold' }}>OUT OF RANGE</h3>
              <p style={{ marginTop: '8px', opacity: 0.8 }}>You are {result.distance_m?.toFixed(1)}m away. Must be &lt; 15m.</p>
              <button className="qclay-btn-pill" style={{ marginTop: '24px' }} onClick={handleMarkPresent}>Try Again</button>
            </div>
          )}

          {result && result.status === 'FLAGGED' && (
            <div style={{ color: '#f59e0b' }}>
              <AlertCircle size={64} style={{ margin: '0 auto 16px auto' }} />
              <h3 style={{ fontSize: '24px', fontWeight: 'bold' }}>SUBMITTED</h3>
              <p style={{ marginTop: '8px', opacity: 0.8 }}>Pending faculty review.</p>
            </div>
          )}
          
          {result && result.status === 'ERROR' && (
            <div style={{ color: '#ef4444' }}>
              <AlertCircle size={64} style={{ margin: '0 auto 16px auto' }} />
              <h3 style={{ fontSize: '24px', fontWeight: 'bold' }}>ERROR</h3>
              <p style={{ marginTop: '8px', opacity: 0.8 }}>{result.message}</p>
              <button className="qclay-btn-pill" style={{ marginTop: '24px' }} onClick={handleMarkPresent}>Retry</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

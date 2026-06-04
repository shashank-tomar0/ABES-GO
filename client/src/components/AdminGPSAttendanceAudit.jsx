import React, { useState, useEffect } from 'react';
import { MapPin, Search, AlertTriangle, CheckCircle, Smartphone } from 'lucide-react';

export default function AdminGPSAttendanceAudit({ currentUser }) {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/attendance/audit`, {
        headers: { 'x-user-id': currentUser.id, 'x-user-role': 'admin' }
      });
      const data = await res.json();
      if (!data.error) {
        setAuditLogs(data.logs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="qclay-card qclay-tab-panel" style={{ gap: '28px' }}>
      <div>
        <h3 className="display-title" style={{ fontSize: '20px', marginBottom: '8px' }}>GPS Attendance Audit Trails</h3>
        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>Monitor geofence violations, late joins, and device overrides.</span>
      </div>

      <div className="qclay-card" style={{ padding: '24px', background: '#0c0c12' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h4 style={{ fontSize: '16px', color: '#fff' }}>Recent Integrity Flags</h4>
          <button className="qclay-btn-pill" onClick={fetchAuditLogs} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh Logs'}
          </button>
        </div>

        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>
              <th style={{ padding: '12px' }}>Timestamp</th>
              <th style={{ padding: '12px' }}>Student ID</th>
              <th style={{ padding: '12px' }}>Event Type</th>
              <th style={{ padding: '12px' }}>Description</th>
            </tr>
          </thead>
          <tbody>
            {auditLogs.length === 0 ? (
              <tr><td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>No anomalies detected recently.</td></tr>
            ) : auditLogs.map(log => (
              <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                <td style={{ padding: '12px', color: 'rgba(255,255,255,0.7)' }}>{new Date(log.created_at).toLocaleString()}</td>
                <td style={{ padding: '12px', color: '#fff' }}>{log.student_id}</td>
                <td style={{ padding: '12px' }}>
                  <span className={`qclay-badge-pill ${log.event_type === 'GEOFENCE_VIOLATION' ? 'danger' : 'warning'}`}>
                    {log.event_type}
                  </span>
                </td>
                <td style={{ padding: '12px', color: 'rgba(255,255,255,0.7)' }}>{log.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

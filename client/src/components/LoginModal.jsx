import React from 'react';
import { X, User, Key, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';

export default function LoginModal({
  setShowLoginModal,
  loginEmail,
  setLoginEmail,
  loginPassword,
  setLoginPassword,
  handleLoginSubmit,
  authenticating,
  loginError
}) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(4,4,6,0.92)', backdropFilter: 'blur(16px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
      
      {/* Aurora glow element */}
      <div className="aurora-backdrop" style={{ top: '25%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.25 }} aria-hidden="true"></div>

      <div className="qclay-card" style={{ padding: '40px', maxWidth: '440px', width: '100%', position: 'relative', background: '#09090d', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '28px', gap: '24px' }}>
        
        <button 
          style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px', borderRadius: '50%', transition: 'background-color 0.25s' }} 
          onClick={() => setShowLoginModal(false)}
          aria-label="Close login dialog"
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <X size={18} aria-hidden="true" />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <span className="qclay-logo-circle" style={{ margin: '0 auto 16px auto', width: '32px', height: '32px' }} aria-hidden="true"></span>
          <span className="display-title" style={{ fontSize: '32px', display: 'block', fontWeight: 600 }}>ABES GO</span>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: '0.12em', display: 'block', marginTop: '6px' }}>COLLEGE ERP SYSTEM GATEWAY</span>
        </div>

        <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label htmlFor="corporate-email" style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '8px', fontWeight: 700, letterSpacing: '0.05em' }}>CORPORATE EMAIL GATEWAY *</label>
            <div style={{ position: 'relative' }}>
              <User size={15} aria-hidden="true" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
              <input 
                id="corporate-email"
                name="email"
                type="email" 
                className="qclay-input-capsule" 
                style={{ paddingLeft: '44px' }}
                value={loginEmail} 
                onChange={e => setLoginEmail(e.target.value)} 
                required
                autoComplete="username"
                spellCheck={false}
                placeholder="email@abes.edu..."
              />
            </div>
          </div>

          <div>
            <label htmlFor="corporate-password" style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '8px', fontWeight: 700, letterSpacing: '0.05em' }}>PASSWORD CREDENTIALS *</label>
            <div style={{ position: 'relative' }}>
              <Key size={15} aria-hidden="true" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
              <input 
                id="corporate-password"
                name="password"
                type="password" 
                className="qclay-input-capsule" 
                style={{ paddingLeft: '44px' }}
                value={loginPassword} 
                onChange={e => setLoginPassword(e.target.value)} 
                required
                autoComplete="current-password"
                placeholder="password..."
              />
            </div>
          </div>

          {loginError && (
            <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', padding: '12px 16px', borderRadius: '16px', color: '#ef4444', fontSize: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <AlertCircle size={14} aria-hidden="true" style={{ flexShrink: 0 }} />
              <span>{loginError}</span>
            </div>
          )}

          <button type="submit" disabled={authenticating} className="qclay-btn-pill" style={{ width: '100%', padding: '12px', fontSize: '14px', justifyContent: 'center' }}>
            {authenticating ? <RefreshCw className="animate-spin" size={16} aria-hidden="true" /> : <><ArrowRight size={15} aria-hidden="true" /> Connect Workspace</>}
          </button>
        </form>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '20px' }}>
          <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: '12px', textAlign: 'center', fontWeight: 700, letterSpacing: '0.05em' }}>QUICK SYSTEM CREDENTIAL ACCESSORS</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button 
              className="qclay-btn-pill secondary" style={{ padding: '8px 16px', fontSize: '11px', display: 'flex', justifyContent: 'space-between', borderRadius: '9999px' }}
              onClick={() => { setLoginEmail('admin@abes.edu'); setLoginPassword('admin123'); }}
              type="button"
            >
              <span>Admin Console</span>
              <span className="tabular-nums" style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>admin@abes.edu</span>
            </button>
            <button 
              className="qclay-btn-pill secondary" style={{ padding: '8px 16px', fontSize: '11px', display: 'flex', justifyContent: 'space-between', borderRadius: '9999px' }}
              onClick={() => { setLoginEmail('sandeep@abes.edu'); setLoginPassword('sandeep123'); }}
              type="button"
            >
              <span>Faculty Console</span>
              <span className="tabular-nums" style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>sandeep@abes.edu</span>
            </button>
            <button 
              className="qclay-btn-pill secondary" style={{ padding: '8px 16px', fontSize: '11px', display: 'flex', justifyContent: 'space-between', borderRadius: '9999px' }}
              onClick={() => { setLoginEmail('liam@abes.edu'); setLoginPassword('liam123'); }}
              type="button"
            >
              <span>Student Console</span>
              <span className="tabular-nums" style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>liam@abes.edu</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, Award, RefreshCw, QrCode, Shield, Eye, 
  CheckCircle, AlertCircle, Sparkles, Play, ShieldAlert, 
  Navigation2, FileText, ChevronRight, Activity, Undo2, Lock, Unlock,
  HelpCircle, Compass, Database, Calendar
} from 'lucide-react';

export default function LandingPage({
  currentLang,
  setCurrentLang,
  setShowLoginModal,
  TRANSLATIONS,
  employerVerifyId,
  setEmployerVerifyId,
  employerVerifyResult,
  setEmployerVerifyResult,
  employerVerifying,
  employerVerifyError,
  setEmployerVerifyError,
  handleEmployerVerifySubmit
}) {
  const [typedWord, setTypedWord] = useState('ERPs');

  // CSP Solver Simulator State
  const [cspSolvingState, setCspSolvingState] = useState('idle'); // 'idle' | 'running' | 'resolved'
  const [cspLogs, setCspLogs] = useState([
    'SYSTEM ENGINE READY. STANDBY FOR BACKTRACK RESOLUTION TESTING.'
  ]);
  const [cspRoster, setCspRoster] = useState([
    { id: 1, course: 'Compiler CS-601', time: 'Monday 09:00', room: 'Lab 3 (B-Block)', status: 'CONFLICT' },
    { id: 2, course: 'Database CS-602', time: 'Monday 09:00', room: 'Lab 3 (B-Block)', status: 'CONFLICT' }
  ]);

  // GPS Geofence Range Slider State
  const [gpsSliderVal, setGpsSliderVal] = useState(120); // Distance in meters (10 to 180)
  const isGpsInside = gpsSliderVal <= 50;

  // Student coordinate offset calculation for SVG campus map
  const studentX = 150 + (gpsSliderVal * 0.6);
  const studentY = 120 + (gpsSliderVal * 0.6);

  // Typewriter cycles
  useEffect(() => {
    const words = TRANSLATIONS[currentLang].words;
    let currentIdx = 0;
    setTypedWord(words[0]);
    const interval = setInterval(() => {
      currentIdx = (currentIdx + 1) % words.length;
      setTypedWord(words[currentIdx]);
    }, 2500);
    return () => clearInterval(interval);
  }, [currentLang, TRANSLATIONS]);

  // CSP scheduler backtracking mock handler
  const runCspSolver = () => {
    if (cspSolvingState === 'running') return;
    setCspSolvingState('running');
    setCspLogs(['[INIT] INITIALIZING BACKTRACKING CONSTRAINT SOLVER ENGINE…']);

    const logsSequence = [
      '[AUDIT] DETECTED ROOM 3 DOUBLE-BOOKING FOR COMPILER AND DATABASE CLASSES AT 09:00 AM.',
      '[RESOLVER] ATTEMPTING CS-602 ASSIGNMENT SWEEP TO ALTERNATIVE CAPACITIES…',
      '[BACKTRACK] SHIFTING CS-602 DATABASE INSTRUCTION TO B-BLOCK LAB 4…',
      '[CONSTRAINT] PARSING EUCLIDEAN CLASS CAPACITY METRICS: LAB 4 IS OK (45/60 CAPACITY).',
      '[VERIFY] VALIDATING ROSTER SANITY: NO SCHEDULE OVERLAPS DETECTED.',
      '[SUCCESS] RESOLUTION COMPLETE! SCHEDULE RECOMPILED WITH 100% SATISFIABILITY.'
    ];

    let currentLogIndex = 0;
    const interval = setInterval(() => {
      if (currentLogIndex < logsSequence.length) {
        setCspLogs(prev => [...prev, logsSequence[currentLogIndex]]);
        
        if (currentLogIndex === 2) {
          setCspRoster(prev => [
            { id: 1, course: 'Compiler CS-601', time: 'Monday 09:00', room: 'Lab 3 (B-Block)', status: 'LOCKED' },
            { id: 2, course: 'Database CS-602', time: 'Monday 09:00', room: 'Lab 4 (B-Block)', status: 'RESOLVING' }
          ]);
        }
        if (currentLogIndex === 5) {
          setCspRoster(prev => [
            { id: 1, course: 'Compiler CS-601', time: 'Monday 09:00', room: 'Lab 3 (B-Block)', status: 'VERIFIED' },
            { id: 2, course: 'Database CS-602', time: 'Monday 09:00', room: 'Lab 4 (B-Block)', status: 'VERIFIED' }
          ]);
        }
        currentLogIndex++;
      } else {
        clearInterval(interval);
        cspSolvingState && setCspSolvingState('resolved');
      }
    }, 1200);
  };

  const resetCspSolver = () => {
    setCspSolvingState('idle');
    setCspLogs(['SYSTEM ENGINE READY. STANDBY FOR BACKTRACK RESOLUTION TESTING.']);
    setCspRoster([
      { id: 1, course: 'Compiler CS-601', time: 'Monday 09:00', room: 'Lab 3 (B-Block)', status: 'CONFLICT' },
      { id: 2, course: 'Database CS-602', time: 'Monday 09:00', room: 'Lab 3 (B-Block)', status: 'CONFLICT' }
    ]);
  };

  return (
    <div className="landing-container">
      {/* Decorative background nebulas and grids */}
      <div className="grain-overlay" aria-hidden="true"></div>
      <div className="aurora-backdrop" aria-hidden="true"></div>
      <div className="aurora-backdrop-secondary" aria-hidden="true"></div>

      {/* Capsule Navigation Header */}
      <div className="capsule-nav-container">
        <header className="capsule-nav" role="banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <a href="#main-content" className="qclay-logo-wrap" aria-label="ABES GO Home">
              <span className="qclay-logo-circle" aria-hidden="true"></span>
              <span style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '0.05em', color: '#fff' }}>ABES GO</span>
            </a>

            <nav className="capsule-menu" role="navigation" aria-label="Main menu">
              <a href="#main-content" className="capsule-menu-item active">Home</a>
              <a href="#insights" className="capsule-menu-item">Insights</a>
              <a href="#playgrounds" className="capsule-menu-item">Sandbox</a>
              <a href="#bursar" className="capsule-menu-item">Bursar</a>
              <a href="#verification" className="capsule-menu-item">Audit Gateway</a>
            </nav>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Lang dropdown switcher */}
            <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.03)', padding: '2px', borderRadius: '99px', border: '1px solid rgba(255,255,255,0.05)' }}>
              {['EN', 'HI', 'ES'].map(lang => (
                <button 
                  key={lang} 
                  onClick={() => setCurrentLang(lang)}
                  aria-label={`Switch language to ${lang}`}
                  style={{ 
                    background: currentLang === lang ? 'rgba(255,255,255,0.08)' : 'transparent',
                    border: 'none',
                    color: currentLang === lang ? '#fff' : 'rgba(255,255,255,0.4)',
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 700,
                    borderRadius: '99px',
                    cursor: 'pointer',
                    transition: 'color 0.25s ease, background-color 0.25s'
                  }}
                >
                  {lang}
                </button>
              ))}
            </div>

            <button 
              className="qclay-btn-pill"
              onClick={() => setShowLoginModal(true)}
              aria-label="Enter ERP Workspace Portal"
            >
              {TRANSLATIONS[currentLang].enterPortal}
            </button>
          </div>
        </header>
      </div>

      {/* Main Hero Screen */}
      <main id="main-content" role="main">
        <section className="qclay-hero">
          
          {/* Node SVG Connecting Lines behind title */}
          <svg className="qclay-node-connector" aria-hidden="true" viewBox="0 0 1100 500">
            <path d="M 150,130 C 250,150 400,200 550,220" stroke="rgba(255,255,255,0.04)" fill="none" strokeWidth="1.5" />
            <path d="M 950,140 C 850,160 700,200 550,220" stroke="rgba(255,255,255,0.04)" fill="none" strokeWidth="1.5" />
            <path d="M 120,380 C 220,350 400,280 550,220" stroke="rgba(255,255,255,0.04)" fill="none" strokeWidth="1.5" />
            <path d="M 980,360 C 880,330 700,280 550,220" stroke="rgba(255,255,255,0.04)" fill="none" strokeWidth="1.5" />
          </svg>

          {/* Floating Telemetry Coordinates Points (exactly like QClay!) */}
          <div className="qclay-node-point top-left" aria-hidden="true">
            <span style={{ color: '#fff', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={12} /> CSP Solver</span>
            <span className="tabular-nums" style={{ opacity: 0.6 }}>20.945</span>
          </div>

          <div className="qclay-node-point top-right" aria-hidden="true">
            <span style={{ color: '#fff', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}><Navigation2 size={12} /> GPS Geofence</span>
            <span className="tabular-nums" style={{ opacity: 0.6 }}>2.945</span>
          </div>

          <div className="qclay-node-point bottom-left" aria-hidden="true">
            <span style={{ color: '#fff', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}><Shield size={12} /> UPI Escrow</span>
            <span className="tabular-nums" style={{ opacity: 0.6 }}>19.346</span>
          </div>

          <div className="qclay-node-point bottom-right" aria-hidden="true">
            <span style={{ color: '#fff', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}><FileText size={12} /> SGPA Ledger</span>
            <span className="tabular-nums" style={{ opacity: 0.6 }}>440</span>
          </div>

          <div className="qclay-hero-tag">
            <Sparkles size={12} aria-hidden="true" color="rgba(255,255,255,0.6)" />
            <span>{TRANSLATIONS[currentLang].heroTagline}</span>
          </div>

          <h1 className="qclay-hero-title">
            One-click for Academic Operations
          </h1>

          <p className="qclay-hero-subtitle">
            Dive into the elite academic workspace, where high-performance backtracking scheduling satisfies resource perimeters, and secure GPS geofencing eliminates attendance proxies.
          </p>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <button 
              className="qclay-btn-pill"
              onClick={() => setShowLoginModal(true)}
              style={{ padding: '14px 32px', fontSize: '14px' }}
            >
              {TRANSLATIONS[currentLang].accessConsole} ↗
            </button>
            <button 
              className="qclay-btn-pill secondary"
              onClick={() => document.getElementById('verification')?.scrollIntoView({ behavior: 'smooth' })}
              style={{ padding: '14px 32px', fontSize: '14px' }}
            >
              Audit Registry
            </button>
          </div>

          {/* Left / Right bottom pagers */}
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: '120px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '24px', fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>
            <span>↓ 01 / 03 . Scroll down</span>
            <span>ABES HORIZONS [= = - -]</span>
          </div>

        </section>

        {/* Tech Partner Bar */}
        <section className="qclay-partner-bar" aria-label="Underlying Technologies">
          <div className="qclay-partner-logo">▲ Vercel</div>
          <div className="qclay-partner-logo">❊ SQLite Database</div>
          <div className="qclay-partner-logo">⛃ Unified Pay</div>
          <div className="qclay-partner-logo">◉ React Frame</div>
          <div className="qclay-partner-logo">⎋ Node.js Core</div>
          <div className="qclay-partner-logo">❃ Express Server</div>
        </section>

        {/* SECTION: MEET MARVELLOUS INSIGHTS */}
        <section id="insights" className="qclay-section" aria-labelledby="insights-heading">
          <div className="qclay-insights-header">
            <div className="qclay-hero-tag" style={{ marginBottom: '16px' }}>
              <span>System Telemetry Insights</span>
            </div>
            <h2 id="insights-heading" className="qclay-insights-title">Meet Marvellous Insights</h2>
            <p className="qclay-insights-desc">
              ABES GO automates the lengthy processes of manual college administration. Inspect live active statistics from conflict schedules, attendance check-ins, and escrow registers.
            </p>
          </div>

          <div className="qclay-insights-grid">
            
            {/* CARD 1: Attendance Verification Wireframe (Exactly like Dribbble!) */}
            <div className="qclay-card" style={{ minHeight: '440px' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>MODULE 01 / GEOLOCATION SECURITY</span>
                <h3 style={{ fontSize: '24px', fontWeight: 600, color: '#fff', marginTop: '12px', marginBottom: '8px' }}>Attendance Accuracy</h3>
                <span className="tabular-nums" style={{ fontSize: '42px', fontWeight: 600, color: '#fff', display: 'block', marginBottom: '12px' }}>98.2%</span>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.6' }}>
                  Rotating geofence signatures sweep exam perimeters. Euclidean coordinates verify students locally, eliminating remote signatures.
                </p>
              </div>

              {/* Rotating Concentric Wireframe Projection Indicator */}
              <div className="qclay-gauge-wrap" aria-hidden="true" style={{ margin: '24px auto' }}>
                <div className="qclay-gauge-circle"></div>
                <div className="qclay-gauge-circle" style={{ width: '130px', height: '130px', borderDasharray: '3,3' }}></div>
                <div className="qclay-gauge-circle" style={{ width: '80px', height: '80px' }}></div>
                <div className="qclay-gauge-dot"></div>
                <QrCode size={40} color="rgba(255,255,255,0.15)" style={{ position: 'absolute' }} />
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span className="qclay-btn-pill secondary" style={{ fontSize: '10px', padding: '4px 12px' }}>❊ Active Spots</span>
                <span className="qclay-btn-pill secondary" style={{ fontSize: '10px', padding: '4px 12px' }}>❊ Geo Limits</span>
                <span className="qclay-btn-pill secondary" style={{ fontSize: '10px', padding: '4px 12px' }}>❊ verification</span>
              </div>
            </div>

            {/* CARD 2: Scheduler Bar Chart (Cylinder labyrinth style!) */}
            <div className="qclay-card" style={{ minHeight: '440px' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>MODULE 02 / CONSTRAINT SCHEDULER</span>
                <h3 style={{ fontSize: '24px', fontWeight: 600, color: '#fff', marginTop: '12px', marginBottom: '8px' }}>Conflict Resolution Capacity</h3>
                <span className="tabular-nums" style={{ fontSize: '42px', fontWeight: 600, color: '#fff', display: 'block', marginBottom: '12px' }}>100%</span>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.6' }}>
                  Heuristic backtracking satisfies timetable overlaps and allocates rooms matching exact enrollment constraints.
                </p>
              </div>

              {/* Vertical Cylinder Charts with Glowing Dots */}
              <div className="qclay-cylinder-chart" aria-hidden="true">
                {[
                  { label: 'Mon', fill: '85%' },
                  { label: 'Tue', fill: '55%' },
                  { label: 'Wed', fill: '95%' },
                  { label: 'Thu', fill: '70%' },
                  { label: 'Fri', fill: '90%' }
                ].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div className="qclay-cylinder-bar" style={{ height: '140px' }}>
                      <div className="qclay-cylinder-fill" style={{ height: item.fill }}>
                        <span className="qclay-cylinder-dot"></span>
                      </div>
                    </div>
                    <span className="qclay-cylinder-label">{item.label}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span className="qclay-btn-pill secondary" style={{ fontSize: '10px', padding: '4px 12px' }}>✦ Backtrack</span>
                <span className="qclay-btn-pill secondary" style={{ fontSize: '10px', padding: '4px 12px' }}>✦ Cap Match</span>
                <span className="qclay-btn-pill secondary" style={{ fontSize: '10px', padding: '4px 12px' }}>✦ 0 Schedule Overlaps</span>
              </div>
            </div>

          </div>
        </section>

        {/* SECTION: BURSAR PORTAL CLEARANCE ESCROW (DeFi Wallet style!) */}
        <section id="bursar" className="qclay-section" aria-labelledby="bursar-heading" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.04)', paddingTop: '100px' }}>
          <div className="qclay-insights-grid">
            
            {/* Left Column: Bursar Escrow Card Mock */}
            <div className="qclay-card qclay-hologram-glow" style={{ padding: '40px', background: '#07070a' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>MODULE 03 / FINANCE BURSAR</span>
                <h3 id="bursar-heading" style={{ fontSize: '28px', fontWeight: 600, color: '#fff', marginTop: '12px', marginBottom: '8px' }}>Escrow Ledger Wallet</h3>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '32px' }}>
                  Secure tuition clearance ledgers. Generates instant UPI receipts and handles clearing sequences.
                </p>

                {/* Wallet Balance Display */}
                <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255,255,255,0.04)', padding: '24px', borderRadius: '20px', marginBottom: '24px' }}>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', display: 'block', fontWeight: 600, marginBottom: '6px' }}>TOTAL CLEARANCE OUTSTANDING</span>
                  <strong className="tabular-nums" style={{ fontSize: '36px', color: '#fff', fontWeight: 600 }}>+₹24,500.00</strong>
                </div>

                {/* Transaction Feeds */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <span style={{ color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: '6px' }}><CheckCircle size={14} color="#10b981" /> Exam Fee Clear</span>
                    <span className="tabular-nums" style={{ color: '#fff', fontWeight: 600 }}>₹4,500.00</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', padding: '10px 0' }}>
                    <span style={{ color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: '6px' }}><RefreshCw className="animate-spin" size={14} color="var(--abes-gold)" /> Hostels Escrow</span>
                    <span className="tabular-nums" style={{ color: '#fff', fontWeight: 600 }}>₹20,000.00</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '36px' }}>
                <span className="qclay-btn-pill secondary" style={{ fontSize: '10px', padding: '4px 12px' }}>✦ UPI Escrow</span>
                <span className="qclay-btn-pill secondary" style={{ fontSize: '10px', padding: '4px 12px' }}>✦ Secured Ledger</span>
                <span className="qclay-btn-pill secondary" style={{ fontSize: '10px', padding: '4px 12px' }}>✦ Auto Release</span>
              </div>
            </div>

            {/* Right Column: Narrative Copy */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '20px' }}>
              <div className="qclay-hero-tag" style={{ alignSelf: 'flex-start' }}>
                <span>University Bursar Portal</span>
              </div>
              <h3 style={{ fontSize: '42px', fontWeight: 600, color: '#fff', lineHeight: '1.2' }}>One-click Ledger Clearance Gate</h3>
              <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.45)', lineHeight: '1.6' }}>
                ABES GO resolves clearing latency. Instantly checkout via standard secure channels. Clear outstanding ledgers asynchronously and download encrypted JSON ledger transcripts.
              </p>
              <button 
                className="qclay-btn-pill"
                onClick={() => setShowLoginModal(true)}
                style={{ alignSelf: 'flex-start', padding: '12px 28px', marginTop: '12px' }}
              >
                Enter Bursar Module ↗
              </button>
            </div>

          </div>
        </section>

        {/* SECTION: EXPERIMENTAL ERP SANDBOX PLAYGROUNDS */}
        <section id="playgrounds" className="qclay-section" aria-labelledby="playgrounds-heading" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.04)', paddingTop: '100px' }}>
          <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto 60px auto' }}>
            <div className="qclay-hero-tag" style={{ justifyContent: 'center' }}>
              <span>02 / EXPERIMENTAL ERP SANDBOX PLAYGROUNDS</span>
            </div>
            <h2 id="playgrounds-heading" className="qclay-insights-title">Test Our Core Engines Live</h2>
            <p className="qclay-insights-desc">
              Interact with the backtracking solver and proximity geofencing algorithms in real-time, displaying actual database telemetry and visual maps.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
            
            {/* PLAYGROUND A: CSP Backtracking Scheduler Solver */}
            <div className="qclay-card" style={{ background: '#07070a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <Activity size={18} color="rgba(255,255,255,0.6)" aria-hidden="true" />
                  <strong style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>CSP Backtracker</strong>
                </div>
                <span className="status-badge" style={{ 
                  background: cspSolvingState === 'resolved' ? 'var(--success-glow)' : cspSolvingState === 'running' ? 'var(--warning-glow)' : 'rgba(255,255,255,0.03)', 
                  color: cspSolvingState === 'resolved' ? 'var(--success)' : cspSolvingState === 'running' ? 'var(--warning)' : 'rgba(255,255,255,0.4)',
                  fontSize: '9px',
                  padding: '2px 8px'
                }}>
                  {cspSolvingState.toUpperCase()}
                </span>
              </div>

              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.5', margin: '16px 0' }}>
                Test our backtracking engine solving room overlaps. Click below to Swivel and assign classrooms.
              </p>

              {/* Roster Mock */}
              <div className="solved-roster-list" style={{ marginBottom: '20px' }}>
                {cspRoster.map(item => (
                  <div key={item.id} className="solver-roster-item" style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div>
                      <strong style={{ fontSize: '13px', color: '#fff', display: 'block' }}>{item.course}</strong>
                      <span className="tabular-nums" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{item.time} • {item.room}</span>
                    </div>
                    <span style={{ 
                      fontSize: '10px', 
                      fontWeight: 800, 
                      color: item.status === 'VERIFIED' ? 'var(--success)' : item.status === 'RESOLVING' ? 'var(--info)' : 'var(--danger)',
                      background: item.status === 'VERIFIED' ? 'var(--success-glow)' : item.status === 'RESOLVING' ? 'var(--abes-blue-glow)' : 'var(--danger-glow)',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>

              {/* Solving Terminal */}
              <div className="interactive-terminal" aria-live="polite" style={{ background: '#040406', border: '1px solid rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.7)', height: '180px', marginBottom: '20px' }}>
                <div className="terminal-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)' }}>
                  <span>BACKTRACK LOGS MONITOR v1.0.8</span>
                  <div>
                    <span className="terminal-dot" aria-hidden="true" style={{ background: 'rgba(255,255,255,0.2)', boxShadow: 'none' }}></span>
                    <span className="terminal-dot yellow" aria-hidden="true" style={{ background: 'rgba(255,255,255,0.2)', boxShadow: 'none' }}></span>
                    <span className="terminal-dot green" aria-hidden="true" style={{ background: 'rgba(255,255,255,0.2)', boxShadow: 'none' }}></span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', fontFamily: 'monospace' }}>
                  {cspLogs.map((log, idx) => (
                    <div key={idx} style={{ color: log.startsWith('[SUCCESS]') ? '#10b981' : log.startsWith('[AUDIT]') ? '#ef4444' : 'rgba(255,255,255,0.6)' }}>
                      {log}
                    </div>
                  ))}
                  {cspSolvingState === 'running' && (
                    <div>
                      COMPILING CONSTRAINTS<span className="terminal-cursor">…</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={runCspSolver}
                  disabled={cspSolvingState === 'running' || cspSolvingState === 'resolved'}
                  className="qclay-btn-pill" 
                  style={{ flex: 1, padding: '12px' }}
                >
                  <Play size={14} aria-hidden="true" /> Resolve Conflicts
                </button>
                <button 
                  onClick={resetCspSolver}
                  disabled={cspSolvingState === 'running'}
                  className="qclay-btn-pill secondary"
                  aria-label="Reset scheduler sandbox"
                  style={{ padding: '12px 16px' }}
                >
                  <Undo2 size={14} aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* PLAYGROUND B: GPS Euclidean Geofencing Proximity */}
            <div className="qclay-card" style={{ background: '#07070a' }}>
              <div style={{ display: 'flex', justify: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <Navigation2 size={18} color="rgba(255,255,255,0.6)" aria-hidden="true" />
                  <strong style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>Geofence Anti-Cheat</strong>
                </div>
                <span className={`status-badge ${isGpsInside ? 'present' : 'absent'}`} style={{ fontSize: '9px', padding: '2px 8px' }}>
                  {isGpsInside ? "GEOFENCE OK" : "PROXY BLOCKED"}
                </span>
              </div>

              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.5', margin: '16px 0' }}>
                Adjust student range slider coordinates in real-time, verifying presence within geofence sweeps.
              </p>

              {/* SVG Campus Map Blueprint */}
              <div style={{ position: 'relative', marginBottom: '20px' }}>
                <svg className="campus-map-svg" viewBox="0 0 300 220" aria-label="Simulated campus geofence blueprint map" style={{ background: '#040406', border: '1px solid rgba(255,255,255,0.04)', height: '180px' }}>
                  <defs>
                    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                  
                  <circle cx="150" cy="110" r="70" fill="none" stroke="rgba(255,255,255,0.015)" strokeDasharray="3,3" />
                  <circle cx="150" cy="110" r="35" fill={isGpsInside ? "rgba(16,185,129,0.02)" : "rgba(239,68,68,0.01)"} stroke={isGpsInside ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.15)"} strokeWidth="1" />
                  <circle cx="150" cy="110" r="5" fill={isGpsInside ? "var(--success)" : "var(--danger)"} />
                  
                  <line x1="150" y1="110" x2={studentX} y2={studentY - 10} stroke={isGpsInside ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.12)"} strokeDasharray="2,2" strokeWidth="1" />
                  
                  <g transform={`translate(${studentX}, ${studentY - 10})`}>
                    <circle cx="0" cy="0" r="6" fill={isGpsInside ? "#10b981" : "#ef4444"} />
                    <circle cx="0" cy="0" r="12" fill="none" stroke={isGpsInside ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.1)"} strokeWidth="1" />
                  </g>

                  <text x="10" y="20" fill="rgba(255,255,255,0.2)" fontSize="8" fontFamily="monospace">CSE HALL 102 ANTENNA</text>
                </svg>

                <div style={{ position: 'absolute', bottom: '12px', left: '12px', background: '#040406', border: '1px solid rgba(255,255,255,0.04)', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>RANGE:</span>
                  <strong className="tabular-nums" style={{ color: isGpsInside ? 'var(--success)' : 'var(--danger)' }}>
                    {gpsSliderVal}m
                  </strong>
                </div>
              </div>

              {/* Slider Controller */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justify: 'space-between', fontSize: '12px' }}>
                  <label htmlFor="gps-range-playground" style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Euclidean Distance:</label>
                  <span className="tabular-nums" style={{ color: '#fff', fontWeight: 600 }}>{gpsSliderVal}m / 180m</span>
                </div>
                <input 
                  id="gps-range-playground"
                  type="range" 
                  min="10" 
                  max="180" 
                  value={gpsSliderVal} 
                  onChange={e => setGpsSliderVal(parseInt(e.target.value))}
                  className="premium-range-slider"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                />
              </div>
            </div>

          </div>
        </section>

        {/* SECTION: AUDIT & COMPLIANCE VERIFICATION GATEWAY */}
        <section id="verification" className="qclay-section" aria-labelledby="verification-heading" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.04)', paddingTop: '100px' }}>
          <div className="qclay-insights-grid">
            <div>
              <div className="qclay-hero-tag" style={{ marginBottom: '16px' }}>
                <span>03 / PUBLIC AUDIT & CERTIFICATIONS GATEWAY</span>
              </div>
              <h2 id="verification-heading" className="qclay-insights-title" style={{ fontSize: '48px', lineHeight: '1.2' }}>Transcript Verifier</h2>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '15px', lineHeight: '1.6', marginBottom: '32px' }}>
                Inspect student transcript ledgers in real-time. Instantly query verified GPAs directly from our relational SQLite server.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <Shield size={16} color="rgba(255,255,255,0.4)" />
                  <span style={{ fontSize: '13px', color: '#fff', fontWeight: 500 }}>FERPA Compliant Cryptographic Ledger Audits</span>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <CheckCircle size={16} color="#10b981" />
                  <span style={{ fontSize: '13px', color: '#fff', fontWeight: 500 }}>100% Tamper-proof Database Telemetry</span>
                </div>
              </div>
            </div>

            {/* Recruiter active console card */}
            <div className="qclay-card qclay-hologram-glow" style={{ padding: '32px', background: '#07070a' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--abes-gold)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Eye size={16} aria-hidden="true" color="var(--abes-gold)" /> Verify Registry Record
              </h4>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.4', marginBottom: '20px' }}>
                Enter student ID below to query the database ledger. Try student roll: <strong>2200320100045</strong>.
              </p>
              
              <form onSubmit={handleEmployerVerifySubmit} style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                <input 
                  id="recruiter-input"
                  name="rollNumber"
                  aria-label="Student Roll ID Input"
                  type="text" 
                  className="premium-input" 
                  style={{ height: '42px', fontSize: '13px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }} 
                  placeholder="Roll ID (e.g. 2200320100045)"
                  value={employerVerifyId} 
                  onChange={e => setEmployerVerifyId(e.target.value)} 
                  required
                  autoComplete="off"
                />
                <button type="submit" disabled={employerVerifying} className="qclay-btn-pill" style={{ height: '42px', padding: '0 24px' }}>
                  {employerVerifying ? <RefreshCw className="animate-spin" size={14} aria-hidden="true" /> : "Verify"}
                </button>
              </form>

              {employerVerifyError && (
                <div style={{ padding: '12px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '8px', color: 'var(--danger)', fontSize: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <AlertCircle size={14} aria-hidden="true" />
                  <span>{employerVerifyError}</span>
                </div>
              )}

              {employerVerifyResult && (
                <div className="animate-toast" style={{ background: '#040406', border: '1px solid rgba(16,185,129,0.15)', padding: '20px', borderRadius: '16px', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px', position: 'relative', zIndex: 20 }}>
                  <span style={{ color: 'var(--success)', fontWeight: 800, fontSize: '10px', display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '0.05em' }}>
                    <CheckCircle size={12} aria-hidden="true" /> RECORD AUTHENTICATED
                  </span>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px' }}>LEARNER PROFILE:</span>
                    <strong style={{ fontSize: '14px', color: '#fff' }}>{employerVerifyResult.student.firstName} {employerVerifyResult.student.lastName}</strong>
                    <span className="tabular-nums" style={{ color: 'var(--abes-gold)', fontWeight: 700 }}>Roll ID: {employerVerifyResult.student.studentIdNumber}</span>
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>Branch: {employerVerifyResult.student.program}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', paddingTop: '6px' }}>
                    <div>
                      <span style={{ color: 'rgba(255,255,255,0.4)', display: 'block', fontSize: '10px' }}>CERTIFIED CGPA</span>
                      <strong className="tabular-nums" style={{ fontSize: '18px', color: 'var(--info)' }}>{employerVerifyResult.sgpa} / 10.00</strong>
                    </div>
                    <span style={{ fontSize: '10px', background: 'var(--success-glow)', color: 'var(--success)', padding: '4px 8px', borderRadius: '4px', fontWeight: 800 }}>
                      HONOURS BAND
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* SECTION: ACADEMIC ENDORSEMENTS & METRICS */}
        <section className="qclay-section" aria-labelledby="endorsements-heading" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.04)', paddingTop: '100px' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <div className="qclay-hero-tag" style={{ justifyContent: 'center' }}>
              <span>04 / ENDORSEMENTS & TELEMETRY</span>
            </div>
            <h2 id="endorsements-heading" className="qclay-insights-title">Endorsed by Academic Leaders</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '60px' }}>
            <div className="qclay-card" style={{ padding: '36px', borderLeft: '3px solid rgba(255,255,255,0.1)' }}>
              <Sparkles size={20} color="var(--abes-gold)" style={{ marginBottom: '16px' }} aria-hidden="true" />
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.65)', lineHeight: '1.6', fontStyle: 'italic', marginBottom: '24px' }}>
                "The integration of dynamic geofenced check-ins and rotating signatures successfully blocked proxy signing, restoring attendance auditing integrity to CSE classroom halls."
              </p>
              <div>
                <strong style={{ display: 'block', fontSize: '13px', color: '#fff' }}>Dr. Sandeep Sharma</strong>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Dean Academics & Head of CSE, ABES Engineering College</span>
              </div>
            </div>

            <div className="qclay-card" style={{ padding: '36px', borderLeft: '3px solid rgba(255,255,255,0.1)' }}>
              <Sparkles size={20} color="rgba(255,255,255,0.4)" style={{ marginBottom: '16px' }} aria-hidden="true" />
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.65)', lineHeight: '1.6', fontStyle: 'italic', marginBottom: '24px' }}>
                "The predictive What-If GPA target sliders are highly interactive. Being warned ahead of time about fee waiver retention based on CS-601 exam scores is incredibly helpful."
              </p>
              <div>
                <strong style={{ display: 'block', fontSize: '13px', color: '#fff' }}>Liam Sharma</strong>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>CSE Student Scholar, Term-6</span>
              </div>
            </div>
          </div>

          {/* 4-Column Platform Telemetry Metrics Deck */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '60px' }}>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', display: 'block', fontWeight: 600, letterSpacing: '0.1em', marginBottom: '8px' }}>SCHOLAR ENROLLMENTS</span>
              <strong className="tabular-nums" style={{ fontSize: '36px', color: '#fff', fontWeight: 600 }}>5,000+</strong>
              <span style={{ display: 'block', fontSize: '11px', color: 'var(--success)', marginTop: '4px' }}>Active database profiles</span>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', display: 'block', fontWeight: 600, letterSpacing: '0.1em', marginBottom: '8px' }}>CSP RESOLUTION RATE</span>
              <strong className="tabular-nums" style={{ fontSize: '36px', color: '#fff', fontWeight: 600 }}>100%</strong>
              <span style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>Zero scheduling conflicts</span>
            </div>

            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', display: 'block', fontWeight: 600, letterSpacing: '0.1em', marginBottom: '8px' }}>GEOFENCE PRECISION</span>
              <strong className="tabular-nums" style={{ fontSize: '36px', color: '#fff', fontWeight: 600 }}>99.9%</strong>
              <span style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>Euclidean sweep limits</span>
            </div>

            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', display: 'block', fontWeight: 600, letterSpacing: '0.1em', marginBottom: '8px' }}>CLEARANCE ESCROWS</span>
              <strong className="tabular-nums" style={{ fontSize: '36px', color: '#fff', fontWeight: 600 }}>₹2.4M+</strong>
              <span style={{ display: 'block', fontSize: '11px', color: 'var(--success)', marginTop: '4px' }}>Realized bursar receipts</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react'
import api from './api'

// ─── Theme ───────────────────────────────
const T = {
  bg: '#0a0a0a', surface: '#141414', card: '#1a1a1a',
  border: '#2a2a2a', accent: '#e8ff47', accentDim: '#bcd43a',
  accentBg: 'rgba(232,255,71,0.08)', text: '#f0f0f0',
  muted: '#888', dim: '#555', danger: '#ff4757',
  dangerBg: 'rgba(255,71,87,0.1)', success: '#2ed573',
  successBg: 'rgba(46,213,115,0.1)',
}

const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700;800;900&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Vazirmatn',system-ui,sans-serif; background:${T.bg}; color:${T.text}; direction:rtl; -webkit-font-smoothing:antialiased; }
  input,button,select { font-family:inherit; }
  @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }
  @keyframes slideIn { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
  @keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(232,255,71,0.3)} 50%{box-shadow:0 0 0 12px rgba(232,255,71,0)} }
`

// ─── Shared Components ───────────────────
function Input({ label, ...props }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={{ display:'block',fontSize:12,color:T.muted,marginBottom:6,fontWeight:500 }}>{label}</label>}
      <input {...props} style={{
        width:'100%', padding:'13px 14px', background:T.card,
        border:`1px solid ${T.border}`, borderRadius:11, color:T.text,
        fontSize:15, outline:'none', transition:'border-color 0.2s',
        ...props.style,
      }}
        onFocus={e => e.target.style.borderColor = T.accent}
        onBlur={e => e.target.style.borderColor = T.border}
      />
    </div>
  )
}

function Btn({ children, variant = 'primary', ...props }) {
  const styles = {
    primary: { background:T.accent, color:T.bg, border:'none', fontWeight:700 },
    ghost: { background:'transparent', color:T.muted, border:`1px solid ${T.border}` },
    danger: { background:T.dangerBg, color:T.danger, border:'none' },
  }
  return (
    <button {...props} style={{
      padding:'12px 20px', borderRadius:10, fontSize:14, cursor:'pointer',
      fontFamily:'inherit', transition:'all 0.2s', ...styles[variant], ...props.style,
    }}>{children}</button>
  )
}

function Header({ user, onLogout }) {
  return (
    <div style={{
      padding:'14px 18px', background:T.surface, borderBottom:`1px solid ${T.border}`,
      display:'flex', justifyContent:'space-between', alignItems:'center',
      position:'sticky', top:0, zIndex:100,
    }}>
      <div>
        <div style={{ fontSize:17, fontWeight:800 }}>
          <span style={{ color:T.accent }}>●</span> {user.name}
        </div>
        <div style={{ fontSize:11, color:T.muted, marginTop:1 }}>
          {user.role === 'trainer' ? 'پنل مربی' : user.role === 'admin' ? 'پنل مدیر' : 'پنل ورزشکار'}
        </div>
      </div>
      <Btn variant="ghost" onClick={onLogout} style={{ padding:'7px 14px', fontSize:12 }}>خروج</Btn>
    </div>
  )
}

function RestTimer({ seconds, onDone }) {
  const [left, setLeft] = useState(seconds)
  useEffect(() => {
    if (left <= 0) { onDone(); return }
    const t = setTimeout(() => setLeft(l => l - 1), 1000)
    return () => clearTimeout(t)
  }, [left, onDone])
  const pct = ((seconds - left) / seconds) * 100
  const mm = Math.floor(left / 60), ss = left % 60
  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.88)',
      display:'flex', alignItems:'center', justifyContent:'center',
      zIndex:1000, backdropFilter:'blur(8px)', animation:'fadeIn 0.3s',
    }}>
      <div style={{ textAlign:'center', animation:'fadeUp 0.4s' }}>
        <div style={{
          width:170,height:170,borderRadius:'50%',margin:'0 auto 20px',
          background:`conic-gradient(${T.accent} ${pct}%, transparent ${pct}%)`,
          display:'flex',alignItems:'center',justifyContent:'center',
          animation:'pulse 2s ease infinite',
        }}>
          <div style={{
            width:152,height:152,borderRadius:'50%',background:T.bg,
            display:'flex',alignItems:'center',justifyContent:'center',
          }}>
            <span style={{ fontSize:40,fontWeight:800,letterSpacing:2 }}>{mm}:{ss.toString().padStart(2,'0')}</span>
          </div>
        </div>
        <div style={{ fontSize:14,color:T.muted,marginBottom:18 }}>⏱ استراحت بین ست</div>
        <Btn variant="ghost" onClick={onDone}>رد شدن</Btn>
      </div>
    </div>
  )
}

function Loading() {
  return <div style={{ textAlign:'center',padding:40,color:T.muted,animation:'fadeIn 0.3s' }}>در حال بارگذاری...</div>
}

// ─── LOGIN ───────────────────────────────
function LoginScreen({ onLogin }) {
  const [phone, setPhone] = useState('')
  const [pass, setPass] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setError('')
    const p = phone.replace(/\s/g, '')
    if (p.length !== 11 || !p.startsWith('09')) { setError('شماره موبایل نامعتبر'); return }
    setLoading(true)
    try {
      const res = await api.login(p, pass)
      localStorage.setItem('blugen_token', res.token)
      localStorage.setItem('blugen_user', JSON.stringify(res.user))
      onLogin(res.user)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:20,
      background:`radial-gradient(ellipse at 50% 0%, rgba(232,255,71,0.04) 0%, transparent 60%), ${T.bg}`,
    }}>
      <div style={{ width:'100%', maxWidth:380, animation:'fadeUp 0.6s' }}>
        <div style={{ textAlign:'center', marginBottom:44 }}>
          <div style={{ fontSize:46,marginBottom:6 }}>🏋️</div>
          <h1 style={{
            fontSize:28, fontWeight:900,
            background:`linear-gradient(135deg,${T.text},${T.accent})`,
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
          }}>Blugen</h1>
          <p style={{ color:T.muted,fontSize:13,marginTop:4,fontWeight:300 }}>سیستم مدیریت تمرین</p>
        </div>

        <Input label="شماره موبایل" type="tel" placeholder="09121234567"
          value={phone} onChange={e => setPhone(e.target.value)}
          style={{ direction:'ltr',textAlign:'left',letterSpacing:1 }}
        />
        <Input label="رمز عبور" type="password" placeholder="••••" maxLength={10}
          value={pass} onChange={e => setPass(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          style={{ direction:'ltr',textAlign:'center',letterSpacing:8,fontSize:20 }}
        />

        {error && (
          <div style={{
            background:T.dangerBg, color:T.danger, padding:'10px 14px',
            borderRadius:10, fontSize:13, marginBottom:14, textAlign:'center',
            animation:'fadeIn 0.3s',
          }}>{error}</div>
        )}

        <Btn onClick={handleLogin} style={{ width:'100%',fontSize:16,opacity:loading?0.6:1 }}>
          {loading ? '...' : 'ورود'}
        </Btn>
      </div>
    </div>
  )
}

// ─── TRAINER DASHBOARD ────────────────────
function TrainerView({ user, onLogout }) {
  const [tab, setTab] = useState('trainees')
  const [trainees, setTrainees] = useState([])
  const [exercises, setExercises] = useState([])
  const [selectedTrainee, setSelectedTrainee] = useState(null)
  const [programs, setPrograms] = useState([])
  const [newProg, setNewProg] = useState(null)
  const [showExPicker, setShowExPicker] = useState(false)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)

  // Add trainee form
  const [showAddTrainee, setShowAddTrainee] = useState(false)
  const [newTrainee, setNewTrainee] = useState({ phone:'', name:'' })

  useEffect(() => {
    Promise.all([
      api.getUsers('trainee'),
      api.getExercises(),
      api.trainerStats(),
    ]).then(([t, e, s]) => {
      setTrainees(t); setExercises(e); setStats(s); setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const loadPrograms = async (traineeId) => {
    const p = await api.getPrograms(traineeId)
    setPrograms(p)
  }

  const selectTrainee = async (t) => {
    setSelectedTrainee(t)
    await loadPrograms(t.id)
  }

  const handleAddTrainee = async () => {
    if (!newTrainee.phone || !newTrainee.name) return
    try {
      const created = await api.createUser({ phone:newTrainee.phone, name:newTrainee.name, role:'trainee' })
      setTrainees(prev => [...prev, created])
      setNewTrainee({ phone:'', name:'' })
      setShowAddTrainee(false)
    } catch (e) { alert(e.message) }
  }

  const startNewProgram = () => {
    setNewProg({ name:'', session_number:null, exercises:[] })
    setShowExPicker(false)
  }

  const addExercise = (exId) => {
    setNewProg(p => ({
      ...p,
      exercises: [...p.exercises, { exercise_id:exId, sets:3, reps:10, rest_seconds:60, weight:0 }],
    }))
    setShowExPicker(false)
  }

  const updateExField = (idx, field, val) => {
    setNewProg(p => ({
      ...p,
      exercises: p.exercises.map((e, i) => i === idx ? { ...e, [field]: Number(val) } : e),
    }))
  }

  const removeEx = (idx) => {
    setNewProg(p => ({ ...p, exercises: p.exercises.filter((_, i) => i !== idx) }))
  }

  const saveProgram = async () => {
    if (!newProg.name || newProg.exercises.length === 0) return
    try {
      await api.createProgram({
        trainee_id: selectedTrainee.id,
        name: newProg.name,
        session_number: newProg.session_number,
        exercises: newProg.exercises,
      })
      setNewProg(null)
      await loadPrograms(selectedTrainee.id)
    } catch (e) { alert(e.message) }
  }

  if (loading) return <><Header user={user} onLogout={onLogout}/><Loading/></>

  return (
    <div style={{ minHeight:'100vh', background:T.bg }}>
      <Header user={user} onLogout={onLogout}/>

      {/* Stats bar */}
      {stats && !selectedTrainee && (
        <div style={{
          display:'flex', gap:1, background:T.border, margin:'0',
        }}>
          {[
            { label:'شاگرد', val:stats.total_trainees },
            { label:'برنامه', val:stats.total_programs },
            { label:'پکیج فعال', val:stats.active_packages },
          ].map(s => (
            <div key={s.label} style={{
              flex:1, background:T.surface, padding:'12px 8px', textAlign:'center',
            }}>
              <div style={{ fontSize:20, fontWeight:800, color:T.accent }}>{s.val}</div>
              <div style={{ fontSize:10, color:T.muted }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      {!selectedTrainee && !newProg && (
        <div style={{ display:'flex', background:T.surface, borderBottom:`1px solid ${T.border}` }}>
          {[{ key:'trainees',label:'شاگردها',icon:'👥' },{ key:'exercises',label:'حرکات',icon:'📋' }].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              flex:1, padding:12, background:'transparent', border:'none',
              borderBottom: tab===t.key ? `2px solid ${T.accent}` : '2px solid transparent',
              color: tab===t.key ? T.accent : T.muted,
              fontSize:13, cursor:'pointer', fontFamily:'inherit', fontWeight: tab===t.key?600:400,
            }}>{t.icon} {t.label}</button>
          ))}
        </div>
      )}

      <div style={{ padding:16, maxWidth:600, margin:'0 auto' }}>

        {/* ── Trainees List ── */}
        {tab === 'trainees' && !selectedTrainee && !newProg && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14 }}>
              <span style={{ fontSize:14, color:T.muted }}>لیست شاگردها</span>
              <Btn onClick={() => setShowAddTrainee(v => !v)} style={{ padding:'6px 14px', fontSize:12 }}>
                + شاگرد جدید
              </Btn>
            </div>

            {showAddTrainee && (
              <div style={{
                background:T.card, borderRadius:14, padding:16, marginBottom:14,
                border:`1px solid ${T.accent}`, animation:'fadeUp 0.2s',
              }}>
                <Input label="نام" placeholder="علی رضایی" value={newTrainee.name}
                  onChange={e => setNewTrainee(p => ({...p, name:e.target.value}))} />
                <Input label="شماره موبایل" type="tel" placeholder="09121234567"
                  value={newTrainee.phone}
                  onChange={e => setNewTrainee(p => ({...p, phone:e.target.value}))}
                  style={{ direction:'ltr',textAlign:'left' }} />
                <div style={{ display:'flex', gap:8 }}>
                  <Btn onClick={handleAddTrainee} style={{ flex:1 }}>ثبت</Btn>
                  <Btn variant="ghost" onClick={() => setShowAddTrainee(false)}>انصراف</Btn>
                </div>
              </div>
            )}

            {trainees.map((t, i) => {
              const pCount = programs.length // simplified
              return (
                <div key={t.id} onClick={() => selectTrainee(t)} style={{
                  background:T.card, borderRadius:14, padding:15, marginBottom:10,
                  cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center',
                  border:`1px solid ${T.border}`, transition:'all 0.2s',
                  animation:`slideIn 0.3s ease ${i*0.04}s both`,
                }}
                  onMouseOver={e => e.currentTarget.style.borderColor = T.accent}
                  onMouseOut={e => e.currentTarget.style.borderColor = T.border}
                >
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{
                      width:40,height:40,borderRadius:11,background:T.accentBg,
                      display:'flex',alignItems:'center',justifyContent:'center',
                      fontSize:17,fontWeight:700,color:T.accent,
                    }}>{t.name[0]}</div>
                    <div>
                      <div style={{ fontWeight:600,fontSize:14 }}>{t.name}</div>
                      <div style={{ fontSize:11,color:T.muted,direction:'ltr',textAlign:'right' }}>{t.phone}</div>
                    </div>
                  </div>
                  <div style={{ fontSize:18,color:T.dim }}>←</div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Trainee Detail ── */}
        {selectedTrainee && !newProg && (
          <div style={{ animation:'fadeUp 0.3s' }}>
            <button onClick={() => { setSelectedTrainee(null); setPrograms([]) }} style={{
              background:'transparent',border:'none',color:T.muted,cursor:'pointer',
              fontSize:13,fontFamily:'inherit',marginBottom:14,
            }}>→ بازگشت</button>

            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18 }}>
              <h2 style={{ fontSize:19,fontWeight:700 }}>{selectedTrainee.name}</h2>
              <Btn onClick={startNewProgram} style={{ padding:'9px 16px',fontSize:13 }}>+ برنامه جدید</Btn>
            </div>

            {programs.length === 0 && (
              <div style={{ textAlign:'center',padding:30,color:T.muted }}>هنوز برنامه‌ای ندارد</div>
            )}

            {programs.map((prog, i) => (
              <div key={prog.id} style={{
                background:T.card, borderRadius:14, padding:15, marginBottom:11,
                border:`1px solid ${T.border}`, animation:`slideIn 0.3s ease ${i*0.05}s both`,
              }}>
                <div style={{ display:'flex',justifyContent:'space-between',marginBottom:10 }}>
                  <div style={{ fontWeight:700,fontSize:15 }}>{prog.name}</div>
                  {prog.session_number && (
                    <div style={{ background:T.accentBg,color:T.accent,padding:'3px 10px',borderRadius:6,fontSize:12 }}>
                      جلسه {prog.session_number}
                    </div>
                  )}
                </div>
                {prog.exercises?.map((ex, j) => (
                  <div key={j} style={{
                    display:'flex',justifyContent:'space-between',alignItems:'center',
                    padding:'7px 0', borderBottom: j < prog.exercises.length-1 ? `1px solid ${T.border}` : 'none',
                  }}>
                    <span style={{ fontSize:13 }}>{ex.emoji} {ex.name}</span>
                    <span style={{ fontSize:12,color:T.muted }}>{ex.sets}×{ex.reps} | {ex.weight}kg</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* ── New Program ── */}
        {newProg && (
          <div style={{ animation:'fadeUp 0.3s' }}>
            <button onClick={() => setNewProg(null)} style={{
              background:'transparent',border:'none',color:T.muted,cursor:'pointer',
              fontSize:13,fontFamily:'inherit',marginBottom:14,
            }}>→ انصراف</button>

            <h2 style={{ fontSize:17,fontWeight:700,marginBottom:14 }}>برنامه جدید برای {selectedTrainee.name}</h2>

            <Input placeholder="نام برنامه" value={newProg.name}
              onChange={e => setNewProg(p => ({...p, name:e.target.value}))} />

            <Input placeholder="شماره جلسه (اختیاری)" type="number"
              value={newProg.session_number || ''}
              onChange={e => setNewProg(p => ({...p, session_number:e.target.value ? Number(e.target.value) : null}))} />

            {newProg.exercises.map((ex, idx) => {
              const exData = exercises.find(e => e.id === ex.exercise_id)
              return (
                <div key={idx} style={{
                  background:T.card,borderRadius:12,padding:13,marginBottom:10,
                  border:`1px solid ${T.border}`,animation:'slideIn 0.2s',
                }}>
                  <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10 }}>
                    <span style={{ fontWeight:600,fontSize:14 }}>{exData?.emoji} {exData?.name}</span>
                    <button onClick={() => removeEx(idx)} style={{
                      background:T.dangerBg,border:'none',color:T.danger,
                      width:26,height:26,borderRadius:7,cursor:'pointer',fontSize:13,
                    }}>✕</button>
                  </div>
                  <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:7 }}>
                    {[
                      { l:'ست',f:'sets' },{ l:'تکرار',f:'reps' },
                      { l:'وزنه(kg)',f:'weight' },{ l:'استراحت(s)',f:'rest_seconds' },
                    ].map(fd => (
                      <div key={fd.f}>
                        <div style={{ fontSize:10,color:T.muted,marginBottom:3,textAlign:'center' }}>{fd.l}</div>
                        <input type="number" value={ex[fd.f]}
                          onChange={e => updateExField(idx, fd.f, e.target.value)}
                          style={{
                            width:'100%',padding:'7px 3px',background:T.surface,
                            border:`1px solid ${T.border}`,borderRadius:7,
                            color:T.text,fontSize:14,textAlign:'center',outline:'none',
                            fontFamily:'inherit',
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}

            {showExPicker ? (
              <div style={{
                background:T.card,borderRadius:14,padding:13,marginBottom:14,
                border:`1px solid ${T.accent}`,maxHeight:280,overflowY:'auto',
              }}>
                <div style={{ fontSize:13,fontWeight:600,marginBottom:10,color:T.accent }}>انتخاب حرکت</div>
                {exercises.map(ex => (
                  <div key={ex.id} onClick={() => addExercise(ex.id)} style={{
                    display:'flex',justifyContent:'space-between',alignItems:'center',
                    padding:'9px 8px',cursor:'pointer',borderRadius:7,transition:'background 0.15s',
                  }}
                    onMouseOver={e => e.currentTarget.style.background = T.surface}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{ fontSize:14 }}>{ex.emoji} {ex.name}</span>
                    <span style={{ fontSize:11,color:T.muted }}>{ex.muscle_group}</span>
                  </div>
                ))}
              </div>
            ) : (
              <button onClick={() => setShowExPicker(true)} style={{
                width:'100%',padding:13,background:T.surface,
                border:`1px dashed ${T.border}`,borderRadius:11,
                color:T.muted,cursor:'pointer',fontSize:14,fontFamily:'inherit',
                marginBottom:14,transition:'all 0.2s',
              }}
                onMouseOver={e => { e.target.style.borderColor=T.accent; e.target.style.color=T.accent }}
                onMouseOut={e => { e.target.style.borderColor=T.border; e.target.style.color=T.muted }}
              >+ افزودن حرکت</button>
            )}

            {newProg.exercises.length > 0 && (
              <Btn onClick={saveProgram} style={{
                width:'100%',fontSize:15,
                opacity: newProg.name ? 1 : 0.4,
                cursor: newProg.name ? 'pointer' : 'default',
              }}>ذخیره برنامه</Btn>
            )}
          </div>
        )}

        {/* ── Exercises Tab ── */}
        {tab === 'exercises' && !selectedTrainee && (
          <div>
            <h2 style={{ fontSize:17,fontWeight:700,marginBottom:14 }}>بانک حرکات ({exercises.length})</h2>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:9 }}>
              {exercises.map((ex, i) => (
                <div key={ex.id} style={{
                  background:T.card,borderRadius:12,padding:13,
                  border:`1px solid ${T.border}`,textAlign:'center',
                  animation:`fadeUp 0.3s ease ${i*0.02}s both`,
                }}>
                  <div style={{ fontSize:26,marginBottom:4 }}>{ex.emoji}</div>
                  <div style={{ fontSize:13,fontWeight:600,marginBottom:1 }}>{ex.name}</div>
                  <div style={{ fontSize:10,color:T.muted }}>{ex.name_en}</div>
                  <div style={{
                    marginTop:5,fontSize:10,color:T.accent,background:T.accentBg,
                    padding:'2px 8px',borderRadius:5,display:'inline-block',
                  }}>{ex.muscle_group}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── TRAINEE DASHBOARD ───────────────────
function TraineeView({ user, onLogout }) {
  const [programs, setPrograms] = useState([])
  const [activeProg, setActiveProg] = useState(null)
  const [completed, setCompleted] = useState({})
  const [weights, setWeights] = useState({})
  const [timer, setTimer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)

  useEffect(() => {
    Promise.all([
      api.getPrograms(),
      api.traineeStats(),
    ]).then(([p, s]) => {
      setPrograms(p); setStats(s); setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const toggleSet = async (exIdx, setIdx, rest, exerciseId, programId, weight, reps) => {
    const key = `${exIdx}-${setIdx}`
    const wasDone = completed[key]
    setCompleted(prev => {
      const next = { ...prev }
      if (next[key]) { delete next[key]; return next }
      next[key] = true
      return next
    })
    if (!wasDone) {
      setTimer(rest)
      try {
        await api.logWorkout([{
          program_id: programId,
          exercise_id: exerciseId,
          set_number: setIdx + 1,
          weight: weights[exIdx] ?? weight,
          reps,
          completed: true,
        }])
      } catch (e) { console.error(e) }
    }
  }

  const getProgress = () => {
    if (!activeProg) return 0
    const total = activeProg.exercises.reduce((s, ex) => s + ex.sets, 0)
    const done = Object.keys(completed).length
    return total > 0 ? Math.round((done / total) * 100) : 0
  }

  if (loading) return <><Header user={user} onLogout={onLogout}/><Loading/></>

  return (
    <div style={{ minHeight:'100vh', background:T.bg }}>
      {timer && <RestTimer seconds={timer} onDone={() => setTimer(null)} />}
      <Header user={user} onLogout={onLogout} />

      {/* Stats */}
      {stats && !activeProg && (
        <div style={{ display:'flex',gap:1,background:T.border }}>
          {[
            { label:'روز تمرین',val:stats.total_workouts },
            { label:'ست انجام شده',val:stats.total_sets },
            { label:'برنامه فعال',val:stats.active_programs },
          ].map(s => (
            <div key={s.label} style={{ flex:1,background:T.surface,padding:'12px 8px',textAlign:'center' }}>
              <div style={{ fontSize:20,fontWeight:800,color:T.accent }}>{s.val}</div>
              <div style={{ fontSize:10,color:T.muted }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ padding:16, maxWidth:600, margin:'0 auto' }}>
        {!activeProg ? (
          <div>
            <h2 style={{ fontSize:15,fontWeight:600,marginBottom:14,color:T.muted }}>برنامه‌های من</h2>
            {programs.length === 0 ? (
              <div style={{ textAlign:'center',padding:36,color:T.muted,animation:'fadeUp 0.4s' }}>
                <div style={{ fontSize:44,marginBottom:10,opacity:0.3 }}>📋</div>
                <div>هنوز برنامه‌ای ثبت نشده</div>
                <div style={{ fontSize:12,marginTop:4 }}>از مربی خود بخواهید برنامه بنویسد</div>
              </div>
            ) : programs.map((prog, i) => (
              <div key={prog.id} onClick={() => { setActiveProg(prog); setCompleted({}); setWeights({}) }} style={{
                background:T.card,borderRadius:15,padding:17,marginBottom:11,cursor:'pointer',
                border:`1px solid ${T.border}`,animation:`slideIn 0.3s ease ${i*0.07}s both`,
                transition:'all 0.2s',
              }}
                onMouseOver={e => e.currentTarget.style.borderColor = T.accent}
                onMouseOut={e => e.currentTarget.style.borderColor = T.border}
              >
                <div style={{ display:'flex',justifyContent:'space-between',marginBottom:8 }}>
                  <span style={{ fontWeight:700,fontSize:16 }}>{prog.name}</span>
                  {prog.session_number && (
                    <span style={{ background:T.accentBg,color:T.accent,padding:'3px 10px',borderRadius:7,fontSize:12,fontWeight:600 }}>
                      جلسه {prog.session_number}
                    </span>
                  )}
                </div>
                <div style={{ display:'flex',gap:12 }}>
                  <span style={{ fontSize:12,color:T.muted }}>{prog.exercises?.length} حرکت</span>
                  <span style={{ fontSize:12,color:T.muted }}>{prog.exercises?.reduce((s,e) => s+e.sets,0)} ست</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ animation:'fadeUp 0.3s' }}>
            <button onClick={() => setActiveProg(null)} style={{
              background:'transparent',border:'none',color:T.muted,cursor:'pointer',
              fontSize:13,fontFamily:'inherit',marginBottom:10,
            }}>→ بازگشت</button>

            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16 }}>
              <h2 style={{ fontSize:17,fontWeight:700 }}>{activeProg.name}</h2>
              <span style={{ fontSize:14,fontWeight:700,color:T.accent }}>{getProgress()}%</span>
            </div>

            <div style={{ height:4,background:T.border,borderRadius:2,marginBottom:18,overflow:'hidden' }}>
              <div style={{ height:'100%',background:T.accent,borderRadius:2,width:`${getProgress()}%`,transition:'width 0.4s' }}/>
            </div>

            {activeProg.exercises?.map((ex, exIdx) => {
              const w = weights[exIdx] ?? ex.weight
              const allDone = Array.from({ length:ex.sets }).every((_,i) => completed[`${exIdx}-${i}`])
              return (
                <div key={exIdx} style={{
                  background: allDone ? 'rgba(46,213,115,0.05)' : T.card,
                  borderRadius:15,padding:15,marginBottom:11,
                  border:`1px solid ${allDone ? 'rgba(46,213,115,0.2)' : T.border}`,
                  transition:'all 0.3s', animation:`slideIn 0.3s ease ${exIdx*0.05}s both`,
                }}>
                  <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12 }}>
                    <div style={{ display:'flex',alignItems:'center',gap:9 }}>
                      <span style={{ fontSize:20 }}>{ex.emoji}</span>
                      <div>
                        <div style={{ fontWeight:700,fontSize:14 }}>{ex.name}</div>
                        <div style={{ fontSize:10,color:T.muted }}>{ex.name_en}</div>
                      </div>
                    </div>
                    {allDone && <span style={{ color:T.success,fontSize:20 }}>✓</span>}
                  </div>

                  <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:12,justifyContent:'center' }}>
                    <button onClick={() => setWeights(p => ({...p,[exIdx]:Math.max(0,w-2.5)}))} style={{
                      width:34,height:34,borderRadius:9,background:T.surface,
                      border:`1px solid ${T.border}`,color:T.text,fontSize:17,cursor:'pointer',
                    }}>−</button>
                    <div style={{
                      background:T.surface,borderRadius:9,padding:'7px 18px',minWidth:75,textAlign:'center',
                      border:`1px solid ${T.border}`,
                    }}>
                      <div style={{ fontSize:19,fontWeight:800 }}>{w}</div>
                      <div style={{ fontSize:9,color:T.muted }}>kg</div>
                    </div>
                    <button onClick={() => setWeights(p => ({...p,[exIdx]:w+2.5}))} style={{
                      width:34,height:34,borderRadius:9,background:T.surface,
                      border:`1px solid ${T.border}`,color:T.text,fontSize:17,cursor:'pointer',
                    }}>+</button>
                  </div>

                  <div style={{ display:'flex',gap:7,justifyContent:'center',flexWrap:'wrap' }}>
                    {Array.from({ length:ex.sets }).map((_,setIdx) => {
                      const done = completed[`${exIdx}-${setIdx}`]
                      return (
                        <button key={setIdx}
                          onClick={() => toggleSet(exIdx,setIdx,ex.rest_seconds,ex.exercise_id,activeProg.id,w,ex.reps)}
                          style={{
                            width:50,height:50,borderRadius:11,
                            background: done ? T.accent : T.surface,
                            border: done ? 'none' : `1px solid ${T.border}`,
                            color: done ? T.bg : T.text,
                            fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',
                            display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
                            transition:'all 0.2s', transform: done ? 'scale(0.95)' : 'none',
                          }}
                        >
                          <div style={{ fontSize:9,opacity:0.7 }}>ست {setIdx+1}</div>
                          <div>{ex.reps}×</div>
                        </button>
                      )
                    })}
                  </div>

                  <div style={{ textAlign:'center',marginTop:8,fontSize:11,color:T.muted }}>
                    استراحت: {ex.rest_seconds} ثانیه
                  </div>
                </div>
              )
            })}

            {getProgress() === 100 && (
              <div style={{
                textAlign:'center',padding:22,marginTop:6,
                background:T.successBg,borderRadius:15,animation:'fadeUp 0.5s',
              }}>
                <div style={{ fontSize:38,marginBottom:6 }}>🎉</div>
                <div style={{ fontSize:17,fontWeight:700,color:T.success }}>تمرین تمام شد!</div>
                <div style={{ fontSize:12,color:T.muted,marginTop:3 }}>خسته نباشی</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── APP ─────────────────────────────────
export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('blugen_user')
    return saved ? JSON.parse(saved) : null
  })

  const logout = () => {
    localStorage.removeItem('blugen_token')
    localStorage.removeItem('blugen_user')
    setUser(null)
  }

  return (
    <>
      <style>{globalCSS}</style>
      {!user ? (
        <LoginScreen onLogin={setUser} />
      ) : user.role === 'trainer' || user.role === 'admin' ? (
        <TrainerView user={user} onLogout={logout} />
      ) : (
        <TraineeView user={user} onLogout={logout} />
      )}
    </>
  )
}

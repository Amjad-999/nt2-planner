export default function Platform() {
  return (
    <div style={{ padding:'24px 28px 60px', maxWidth:1100, margin:'0 auto' }}>
      <div style={{ background:'var(--grad-hero)', color:'#F5F0EB', borderRadius:'var(--r)', padding:'36px 28px', marginBottom:20, boxShadow:'var(--shadow-lg)', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-40, insetInlineEnd:-40, width:240, height:240, borderRadius:'50%', background:'radial-gradient(circle,rgba(224,122,62,.32),transparent 70%)', pointerEvents:'none' }} />
        <div style={{ position:'relative', zIndex:1, maxWidth:640 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(224,122,62,.18)', color:'#EBBDA2', padding:'6px 14px', borderRadius:99, fontSize:'.78rem', fontWeight:600, marginBottom:14 }}>⭐ المنصّة الأساسية لدراستي</div>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:'2.2rem', fontWeight:'var(--fw-heading)', color:'#FBF3EA', marginBottom:10, letterSpacing:'-.4px' }}>KleurRijker — Leren</h2>
          <p style={{ fontSize:'1rem', color:'#D9C9B8', marginBottom:18, lineHeight:1.65 }}>
            هنا أدرس <strong style={{ color:'#EBBDA2' }}>كل دروسي من الكتب</strong> وأحلّ <strong style={{ color:'#EBBDA2' }}>كل التمارين</strong> — 90% من وقت دراستي يمرّ عبر هذه المنصّة.
          </p>
          <a href="https://leren.kleurrijker.nl/my/" target="_blank" rel="noopener noreferrer" className="btn-shine"
            style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(255,244,235,.15)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)', border:'1px solid rgba(255,244,235,.3)', color:'#fff', borderRadius:14, padding:'13px 22px', fontWeight:700, fontSize:'.95rem', textDecoration:'none', boxShadow:'var(--elev-1), inset 0 1px 0 rgba(255,244,235,.2)' }}>
            🚀 افتح المنصّة الآن <span style={{ marginInlineStart:6 }}>↗</span>
          </a>
          <div style={{ marginTop:14, fontSize:'.84rem', color:'#B0A296', display:'flex', alignItems:'center', gap:6 }}>
            🔗 <span dir="ltr">leren.kleurrijker.nl/my</span>
          </div>
        </div>
      </div>

      <div className="stagger" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:12 }}>
        {[
          { icon:'📖', t:'دروس الكتب', d:'جميع دروس A2 وB1 (Deel 1 وDeel 2) متاحة بشكل تفاعلي على المنصّة.' },
          { icon:'✏️', t:'التمارين العملية', d:'حلّ التمارين هنا أوّلًا، ثمّ سجّل إتمام المهمّة في خطّة الدراسة ليُحتسب الوقت تلقائيًا.' },
          { icon:'⏱️', t:'قبل أن تبدأ', d:'شغّل مؤقّت المهمّة من تبويب «الخطّة» ثمّ افتح المنصّة في علامة تبويب جديدة.' },
        ].map((c) => (
          <div key={c.t} style={{ background:'var(--glass-bg)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)', border:'1px solid var(--glass-border)', borderRadius:'var(--r-sm)', padding:14, boxShadow:'var(--elev-1)' }}>
            <div style={{ fontWeight:600, color:'var(--text)', marginBottom:4 }}>{c.icon} {c.t}</div>
            <div style={{ fontSize:'.8rem', color:'var(--text2)', lineHeight:1.5 }}>{c.d}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Platform() {
  return (
    <div className="page">
      {/* The remaining literal inks below sit on --grad-hero, which is dark in
          BOTH themes, so they cannot break dark mode. Measured against the
          lightest gradient stop in each theme they clear AA with room:
          #F5F0EB 10.49:1, #EBBDA2 6.97:1, #B0A296 4.78:1 (light theme; dark is
          higher). They are kept as-is because no token exists for these three
          accent shades and inventing one is a design decision, not a fix — but
          if --grad-hero is ever lightened, re-measure these five values. */}
      <div style={{ background:'var(--grad-hero)', color:'#F5F0EB', borderRadius:'var(--r)', padding:'var(--sp-8) 28px', marginBottom:'var(--sp-5)', boxShadow:'var(--elev-3)', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-40, insetInlineEnd:-40, width:240, height:240, borderRadius:'var(--r-full)', background:'radial-gradient(circle,rgba(224,122,62,.32),transparent 70%)', pointerEvents:'none' }} />
        <div style={{ position:'relative', zIndex:1, maxWidth:640 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:'var(--sp-2)', background:'rgba(224,122,62,.18)', color:'#EBBDA2', padding:'6px 14px', borderRadius:'var(--r-pill)', fontSize:'var(--text-xs)', fontWeight:'var(--fw-heading)', marginBottom:'var(--sp-3)' }}>⭐ المنصّة الأساسية لدراستي</div>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:'var(--text-3xl)', fontWeight:'var(--fw-heading)', color:'var(--hero-ink)', marginBottom:'var(--sp-3)', letterSpacing:'-.4px' }}>KleurRijker — Leren</h2>
          <p style={{ fontSize:'var(--text-base)', color:'#D9C9B8', marginBottom:'var(--sp-4)', lineHeight:'var(--lh-arabic)' }}>
            هنا أدرس <strong style={{ color:'#EBBDA2' }}>كل دروسي من الكتب</strong> وأحلّ <strong style={{ color:'#EBBDA2' }}>كل التمارين</strong> — 90% من وقت دراستي يمرّ عبر هذه المنصّة.
          </p>
          <a href="https://leren.kleurrijker.nl/my/" target="_blank" rel="noopener noreferrer" className="btn-shine"
            style={{ display:'inline-flex', alignItems:'center', gap:'var(--sp-2)', background:'rgba(255,244,235,.15)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)', border:'1px solid rgba(255,244,235,.3)', color:'#fff', borderRadius:'var(--r-sm)', padding:'13px 22px', fontWeight:'var(--fw-cta)', fontSize:'var(--text-base)', textDecoration:'none', boxShadow:'var(--elev-1), inset 0 1px 0 rgba(255,244,235,.2)' }}>
            🚀 افتح المنصّة الآن <span style={{ marginInlineStart:'var(--sp-2)' }}>↗</span>
          </a>
          <div style={{ marginTop:'var(--sp-3)', fontSize:'var(--text-sm)', color:'#B0A296', display:'flex', alignItems:'center', gap:'var(--sp-2)' }}>
            🔗 <span dir="ltr">leren.kleurrijker.nl/my</span>
          </div>
        </div>
      </div>

      <div className="stagger" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(min(220px, 100%),1fr))', gap:'var(--sp-3)' }}>
        {[
          { icon:'📖', t:'دروس الكتب', d:'جميع دروس A2 وB1 (Deel 1 وDeel 2) متاحة بشكل تفاعلي على المنصّة.' },
          { icon:'✏️', t:'التمارين العملية', d:'حلّ التمارين هنا أوّلًا، ثمّ سجّل إتمام المهمّة في خطّة الدراسة ليُحتسب الوقت تلقائيًا.' },
          { icon:'⏱️', t:'قبل أن تبدأ', d:'شغّل مؤقّت المهمّة من تبويب «الخطّة» ثمّ افتح المنصّة في علامة تبويب جديدة.' },
        ].map((c) => (
          <div key={c.t} style={{ background:'var(--glass-bg)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)', border:'1px solid var(--glass-border)', borderRadius:'var(--r-sm)', padding:14, boxShadow:'var(--elev-1)' }}>
            <div style={{ fontWeight:'var(--fw-heading)', color:'var(--text)', marginBottom:'var(--sp-1)' }}>{c.icon} {c.t}</div>
            <div style={{ fontSize:'var(--text-xs)', color:'var(--text2)', lineHeight:'var(--lh-ui)' }}>{c.d}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

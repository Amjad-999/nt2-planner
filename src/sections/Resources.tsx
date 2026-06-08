import { RESOURCE_GROUPS } from '@/data/resources'

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export default function Resources(_: {}) {
  return (
    <div style={{ padding:'24px 28px 60px', maxWidth:1100, margin:'0 auto' }}>
      <h2 style={{ fontFamily:'var(--font-display)', fontSize:'1.5rem', fontWeight:700, color:'var(--text)', margin:'0 0 12px', display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ color:'var(--orange)' }}>🔗</span> مصادر رسمية وعلى الإنترنت
      </h2>
      <div style={{ background:'var(--blue-l)', border:'1px solid var(--glass-border)', borderInlineStart:'3px solid var(--blue)', borderRadius:'var(--r-sm)', padding:'14px 18px', marginBottom:18, fontSize:'.9rem', color:'var(--text2)', lineHeight:1.65 }}>
        <strong style={{ color:'var(--text)' }}>أهم نصيحة:</strong> ملفّات الامتحانات الرسمية (Lezen / Luisteren / Schrijven / Spreken لسنوات ٢٠٢٣ و٢٠٢٤ و٢٠٢٥) محفوظة لديك في مجلّد <em>NT</em>. استخدمها كمعيار حقيقي للصعوبة بعد أن تُكمل المحاكاة هنا.
      </div>

      {RESOURCE_GROUPS.map((group) => (
        <div key={group.title}>
          <h3 style={{ fontSize:'1.05rem', fontWeight:600, color:'var(--text)', margin:'18px 0 10px' }}>{group.title}</h3>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:12 }}>
            {group.links.map((link) => (
              <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer"
                style={{ background:'var(--glass-bg)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)', border:'1px solid var(--glass-border)', borderRadius:'var(--r-sm)', padding:14, textDecoration:'none', color:'inherit', display:'block', boxShadow:'var(--elev-1)', transition:'.18s' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLAnchorElement).style.boxShadow = 'var(--elev-3)'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--orange-m)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.transform = ''; (e.currentTarget as HTMLAnchorElement).style.boxShadow = 'var(--elev-1)'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--glass-border)' }}
              >
                <div style={{ fontWeight:600, color:'var(--text)', marginBottom:4 }}>{link.title}</div>
                <div style={{ fontSize:'.8rem', color:'var(--text2)', lineHeight:1.5 }}>{link.desc}</div>
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

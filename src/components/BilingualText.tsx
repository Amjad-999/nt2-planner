/** Keeps short Dutch fragments readable inside existing Arabic explanations. */
export function BilingualText({ text }: { text: string }) {
  return <>{text.split(/([A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ0-9'’/.,:;!?()\s-]*)/g).map((part, index) => (
    /[A-Za-zÀ-ÖØ-öø-ÿ]/.test(part)
      ? <bdi key={index} dir="ltr" lang="nl" style={{ fontFamily: 'var(--font-latin)' }}>{part}</bdi>
      : part
  ))}</>
}

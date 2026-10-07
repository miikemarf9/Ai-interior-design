export default function Loading(){
  return (
    <main className="globalStatePage" aria-live="polite" aria-busy="true">
      <div className="shell">
        <p className="eyebrow">Roomfound</p>
        <h1>Loading the room.</h1>
        <div className="briefLoadingLine"><i /></div>
        <p>We keep slow network work visible rather than leaving the page looking frozen.</p>
      </div>
    </main>
  );
}

'use client';

export default function GlobalError({
  reset,
}:{
  error:Error & {digest?:string};
  reset:()=>void;
}){
  return (
    <html lang="en-GB">
      <body>
        <main className="globalStatePage" role="alert">
          <div className="shell">
            <p className="eyebrow">Roomfound</p>
            <h1>We could not open the experience.</h1>
            <p>No new render should be started until this page has recovered.</p>
            <button className="button buttonPrimary" type="button" onClick={reset}>Reload Roomfound</button>
          </div>
        </main>
      </body>
    </html>
  );
}

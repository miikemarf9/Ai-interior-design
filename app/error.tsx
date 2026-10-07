'use client';

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}:{
  error:Error & {digest?:string};
  reset:()=>void;
}){
  useEffect(()=>{console.error(error);},[error]);

  return (
    <main className="globalStatePage" role="alert">
      <div className="shell">
        <p className="eyebrow">Something did not load</p>
        <h1>Your room is still safe.</h1>
        <p>A page-level error interrupted this view. Retry it before starting the step again.</p>
        <button className="button buttonPrimary" type="button" onClick={reset}>Try again</button>
      </div>
    </main>
  );
}

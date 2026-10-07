'use client';

import { FormEvent, useState } from "react";

export function BetaFeedback({designId}:{designId?:string}){
  const [rating,setRating]=useState<number|null>(null);
  const [sent,setSent]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const form=new FormData(event.currentTarget);
    const feedback=String(form.get("feedback") || "").trim();
    if(!feedback) return;

    setBusy(true);
    setError("");
    try{
      const response=await fetch("/api/beta/feedback",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          designId,
          rating:rating ?? undefined,
          feedback,
          pagePath:window.location.pathname,
        }),
      });
      if(!response.ok) throw new Error("Feedback could not be sent.");
      setSent(true);
    }catch(err){
      setError(err instanceof Error ? err.message : "Feedback could not be sent.");
    }finally{
      setBusy(false);
    }
  }

  return (
    <section className="betaFeedback">
      <div>
        <p className="eyebrow">Controlled beta</p>
        <h2>{sent ? "Thank you. That is useful." : "Tell us where the experience breaks down."}</h2>
        <p>{sent
          ? "Your feedback has been attached to the beta record."
          : "We are testing whether Roomfound is genuinely useful, not looking for compliments. Tell us what felt confusing, slow, inaccurate or missing."}</p>
      </div>

      {!sent ? (
        <form onSubmit={submit}>
          <fieldset>
            <legend>How useful was this room?</legend>
            <div className="betaRating">
              {[1,2,3,4,5].map((value)=>(
                <button
                  key={value}
                  type="button"
                  className={rating===value ? "isSelected" : ""}
                  aria-pressed={rating===value}
                  onClick={()=>setRating(value)}
                >
                  {value}
                </button>
              ))}
            </div>
          </fieldset>
          <label>
            <span>What should we fix?</span>
            <textarea name="feedback" rows={4} maxLength={3000} required placeholder="For example: the sofa looked right, but the scale felt wrong…" />
          </label>
          {error ? <p className="accountFormError" role="alert">{error}</p> : null}
          <button className="button buttonPrimary" type="submit" disabled={busy}>
            {busy ? "Sending…" : "Send beta feedback"}
          </button>
        </form>
      ) : null}
    </section>
  );
}

'use client';

import Link from "next/link";
import { FormEvent, useState } from "react";

export function ResetPasswordExperience({ token }: { token: string }) {
  const [error,setError]=useState("");
  const [done,setDone]=useState(false);
  const [busy,setBusy]=useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const form=new FormData(event.currentTarget);
    const password=String(form.get("password") || "");
    const confirm=String(form.get("confirm") || "");

    if(password!==confirm){
      setError("The passwords do not match.");
      setBusy(false);
      return;
    }

    const response=await fetch("/api/auth/reset-password",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({token,password}),
    });
    const data=await response.json() as {error?:string};
    if(!response.ok){
      setError(data.error || "Password could not be reset.");
      setBusy(false);
      return;
    }

    setDone(true);
    setBusy(false);
  }

  return (
    <main className="accountPage resetPasswordPage">
      <header className="accountTopbar"><Link href="/" className="accountBrand">Roomfound</Link></header>
      <section className="resetPasswordCard">
        <p className="eyebrow">Account security</p>
        {done ? (
          <>
            <h1>Password changed.</h1>
            <p>You are signed in again on this device.</p>
            <Link className="button buttonPrimary" href="/account">Open My rooms</Link>
          </>
        ) : (
          <form onSubmit={submit}>
            <h1>Choose a new password.</h1>
            <label><span>New password</span><input name="password" type="password" minLength={10} autoComplete="new-password" required /></label>
            <label><span>Confirm password</span><input name="confirm" type="password" minLength={10} autoComplete="new-password" required /></label>
            {error ? <p className="accountFormError">{error}</p> : null}
            <button className="button buttonPrimary" type="submit" disabled={busy || !token}>{busy ? "Saving…" : "Save new password"}</button>
          </form>
        )}
      </section>
    </main>
  );
}

'use client';

import { useState } from "react";

export function AccountPrivacyControls({
  initialMarketingEmails,
}:{
  initialMarketingEmails:boolean;
}){
  const [marketing,setMarketing]=useState(initialMarketingEmails);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState("");

  async function updateMarketing(next:boolean){
    setBusy(true);
    setNotice("");
    try{
      const response=await fetch("/api/account/preferences",{
        method:"PATCH",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({marketingEmails:next}),
      });
      if(!response.ok) throw new Error("Preference could not be saved.");
      setMarketing(next);
      setNotice(next
        ? "Marketing email consent saved. You can turn it off here at any time."
        : "Marketing emails are off.");
    }catch(error){
      setNotice(error instanceof Error ? error.message : "Preference could not be saved.");
    }finally{
      setBusy(false);
    }
  }

  async function requestPrivacy(type:"access"|"deletion"){
    if(type==="deletion" && !window.confirm("Submit an account deletion request? Your account is not deleted immediately; the request will be reviewed and completed through the beta privacy process.")){
      return;
    }
    setBusy(true);
    setNotice("");
    try{
      const response=await fetch("/api/privacy/requests",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({type}),
      });
      if(!response.ok) throw new Error("Privacy request could not be submitted.");
      setNotice(type==="deletion"
        ? "Deletion request submitted."
        : "Access request submitted. You can also download the current data export immediately.");
    }catch(error){
      setNotice(error instanceof Error ? error.message : "Privacy request could not be submitted.");
    }finally{
      setBusy(false);
    }
  }

  return (
    <section className="accountPrivacy">
      <div>
        <p className="eyebrow">Privacy & preferences</p>
        <h2>Your data stays under your control.</h2>
        <p>Download what Roomfound currently holds, manage optional marketing or submit a privacy request.</p>
      </div>

      <div className="accountPrivacyControls">
        <label className="privacyToggle">
          <span>
            <strong>Design follow-up emails</strong>
            <small>Email me about unfinished Roomfound designs and relevant Roomfound product/design updates.</small>
          </span>
          <input
            type="checkbox"
            checked={marketing}
            disabled={busy}
            onChange={(event)=>void updateMarketing(event.target.checked)}
          />
        </label>

        <div className="privacyActionRow">
          <a className="button buttonSecondary buttonCompact" href="/api/privacy/export">Download my data</a>
          <button type="button" disabled={busy} onClick={()=>void requestPrivacy("access")}>Request access</button>
          <button type="button" disabled={busy} onClick={()=>void requestPrivacy("deletion")}>Request deletion</button>
        </div>
        {notice ? <p className="privacyNotice" role="status">{notice}</p> : null}
      </div>
    </section>
  );
}

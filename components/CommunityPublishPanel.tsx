'use client';

import Link from "next/link";
import { useEffect, useState } from "react";

type PublishedRoom={id:string;slug:string;title:string};

export function CommunityPublishPanel({
  designId,
  generationId,
  initialTitle,
}:{
  designId:string;
  generationId:string;
  initialTitle:string;
}){
  const [title,setTitle]=useState(initialTitle.replace(/^your\s+/i,"").trim().slice(0,80) || "My room");
  const [consent,setConsent]=useState(false);
  const [published,setPublished]=useState<PublishedRoom|null>(null);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);

  useEffect(()=>{
    let cancelled=false;
    fetch("/api/community/rooms?generationId="+encodeURIComponent(generationId),{cache:"no-store"})
      .then(async response=>{
        if(!response.ok) return;
        const payload=await response.json() as {room?:PublishedRoom|null};
        if(!cancelled && payload.room) setPublished(payload.room);
      })
      .catch(()=>undefined);
    return ()=>{cancelled=true;};
  },[generationId]);

  async function publish(){
    if(!consent || busy) return;
    setBusy(true);
    setError("");
    try{
      const response=await fetch("/api/community/rooms",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({designId,generationId,title,publicConsent:consent}),
      });
      const payload=await response.json() as {room?:PublishedRoom;error?:string};
      if(!response.ok || !payload.room) throw new Error(payload.error || "The room could not be published.");
      setPublished(payload.room);
      setConsent(false);
    }catch(caught){
      setError(caught instanceof Error ? caught.message : "The room could not be published.");
    }finally{
      setBusy(false);
    }
  }

  async function remove(){
    if(!published || busy) return;
    setBusy(true);
    setError("");
    try{
      const response=await fetch("/api/community/rooms/"+encodeURIComponent(published.id),{method:"DELETE"});
      const payload=await response.json() as {error?:string};
      if(!response.ok) throw new Error(payload.error || "The room could not be removed.");
      setPublished(null);
    }catch(caught){
      setError(caught instanceof Error ? caught.message : "The room could not be removed.");
    }finally{
      setBusy(false);
    }
  }

  return (
    <section className="communityPublishPanel">
      <div>
        <p className="eyebrow">Share with the community</p>
        <h2>Let people discover your room.</h2>
        <p>Publish the finished room so others can view it and give it a thumbs-up. The generated room image is shared, not your uploaded room photo. The public room page also shows the design summary and shoppable product list.</p>
      </div>
      {published ? (
        <div className="communityPublishStatus">
          <p>Your room is in the community gallery.</p>
          <div className="communityPublishActions">
            <Link className="button buttonPrimary buttonCompact" href="/community">View the gallery</Link>
            <button className="button buttonSecondary buttonCompact" type="button" onClick={remove} disabled={busy}>
              {busy ? "Removing…" : "Remove from gallery"}
            </button>
          </div>
        </div>
      ) : (
        <div className="communityPublishForm">
          <label htmlFor="community-room-title">Room name</label>
          <input id="community-room-title" value={title} maxLength={80} onChange={event=>setTitle(event.target.value)} />
          <label className="communityConsent">
            <input type="checkbox" checked={consent} onChange={event=>setConsent(event.target.checked)} />
            <span>I understand the generated room, design summary, selected products and their current prices will be public on Transform My Room. Other visitors can view it and vote. I can remove it from the gallery later.</span>
          </label>
          <button className="button buttonPrimary" type="button" onClick={publish} disabled={!consent || !title.trim() || busy}>
            {busy ? "Publishing…" : "Publish this room"}
          </button>
          {error ? <p className="communityFormError">{error}{error.toLowerCase().includes("sign in") ? <> <Link href="/account">Sign in or create an account.</Link></> : null}</p> : null}
        </div>
      )}
    </section>
  );
}

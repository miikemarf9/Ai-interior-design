'use client';

import { usePathname } from "next/navigation";
import { useReportWebVitals } from "next/web-vitals";
import { useEffect, useState } from "react";

declare global {
  interface Window {
    roomfoundTrack?: (eventName:string,properties?:Record<string,unknown>)=>void;
  }
}

function consentValue(){
  if(typeof document==="undefined") return "";
  return document.cookie
    .split("; ")
    .find((row)=>row.startsWith("roomfound_consent="))
    ?.split("=")[1] || "";
}

async function send(eventName:string,properties:Record<string,unknown>={}){
  if(consentValue()!=="analytics") return;
  let referrerHost="";
  try{
    referrerHost=document.referrer ? new URL(document.referrer).hostname : "";
  }catch{
    referrerHost="";
  }

  try{
    const runtimeRaw=window.localStorage.getItem("roomfound-design-runtime-v1");
    const runtime=runtimeRaw ? JSON.parse(runtimeRaw) as {designId?:string;generationId?:string} : {};
    await fetch("/api/analytics/event",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      keepalive:true,
      body:JSON.stringify({
        eventName,
        path:window.location.pathname,
        referrerHost,
        designId:runtime.designId,
        generationId:runtime.generationId,
        properties,
      }),
    });
  }catch{
    // Analytics must never interrupt the product experience.
  }
}

export function AnalyticsClient(){
  const pathname=usePathname();

  useReportWebVitals((metric)=>{
    if(["LCP","INP","CLS"].includes(metric.name)){
      void send("web_vital",{
        name:metric.name,
        value:metric.value,
        rating:metric.rating,
        id:metric.id,
      });
    }
  });

  useEffect(()=>{
    window.roomfoundTrack=(eventName,properties)=>{void send(eventName,properties);};
    return ()=>{delete window.roomfoundTrack;};
  },[]);

  useEffect(()=>{
    void send("page_view",{pathname});
  },[pathname]);

  return null;
}

export function CookieConsent(){
  const [visible,setVisible]=useState(false);

  useEffect(()=>{
    setVisible(!consentValue());
  },[]);

  function choose(value:"essential"|"analytics"){
    const secure=window.location.protocol==="https:" ? "; Secure" : "";
    document.cookie=`roomfound_consent=${value}; Max-Age=15552000; Path=/; SameSite=Lax${secure}`;
    setVisible(false);
    void fetch("/api/account/preferences",{
      method:"PATCH",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({analytics:value==="analytics"}),
    }).catch(()=>undefined);
    if(value==="analytics") void send("page_view",{consent:"just_granted"});
  }

  if(!visible) return null;

  return (
    <aside className="cookieConsent" aria-label="Cookie preferences">
      <div>
        <strong>Privacy first.</strong>
        <p>Roomfound uses essential storage to keep the service working. Optional first-party analytics help us understand the beta. We do not run behavioural analytics unless you choose it.</p>
      </div>
      <div className="cookieConsentActions">
        <button type="button" onClick={()=>choose("essential")}>Essential only</button>
        <button className="button buttonPrimary buttonCompact" type="button" onClick={()=>choose("analytics")}>Allow analytics</button>
      </div>
      <a href="/cookies">Cookie details</a>
    </aside>
  );
}

export function trackRoomfound(eventName:string,properties?:Record<string,unknown>){
  if(typeof window!=="undefined") window.roomfoundTrack?.(eventName,properties);
}

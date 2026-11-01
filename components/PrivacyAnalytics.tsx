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

function awinConsentValue(){
  if(typeof document==="undefined") return "";
  return document.cookie
    .split("; ")
    .find((row)=>row.startsWith("roomfound_awin_consent="))
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
  const [analytics,setAnalytics]=useState(false);
  const [awinTracking,setAwinTracking]=useState(false);

  useEffect(()=>{
    setAnalytics(consentValue()==="analytics");
    setAwinTracking(awinConsentValue()==="1");
    setVisible(!consentValue() || !awinConsentValue());
    const openSettings=()=>setVisible(true);
    window.addEventListener("roomfound:open-cookie-settings",openSettings);
    return ()=>window.removeEventListener("roomfound:open-cookie-settings",openSettings);
  },[]);

  function saveChoices(allowAnalytics:boolean,allowAwinTracking:boolean){
    const secure=window.location.protocol==="https:" ? "; Secure" : "";
    const cookieOptions=`Max-Age=15552000; Path=/; SameSite=Lax${secure}`;
    document.cookie=`roomfound_consent=${allowAnalytics ? "analytics" : "essential"}; ${cookieOptions}`;
    document.cookie=`roomfound_awin_consent=${allowAwinTracking ? "1" : "0"}; ${cookieOptions}`;
    setVisible(false);
    void fetch("/api/account/preferences",{
      method:"PATCH",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({analytics:allowAnalytics}),
    }).catch(()=>undefined);
    window.dispatchEvent(new Event("roomfound:consent-updated"));
    if(allowAnalytics) void send("page_view",{consent:"just_granted"});
  }

  if(!visible) return null;

  return (
    <aside className="cookieConsent" aria-label="Cookie preferences">
      <div className="cookieConsentIntro">
        <strong>Your choices, simply.</strong>
        <p>Essential storage keeps your room plans working. Optional product analytics help us improve. Awin partner-link tracking lets us know when a retailer purchase came from our recommendations, helping fund our product research and design tools at no extra cost to you.</p>
      </div>
      <div className="cookieConsentChoices">
        <label><input type="checkbox" checked={awinTracking} onChange={event=>setAwinTracking(event.target.checked)} /><span><strong>Awin partner-link tracking</strong><small>Allow Awin to attribute a purchase to our link.</small></span></label>
        <label><input type="checkbox" checked={analytics} onChange={event=>setAnalytics(event.target.checked)} /><span><strong>Product analytics</strong><small>Allow anonymous usage analytics to improve the beta.</small></span></label>
      </div>
      <div className="cookieConsentActions">
        <button type="button" onClick={()=>saveChoices(false,false)}>Essential only</button>
        <button className="button buttonPrimary buttonCompact" type="button" onClick={()=>saveChoices(analytics,awinTracking)}>Save choices</button>
      </div>
      <a href="/cookies">Cookie details</a>
    </aside>
  );
}

export function CookieSettingsButton(){
  return <button type="button" className="textButton" onClick={()=>window.dispatchEvent(new Event("roomfound:open-cookie-settings"))}>Manage cookie choices</button>;
}

export function trackRoomfound(eventName:string,properties?:Record<string,unknown>){
  if(typeof window!=="undefined") window.roomfoundTrack?.(eventName,properties);
}

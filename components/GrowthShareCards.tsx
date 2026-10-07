'use client';

import { useEffect, useState } from "react";

const formats=[
  {key:"pinterest",label:"Pinterest",detail:"2:3"},
  {key:"instagram",label:"Instagram",detail:"4:5"},
  {key:"story",label:"Story / Reel",detail:"9:16"},
  {key:"facebook",label:"Facebook",detail:"1.91:1"},
];

export function GrowthShareCards({designId}:{designId:string}){
  const [ownerKey,setOwnerKey]=useState("");

  useEffect(()=>{
    try{
      const raw=window.localStorage.getItem("roomfound-design-runtime-v1");
      const runtime=raw ? JSON.parse(raw) as {ownerKey?:string} : {};
      setOwnerKey(runtime.ownerKey || "");
    }catch{
      setOwnerKey("");
    }
  },[]);

  return (
    <section className="growthShareSection">
      <div>
        <p className="eyebrow">Share the transformation</p>
        <h2>Before → After → Shop this room.</h2>
        <p>Roomfound builds the creative from this exact room and its current room total. Open a format, then save or share it to the channel you need.</p>
      </div>
      <div className="growthShareFormats">
        {formats.map((format)=>{
          const query=ownerKey ? `?ownerKey=${encodeURIComponent(ownerKey)}` : "";
          return (
            <a
              key={format.key}
              href={`/api/growth/social/${designId}/${format.key}${query}`}
              target="_blank"
              rel="noreferrer"
            >
              <span>{format.label}</span>
              <strong>{format.detail}</strong>
              <i>Open creative ↗</i>
            </a>
          );
        })}
      </div>
    </section>
  );
}

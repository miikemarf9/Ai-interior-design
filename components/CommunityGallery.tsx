'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./CommunityGallery.module.css";

type CommunityRoom={
  id:string;
  slug:string;
  title:string;
  roomType:"living_room"|"bedroom";
  styles:string[];
  shareToken:string;
  publishedAt:string;
  votes:number;
  recentVotes:number;
  voted:boolean;
};

const styleChoices=["Modern Organic","Modern Country","Japandi","Mid-Century Modern","Bold & Colourful","Contemporary Classic"];
const roomNames:Record<string,string>={living_room:"Living room",bedroom:"Bedroom"};

export function CommunityGallery(){
  const [rooms,setRooms]=useState<CommunityRoom[]>([]);
  const [roomType,setRoomType]=useState("");
  const [style,setStyle]=useState("");
  const [sort,setSort]=useState("trending");
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState("");
  const [votingId,setVotingId]=useState("");

  useEffect(()=>{
    let cancelled=false;
    setLoading(true);
    setMessage("");
    const query=new URLSearchParams({sort});
    if(roomType) query.set("type",roomType);
    if(style) query.set("style",style);
    fetch("/api/community/rooms?"+query.toString(),{cache:"no-store"})
      .then(async response=>{
        const payload=await response.json() as {rooms?:CommunityRoom[];error?:string};
        if(!response.ok) throw new Error(payload.error || "Rooms could not be loaded.");
        if(!cancelled) setRooms(Array.isArray(payload.rooms) ? payload.rooms : []);
      })
      .catch(error=>{if(!cancelled) setMessage(error instanceof Error ? error.message : "Rooms could not be loaded.");})
      .finally(()=>{if(!cancelled) setLoading(false);});
    return ()=>{cancelled=true;};
  },[roomType,style,sort]);

  async function vote(room:CommunityRoom){
    if(votingId) return;
    setVotingId(room.id);
    setMessage("");
    try{
      const response=await fetch("/api/community/rooms/"+encodeURIComponent(room.id)+"/vote",{method:"POST"});
      const payload=await response.json() as {voted?:boolean;votes?:number;error?:string};
      if(response.status===401){
        setMessage("Sign in or create an account to vote.");
        return;
      }
      if(!response.ok) throw new Error(payload.error || "Your vote could not be saved.");
      setRooms(current=>current.map(item=>item.id===room.id ? {...item,voted:Boolean(payload.voted),votes:Number(payload.votes)||0} : item));
    }catch(error){
      setMessage(error instanceof Error ? error.message : "Your vote could not be saved.");
    }finally{
      setVotingId("");
    }
  }

  return (
    <section className={styles.gallery}>
      <div className={styles.controls}>
        <label>Room
          <select value={roomType} onChange={event=>setRoomType(event.target.value)}>
            <option value="">All rooms</option>
            <option value="living_room">Living rooms</option>
            <option value="bedroom" disabled>Bedrooms · coming soon</option>
          </select>
        </label>
        <label>Style
          <select value={style} onChange={event=>setStyle(event.target.value)}>
            <option value="">All styles</option>
            {styleChoices.map(choice=><option key={choice} value={choice}>{choice}</option>)}
          </select>
        </label>
        <label>Sort
          <select value={sort} onChange={event=>setSort(event.target.value)}>
            <option value="trending">Trending this week</option>
            <option value="top">Most liked</option>
            <option value="new">Newest</option>
          </select>
        </label>
      </div>

      {message ? <p className={styles.message}>{message} {message.startsWith("Sign in") ? <Link href="/account">My account</Link> : null}</p> : null}
      {loading ? <p className={styles.empty}>Loading room designs…</p> : null}
      {!loading && !message && rooms.length===0 ? (
        <div className={styles.emptyState}>
          <p className={styles.eyebrow}>A new community starts here</p>
          <h2>No shared rooms yet</h2>
          <p>Once someone publishes a room with reviewed products, it will appear here. Explore style inspiration or create your own product-backed room plan.</p>
          <div><Link href="/ideas">Explore room ideas</Link><Link className="button buttonPrimary" href="/design">Design my room</Link></div>
        </div>
      ) : null}

      {!loading && rooms.length>0 ? (
        <div className={styles.grid}>
          {rooms.map(room=>(
            <article className={styles.card} key={room.id}>
              <Link className={styles.imageLink} href={"/room/share/"+room.shareToken} aria-label={"View "+room.title}>
                <img src={"/api/shared-room/"+room.shareToken+"/image"} alt={room.title} loading="lazy" decoding="async" />
              </Link>
              <div className={styles.cardBody}>
                <p className={styles.tags}>
                  <span>{roomNames[room.roomType] || "Room"}</span>
                  {room.styles.slice(0,2).map(tag=><span key={tag}>{tag}</span>)}
                </p>
                <h2><Link href={"/room/share/"+room.shareToken}>{room.title}</Link></h2>
                <div className={styles.cardFooter}>
                  <span>{room.votes} {room.votes===1 ? "thumbs-up" : "thumbs-up votes"}</span>
                  <button type="button" aria-pressed={room.voted} onClick={()=>vote(room)} disabled={votingId===room.id}>
                    <span aria-hidden="true">👍</span>
                    {votingId===room.id ? "Saving…" : room.voted ? "Liked" : "Like this room"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

'use client';

import { useEffect, useState } from "react";
import styles from "./InventoryPicker.module.css";

type InventoryItem={
  productId:string;
  variantId:string;
  name:string;
  variantName:string|null;
  brandName:string|null;
  categoryName:string;
  retailerName:string;
  priceMinor:number;
  availability:string;
  imageUrl:string|null;
  imageAlt:string;
  widthMm:number|null;
  depthMm:number|null;
  heightMm:number|null;
  packSize:number;
  unitLabel:string;
  styles:string[];
  materials:string[];
  colours:string[];
};

const styleChoices=["Modern Organic","Modern Country","Japandi","Mid-Century Modern","Bold & Colourful","Contemporary Classic"];

function money(minor:number){
  return new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP",minimumFractionDigits:minor%100?2:0,maximumFractionDigits:2}).format(minor/100);
}
function dimensions(item:InventoryItem){
  return [item.widthMm,item.depthMm,item.heightMm].map(value=>value && value>0 ? (value/10)+" cm" : "not listed").join(" × ");
}

export function InventoryPicker({
  category,
  categoryLabel,
  initialStyle,
  onChoose,
  onClose,
}:{
  category:string;
  categoryLabel:string;
  initialStyle:string;
  onChoose:(variantId:string)=>void;
  onClose:()=>void;
}){
  const [query,setQuery]=useState("");
  const [style,setStyle]=useState(initialStyle);
  const [maxPrice,setMaxPrice]=useState("");
  const [products,setProducts]=useState<InventoryItem[]>([]);
  const [total,setTotal]=useState(0);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");

  useEffect(()=>{
    const controller=new AbortController();
    const timer=window.setTimeout(()=>{
      setLoading(true);
      setError("");
      const params=new URLSearchParams({category});
      if(query.trim()) params.set("q",query.trim());
      if(style) params.set("style",style);
      const price=Number(maxPrice);
      if(Number.isFinite(price) && price>0) params.set("maxPriceMinor",String(Math.round(price*100)));
      fetch("/api/products/browse?"+params.toString(),{cache:"no-store",signal:controller.signal})
        .then(async response=>{
          const payload=await response.json() as {products?:InventoryItem[];total?:number;error?:string};
          if(!response.ok) throw new Error(payload.error || "Inventory could not be loaded.");
          setProducts(Array.isArray(payload.products)?payload.products:[]);
          setTotal(Number(payload.total)||0);
        })
        .catch(caught=>{
          if(caught instanceof Error && caught.name==="AbortError") return;
          setError(caught instanceof Error?caught.message:"Inventory could not be loaded.");
        })
        .finally(()=>{if(!controller.signal.aborted) setLoading(false);});
    },220);
    return ()=>{window.clearTimeout(timer);controller.abort();};
  },[category,query,style,maxPrice]);

  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget) onClose();}}>
      <section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="inventory-picker-title">
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Choose from the cleared catalogue</p>
            <h2 id="inventory-picker-title">Pick a {categoryLabel.toLowerCase()}.</h2>
            <p>These items have current product details and are approved for room design use.</p>
          </div>
          <button className={styles.close} type="button" onClick={onClose} aria-label="Close inventory">×</button>
        </header>

        <div className={styles.filters}>
          <label className={styles.search}>Search products
            <input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Name, brand or material" />
          </label>
          <label>Style
            <select value={style} onChange={event=>setStyle(event.target.value)}>
              <option value="">All styles</option>
              {styleChoices.map(choice=><option key={choice} value={choice}>{choice}</option>)}
            </select>
          </label>
          <label>Up to (£)
            <input type="number" min="0" step="25" value={maxPrice} onChange={event=>setMaxPrice(event.target.value)} placeholder="Any price" />
          </label>
        </div>

        <div className={styles.resultsMeta} aria-live="polite">
          {loading?"Checking current items…":error?"":total+" cleared "+(total===1?"item":"items")}
        </div>
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        {!loading && !error && products.length===0 ? (
          <div className={styles.empty}>
            <h3>No cleared items to show yet</h3>
            <p>We’re checking product details and permissions before items appear here. Only approved products can be chosen for a room.</p>
          </div>
        ) : null}
        {products.length>0 ? (
          <div className={styles.grid}>
            {products.map(item=>(
              <article className={styles.product} key={item.variantId}>
                <div className={styles.photo}>
                  {item.imageUrl ? <img src={item.imageUrl} alt={item.imageAlt} loading="lazy" decoding="async" /> : <span>Photo unavailable</span>}
                </div>
                <div className={styles.productBody}>
                  <p className={styles.brand}>{item.brandName || item.retailerName}</p>
                  <h3>{item.name}{item.variantName ? " · "+item.variantName : ""}</h3>
                  <p className={styles.detail}>{money(item.priceMinor)} · {item.retailerName}</p>
                  <p className={styles.detail}>W × D × H: {dimensions(item)}</p>
                  <p className={styles.detail}>{item.materials.length?item.materials.slice(0,3).join(", ").replace(/-/g," "):"Material not confirmed"}</p>
                  <button type="button" className="button buttonPrimary buttonCompact" onClick={()=>onChoose(item.variantId)}>Use this item</button>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}

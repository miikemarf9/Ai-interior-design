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
  seatWidthMm:number|null;
  seatDepthMm:number|null;
  seatHeightMm:number|null;
  packSize:number;
  unitLabel:string;
  styles:string[];
  materials:string[];
  colours:string[];
  featureTags:string[];
};
type Facets={materials:string[];colours:string[];features:string[]};

const styleChoices=["Modern Organic","Modern Country","Japandi","Mid-Century Modern","Bold & Colourful","Contemporary Classic"];
const priceStepMinor=2500;
const maxPriceBoundMinor=500000;

function money(minor:number){
  return new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP",minimumFractionDigits:minor%100?2:0,maximumFractionDigits:2}).format(minor/100);
}
function dimensions(item:Pick<InventoryItem,"widthMm"|"depthMm"|"heightMm">){
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
  const [priceMinMinor,setPriceMinMinor]=useState(0);
  const [priceMaxMinor,setPriceMaxMinor]=useState(maxPriceBoundMinor);
  const [appliedPriceRange,setAppliedPriceRange]=useState<{min:number;max:number}|null>(null);
  const [maxWidth,setMaxWidth]=useState("");
  const [maxDepth,setMaxDepth]=useState("");
  const [maxHeight,setMaxHeight]=useState("");
  const [material,setMaterial]=useState("");
  const [colour,setColour]=useState("");
  const [features,setFeatures]=useState<string[]>([]);
  const [facets,setFacets]=useState<Facets>({materials:[],colours:[],features:[]});
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
      if(appliedPriceRange?.min) params.set("minPriceMinor",String(appliedPriceRange.min));
      if(appliedPriceRange && appliedPriceRange.max<maxPriceBoundMinor) params.set("maxPriceMinor",String(appliedPriceRange.max));
      if(maxWidth) params.set("maxWidthCm",maxWidth);
      if(maxDepth) params.set("maxDepthCm",maxDepth);
      if(maxHeight) params.set("maxHeightCm",maxHeight);
      if(material) params.set("material",material);
      if(colour) params.set("colour",colour);
      if(features.length) params.set("features",features.join(","));
      fetch("/api/products/browse?"+params.toString(),{cache:"no-store",signal:controller.signal})
        .then(async response=>{
          const payload=await response.json() as {products?:InventoryItem[];total?:number;facets?:Facets;error?:string};
          if(!response.ok) throw new Error(payload.error || "Inventory could not be loaded.");
          setProducts(Array.isArray(payload.products)?payload.products:[]);
          setTotal(Number(payload.total)||0);
          setFacets(payload.facets || {materials:[],colours:[],features:[]});
        })
        .catch(caught=>{
          if(caught instanceof Error && caught.name==="AbortError") return;
          setError(caught instanceof Error?caught.message:"Inventory could not be loaded.");
        })
        .finally(()=>{if(!controller.signal.aborted) setLoading(false);});
    },220);
    return ()=>{window.clearTimeout(timer);controller.abort();};
  },[category,query,style,appliedPriceRange,maxWidth,maxDepth,maxHeight,material,colour,features]);

  function toggleFeature(value:string){setFeatures(current=>current.includes(value)?current.filter(item=>item!==value):[...current,value]);}
  function applyPriceRange(){setAppliedPriceRange(priceMinMinor===0 && priceMaxMinor===maxPriceBoundMinor?null:{min:priceMinMinor,max:priceMaxMinor});}
  const priceRangeChanged=appliedPriceRange?priceMinMinor!==appliedPriceRange.min || priceMaxMinor!==appliedPriceRange.max:priceMinMinor!==0 || priceMaxMinor!==maxPriceBoundMinor;
  const hasFilters=Boolean(query.trim() || style || appliedPriceRange || maxWidth || maxDepth || maxHeight || material || colour || features.length);
  function clearFilters(){setQuery("");setStyle("");setPriceMinMinor(0);setPriceMaxMinor(maxPriceBoundMinor);setAppliedPriceRange(null);setMaxWidth("");setMaxDepth("");setMaxHeight("");setMaterial("");setColour("");setFeatures([]);}

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
          <fieldset className={styles.priceFilter}>
            <legend>Price per item</legend>
            <div className={styles.priceHeading}><strong>{money(priceMinMinor)} – {money(priceMaxMinor)}</strong><button type="button" onClick={applyPriceRange} disabled={!priceRangeChanged}>Apply</button></div>
            <div className={styles.priceSlider}>
              <div className={styles.priceTrack} />
              <input type="range" min="0" max={maxPriceBoundMinor} step={priceStepMinor} value={priceMinMinor} aria-label="Minimum price per item" onChange={event=>setPriceMinMinor(Math.min(Number(event.target.value),priceMaxMinor-priceStepMinor))} />
              <input type="range" min="0" max={maxPriceBoundMinor} step={priceStepMinor} value={priceMaxMinor} aria-label="Maximum price per item" onChange={event=>setPriceMaxMinor(Math.max(Number(event.target.value),priceMinMinor+priceStepMinor))} />
            </div>
            <div className={styles.priceLabels}><span>£0</span><span>£5,000</span></div>
          </fieldset>
          <fieldset className={styles.sizeFilters}>
            <legend>Maximum item size (cm)</legend>
            <label>Width<input type="number" min="1" step="1" value={maxWidth} onChange={event=>setMaxWidth(event.target.value)} placeholder="Any" /></label>
            <label>Depth<input type="number" min="1" step="1" value={maxDepth} onChange={event=>setMaxDepth(event.target.value)} placeholder="Any" /></label>
            <label>Height<input type="number" min="1" step="1" value={maxHeight} onChange={event=>setMaxHeight(event.target.value)} placeholder="Any" /></label>
          </fieldset>
          <label>Material
            <select value={material} onChange={event=>setMaterial(event.target.value)}><option value="">Any material</option>{facets.materials.map(value=><option key={value} value={value}>{value.replace(/-/g," ")}</option>)}</select>
          </label>
          <label>Colour
            <select value={colour} onChange={event=>setColour(event.target.value)}><option value="">Any colour</option>{facets.colours.map(value=><option key={value} value={value}>{value.replace(/-/g," ")}</option>)}</select>
          </label>
          {facets.features.length>0 ? <fieldset className={styles.featureFilters}>
            <legend>Must have</legend>
            {facets.features.map(value=><label key={value}><input type="checkbox" checked={features.includes(value)} onChange={()=>toggleFeature(value)} />{value}</label>)}
          </fieldset> : null}
        </div>

        <div className={styles.resultsMeta} aria-live="polite">
          <span>{loading?"Checking current items…":error?"":total+" matching "+(total===1?"item":"items")}</span>
          {hasFilters ? <button className={styles.clearFilters} type="button" onClick={clearFilters}>Clear filters</button> : null}
        </div>
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        {!loading && !error && products.length===0 ? (
          <div className={styles.empty}>
            <h3>No items match those filters</h3>
            <p>Try clearing a filter or making the size limits larger. When you set a size limit, items without that measurement are left out.</p>
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
                  {item.seatWidthMm && item.seatDepthMm && item.seatHeightMm ? <p className={styles.detail}>Seat size: {dimensions({widthMm:item.seatWidthMm,depthMm:item.seatDepthMm,heightMm:item.seatHeightMm})}</p> : null}
                  <p className={styles.detail}>{item.materials.length?item.materials.slice(0,3).join(", ").replace(/-/g," "):"Material not confirmed"}</p>
                  {item.featureTags.length ? <p className={styles.tags}>{item.featureTags.join(" · ")}</p> : null}
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

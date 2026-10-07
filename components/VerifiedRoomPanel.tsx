'use client';

import { useState } from "react";
import type {
  ProductVerification,
  RoomVerification,
  VerificationStatus,
} from "@/lib/verification/types";

const statusCopy: Record<VerificationStatus,{label:string;mark:string}> = {
  verified:{label:"Verified",mark:"✓"},
  warning:{label:"Check",mark:"!"},
  failed:{label:"Not verified",mark:"×"},
  insufficient:{label:"Insufficient data",mark:"—"},
};

function Status({ status, compact=false }: { status:VerificationStatus; compact?:boolean }) {
  const item=statusCopy[status];
  return (
    <span className={`verifyStatus verifyStatus-${status} ${compact ? "isCompact" : ""}`}>
      <i>{item.mark}</i>{compact ? null : <span>{item.label}</span>}
    </span>
  );
}

function countVerified(
  products:ProductVerification[],
  key:keyof ProductVerification,
){
  return products.filter((product)=>product[key]==="verified").length;
}

function averageVisual(products:ProductVerification[]){
  const values=products
    .map((product)=>product.visualConfidence)
    .filter((value):value is number=>typeof value==="number");
  if(!values.length) return null;
  return Math.round(values.reduce((sum,value)=>sum+value,0)/values.length);
}

export function VerifiedRoomPanel({
  verification,
  loading,
}:{
  verification:RoomVerification|null;
  loading:boolean;
}){
  const [openProduct,setOpenProduct]=useState<number|null>(null);

  if(loading && !verification){
    return (
      <section className="verifiedRoomSection">
        <div className="verifiedRoomIntro">
          <p className="eyebrow">Verified Room</p>
          <h2>Checking the room against reality.</h2>
          <p>We are checking the products, retailer data, dimensions, your measurements and the finished visual.</p>
        </div>
        <div className="verifiedRoomLoading">
          <span /><span /><span /><span />
        </div>
      </section>
    );
  }

  if(!verification){
    return (
      <section className="verifiedRoomSection">
        <div className="verifiedRoomIntro">
          <p className="eyebrow">Verified Room</p>
          <h2>We will show what we can prove.</h2>
          <p>Verification evidence is not available for this generation yet. Roomfound does not convert missing evidence into a green tick.</p>
        </div>
      </section>
    );
  }

  const total=verification.products.length;
  const visualAverage=averageVisual(verification.products);
  const summary=verification.overallStatus==="verified"
    ? "Every V1 check has enough evidence to pass."
    : verification.overallStatus==="warning"
      ? "The room is usable, but at least one check needs attention before purchase."
      : "Some checks do not have enough evidence yet.";

  return (
    <section className="verifiedRoomSection">
      <div className="verifiedRoomHeader">
        <div className="verifiedRoomIntro">
          <div className="verifiedRoomEyebrow">
            <p className="eyebrow">Verified Room</p>
            <Status status={verification.overallStatus} />
          </div>
          <h2>Trust the evidence, not the render.</h2>
          <p>{summary}</p>
        </div>
        <div className="verifiedRoomStamp">
          <span>Last checked</span>
          <strong>{new Date(verification.checkedAt).toLocaleString("en-GB",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</strong>
          <small>Checks can change as retailer data changes.</small>
        </div>
      </div>

      <div className="verifiedRoomSummary">
        <article>
          <span>Real products</span>
          <strong>{countVerified(verification.products,"realProductStatus")} / {total}</strong>
          <small>Matched to exact catalogue variants</small>
        </article>
        <article>
          <span>UK availability</span>
          <strong>{countVerified(verification.products,"ukAvailabilityStatus")} / {total}</strong>
          <small>Live retailer evidence</small>
        </article>
        <article>
          <span>Price checked</span>
          <strong>{countVerified(verification.products,"priceStatus")} / {total}</strong>
          <small>Verified means checked within 72h</small>
        </article>
        <article>
          <span>Dimensions</span>
          <strong>{countVerified(verification.products,"dimensionsStatus")} / {total}</strong>
          <small>Width, depth and height</small>
        </article>
        <article>
          <span>Room measurements</span>
          <strong><Status status={verification.roomMeasurementStatus} compact /></strong>
          <small>{verification.roomMeasurementStatus==="verified" ? "Basic room envelope available" : "More measurements needed"}</small>
        </article>
        <article>
          <span>Visual match</span>
          <strong>{visualAverage === null ? "—" : `${visualAverage}%`}</strong>
          <small>AI confidence, never a guarantee</small>
        </article>
      </div>

      <div className="verifiedProductList">
        <div className="verifiedProductListHeading">
          <span>Product evidence</span>
          <small>Open any item to see why each check received its status.</small>
        </div>

        {verification.products.map((product)=>(
          <article className="verifiedProduct" key={product.variantId}>
            <button
              type="button"
              className="verifiedProductRow"
              onClick={()=>setOpenProduct((current)=>current===product.position ? null : product.position)}
              aria-expanded={openProduct===product.position}
            >
              <div className="verifiedProductName">
                <small>{product.slot.replaceAll("-"," ")}</small>
                <strong>{product.productName}{product.variantName ? ` · ${product.variantName}` : ""}</strong>
              </div>
              <div className="verifiedProductSignals" aria-label="Verification statuses">
                <Status status={product.realProductStatus} compact />
                <Status status={product.ukAvailabilityStatus} compact />
                <Status status={product.priceStatus} compact />
                <Status status={product.dimensionsStatus} compact />
                <Status status={product.roomFitStatus} compact />
                <Status status={product.visualStatus} compact />
              </div>
              <span className="verifiedProductChevron">{openProduct===product.position ? "−" : "+"}</span>
            </button>

            {openProduct===product.position ? (
              <div className="verifiedProductDetails">
                <VerificationDetail label="Real product" status={product.realProductStatus} note={product.realProductNote} />
                <VerificationDetail label="UK availability" status={product.ukAvailabilityStatus} note={product.ukAvailabilityNote} />
                <VerificationDetail label="Price checked" status={product.priceStatus} note={product.priceNote} />
                <VerificationDetail label="Dimensions available" status={product.dimensionsStatus} note={product.dimensionsNote} />
                <VerificationDetail label="Room measurements checked" status={product.roomFitStatus} note={product.roomFitNote} />
                <VerificationDetail
                  label="Visual match"
                  status={product.visualStatus}
                  note={product.visualConfidence === null
                    ? product.visualNote
                    : `${product.visualConfidence}% confidence. ${product.visualNote}`}
                />
              </div>
            ) : null}
          </article>
        ))}
      </div>

      <div className="verifiedLimitations">
        <div>
          <span className="microLabel">What Verified Room V1 does not claim</span>
          <h3>Uncertainty is part of the answer.</h3>
        </div>
        <ul>
          {verification.limitations.map((limitation)=><li key={limitation}>{limitation}</li>)}
        </ul>
      </div>
    </section>
  );
}

function VerificationDetail({
  label,
  status,
  note,
}:{
  label:string;
  status:VerificationStatus;
  note:string;
}){
  return (
    <div className="verificationDetail">
      <div><span>{label}</span><Status status={status} /></div>
      <p>{note}</p>
    </div>
  );
}

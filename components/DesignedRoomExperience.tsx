'use client';

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { IntakeForBrief } from "@/lib/brief";
import type { ProductAlternative, ProductSelection, ProposedProduct, SelectionCandidate } from "@/lib/catalog/selection";
import { applyPendingAlternative, hotspotForProduct, type DesignedRoomPayload } from "@/lib/room-experience";

type ExperiencePayload = DesignedRoomPayload & { intake?: IntakeForBrief };

type LiveOffer = {
  id: string;
  retailer_name: string;
  retailer_slug: string;
  price_minor: number;
  compare_at_price_minor: number | null;
  availability: string;
  uk_delivery_status: string;
  delivery_price_minor: number | null;
  delivery_min_days: number | null;
  delivery_max_days: number | null;
  last_checked_at: string;
  affiliate_tracked: boolean;
  network: string | null;
  advertiser_id: string | null;
  publisher_id: string | null;
  expected_commission_minor: number | null;
  expected_revenue_minor: number | null;
};

function money(minor: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(minor / 100);
}

function candidateName(candidate: SelectionCandidate) {
  return candidate.variantName ? `${candidate.productName} · ${candidate.variantName}` : candidate.productName;
}

function availabilityLabel(value: string) {
  if (value === "in_stock") return "In stock";
  if (value === "low_stock") return "Low stock";
  if (value === "preorder") return "Pre-order";
  return value.replaceAll("_", " ");
}

function deliveryLabel(offer: LiveOffer) {
  if (offer.delivery_price_minor === 0) return "Free delivery";
  if (offer.delivery_price_minor !== null) return `${money(offer.delivery_price_minor)} delivery`;
  if (offer.delivery_min_days !== null && offer.delivery_max_days !== null) {
    return `${offer.delivery_min_days}–${offer.delivery_max_days} days`;
  }
  return "UK delivery";
}

function getCommerceSession() {
  const existing = window.localStorage.getItem("roomfound-commerce-session-v1");
  if (existing && /^[a-zA-Z0-9_-]{16,100}$/.test(existing)) return existing;
  const created = crypto.randomUUID();
  window.localStorage.setItem("roomfound-commerce-session-v1", created);
  return created;
}

function roomTitle(title: string) {
  const cleaned = title.replace(/\s+direction$/i, "").trim();
  return /^your\b/i.test(cleaned) ? cleaned : `Your ${cleaned}`;
}

export function DesignedRoomExperience({ shareToken }: { shareToken?: string }) {
  const shared = Boolean(shareToken);
  const [data, setData] = useState<ExperiencePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [compare, setCompare] = useState(34);
  const [showPins, setShowPins] = useState(true);
  const [drawerSlot, setDrawerSlot] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Record<string, ProductAlternative>>({});
  const [shareLabel, setShareLabel] = useState("Share");
  const [commerceSession, setCommerceSession] = useState("");
  const [liveOffers, setLiveOffers] = useState<LiveOffer[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);

  useEffect(() => {
    setCommerceSession(getCommerceSession());
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        let endpoint = "";

        if (shareToken) {
          endpoint = `/api/shared-room/${encodeURIComponent(shareToken)}`;
        } else {
          const runtimeRaw = window.localStorage.getItem("roomfound-design-runtime-v1");
          const runtime = runtimeRaw
            ? JSON.parse(runtimeRaw) as { ownerKey?: string; designId?: string }
            : {};

          if (!runtime.ownerKey || !runtime.designId) {
            throw new Error("No finished room is attached to this browser yet.");
          }

          endpoint = `/api/designs/experience?designId=${encodeURIComponent(runtime.designId)}&ownerKey=${encodeURIComponent(runtime.ownerKey)}`;
        }

        const response = await fetch(endpoint, { cache: "no-store" });
        const payload = await response.json() as ExperiencePayload & { error?: string };
        if (!response.ok) throw new Error(payload.error || "The designed room could not be loaded.");
        if (cancelled) return;

        setData(payload);

        if (!shared) {
          window.localStorage.setItem(
            "roomfound-brief-v1",
            JSON.stringify({ brief: payload.brief, source: "saved-design", approved: true, updatedAt: new Date().toISOString() }),
          );
          window.localStorage.setItem(
            "roomfound-product-selection-v1",
            JSON.stringify({ selection: payload.selection, approved: true, updatedAt: new Date().toISOString() }),
          );
          if (payload.intake) {
            window.localStorage.setItem("roomfound-intake-v1", JSON.stringify({ state: payload.intake, step: 9 }));
          }
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "The designed room could not be loaded.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [shareToken, shared]);

  useEffect(() => {
    if (!drawerSlot) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerSlot(null);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [drawerSlot]);

  const activeProduct = useMemo(
    () => data?.selection.products.find((product) => product.slot === drawerSlot) ?? null,
    [data, drawerSlot],
  );

  useEffect(() => {
    if (!activeProduct || !data || !commerceSession) {
      setLiveOffers([]);
      return;
    }

    let cancelled = false;
    const selected = activeProduct.selected;

    void fetch("/api/commerce/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        eventType: "product_viewed",
        sessionKey: commerceSession,
        designId: data.designId,
        generationId: data.generationId,
        shareToken: shareToken || null,
        productId: selected.productId,
        variantId: selected.variantId,
        offerId: selected.offer.id,
        surface: shared ? "shared_room_drawer" : "designed_room_drawer",
      }),
    }).catch(() => undefined);

    setOffersLoading(true);
    fetch(`/api/commerce/offers?variantId=${encodeURIComponent(selected.variantId)}`, { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json() as { offers?: LiveOffer[] };
        if (!cancelled) setLiveOffers(response.ok && Array.isArray(payload.offers) ? payload.offers : []);
      })
      .catch(() => {
        if (!cancelled) setLiveOffers([]);
      })
      .finally(() => {
        if (!cancelled) setOffersLoading(false);
      });

    return () => { cancelled = true; };
  }, [activeProduct, commerceSession, data, shareToken, shared]);

  const pendingSelection = useMemo(() => {
    if (!data) return null;
    return Object.entries(pendingChanges).reduce(
      (selection, [slot, alternative]) => applyPendingAlternative(selection, slot, alternative),
      data.selection,
    );
  }, [data, pendingChanges]);

  const changedCount = Object.keys(pendingChanges).length;

  function chooseAlternative(product: ProposedProduct, alternative: ProductAlternative) {
    if (shared) return;
    setPendingChanges((current) => ({ ...current, [product.slot]: alternative }));
  }

  function removePending(slot: string) {
    setPendingChanges((current) => {
      const next = { ...current };
      delete next[slot];
      return next;
    });
  }

  function trackSwapViews(product: ProposedProduct) {
    if (!data || !commerceSession) return;

    product.alternatives.forEach((alternative) => {
      const candidate = alternative.candidate;
      void fetch("/api/commerce/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({
          eventType: "swap_viewed",
          sessionKey: commerceSession,
          designId: data.designId,
          generationId: data.generationId,
          shareToken: shareToken || null,
          productId: candidate.productId,
          variantId: candidate.variantId,
          offerId: candidate.offer.id,
          alternativeKind: alternative.kind,
          surface: shared ? "shared_room_swap" : "designed_room_swap",
        }),
      }).catch(() => undefined);
    });
  }

  function retailerHref(offerId: string) {
    if (!data) return "#";
    const params = new URLSearchParams({
      session: commerceSession || crypto.randomUUID(),
      designId: data.designId,
      generationId: data.generationId,
      surface: shared ? "shared_room_drawer" : "designed_room_drawer",
    });
    if (shareToken) params.set("shareToken", shareToken);
    return `/go/${offerId}?${params.toString()}`;
  }

  function prepareUpdatedRender() {
    if (!pendingSelection || changedCount === 0) return;
    window.localStorage.setItem(
      "roomfound-product-selection-v1",
      JSON.stringify({ selection: pendingSelection, approved: true, updatedAt: new Date().toISOString() }),
    );
    window.location.assign("/render");
  }

  async function shareRoom() {
    if (!data) return;

    try {
      let shareUrl = window.location.href;

      if (!shared) {
        const runtimeRaw = window.localStorage.getItem("roomfound-design-runtime-v1");
        const runtime = runtimeRaw ? JSON.parse(runtimeRaw) as { ownerKey?: string } : {};
        if (!runtime.ownerKey) throw new Error("Missing room owner.");

        const response = await fetch("/api/designs/share", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ownerKey: runtime.ownerKey, designId: data.designId, generationId: data.generationId }),
        });
        const payload = await response.json() as { path?: string; error?: string };
        if (!response.ok || !payload.path) throw new Error(payload.error || "Share link failed.");
        shareUrl = `${window.location.origin}${payload.path}`;
      }

      if (navigator.share) {
        try {
          await navigator.share({
            title: roomTitle(data.brief.title),
            text: `${roomTitle(data.brief.title)} · ${money(data.selection.totalMinor)} total`,
            url: shareUrl,
          });
          setShareLabel("Shared");
          return;
        } catch (shareError) {
          if (shareError instanceof DOMException && shareError.name === "AbortError") return;
        }
      }

      await navigator.clipboard.writeText(shareUrl);
      setShareLabel("Link copied");
    } catch {
      setShareLabel("Try again");
    } finally {
      window.setTimeout(() => setShareLabel("Share"), 2200);
    }
  }

  if (loading) {
    return (
      <main className="designedRoom designedRoomLoading">
        <p className="eyebrow">Opening your room</p>
        <h1>The finished design is loading.</h1>
        <div className="briefLoadingLine"><i /></div>
      </main>
    );
  }

  if (!data || error) {
    return (
      <main className="designedRoom designedRoomMissing">
        <p className="eyebrow">Designed room</p>
        <h1>This room is not ready to view.</h1>
        <p>{error || "Generate a room first."}</p>
        <Link className="button buttonPrimary" href={shared ? "/" : "/render"}>
          {shared ? "Design your own room" : "Return to generation"}
        </Link>
      </main>
    );
  }

  const title = roomTitle(data.brief.title);
  const originalAvailable = Boolean(data.originalUrl && !shared);

  return (
    <main className="designedRoom">
      <header className="roomChrome">
        <Link className="roomBrand" href="/">Roomfound</Link>
        <div className="roomChromeTitle">
          <span>{shared ? "Shared design" : "Your designed room"}</span>
          <strong>{title}</strong>
        </div>
        <div className="roomChromeActions">
          <div className="roomTotal"><span>Whole room</span><strong>{money(data.selection.totalMinor)}</strong></div>
          <button className="roomShareButton" type="button" onClick={shareRoom}>{shareLabel}</button>
        </div>
      </header>

      <section className="roomHero" aria-label={title}>
        <img className="roomAfterImage" src={data.resultUrl} alt={title} />

        {originalAvailable ? (
          <div className="roomBeforeLayer" style={{ clipPath: `inset(0 ${100 - compare}% 0 0)` }}>
            <img src={data.originalUrl || ""} alt="Room before redesign" />
          </div>
        ) : null}

        <div className="roomHeroShade" />

        <div className="roomHeroHeading">
          <p>{shared ? "Designed with Roomfound" : "Your finished direction"}</p>
          <h1>{title}</h1>
          <strong>{money(data.selection.totalMinor)} <span>total</span></strong>
        </div>

        {showPins ? data.selection.products.map((product, index) => {
          const hotspot = hotspotForProduct(product, index);
          const hiddenBehindBefore = originalAvailable && hotspot.x < compare;
          return (
            <button
              key={product.slot}
              type="button"
              className={`roomHotspot ${hiddenBehindBefore ? "isHiddenByBefore" : ""}`}
              style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }}
              onClick={() => setDrawerSlot(product.slot)}
              aria-label={`View ${product.slotLabel}: ${product.selected.productName}`}
            >
              <span>{index + 1}</span>
            </button>
          );
        }) : null}

        <div className="roomImageControls">
          {originalAvailable ? (
            <div className="beforeAfterControl">
              <span>Before</span>
              <input
                type="range"
                min="0"
                max="100"
                value={compare}
                onChange={(event) => setCompare(Number(event.target.value))}
                aria-label="Compare room before and after"
              />
              <span>After</span>
            </div>
          ) : <span className="sharedRoomLabel">Finished room</span>}
          <button type="button" onClick={() => setShowPins((value) => !value)}>
            {showPins ? "Hide products" : "Show products"}
          </button>
        </div>

        {originalAvailable ? (
          <div className="roomDivider" style={{ left: `${compare}%` }} aria-hidden="true"><i /></div>
        ) : null}
      </section>

      <section className="roomStory">
        <div>
          <p className="eyebrow">The room</p>
          <h2>{data.brief.direction}</h2>
        </div>
        <div className="roomStoryFacts">
          <div><span>Palette</span><strong>{data.brief.palette}</strong></div>
          <div><span>Materials</span><strong>{data.brief.materials}</strong></div>
          <div><span>Products</span><strong>{data.selection.products.length} selected pieces</strong></div>
          <div><span>Total</span><strong>{money(data.selection.totalMinor)}</strong></div>
        </div>
      </section>

      <section className="roomProductsSection">
        <div className="roomProductsIntro">
          <p className="eyebrow">Shop the room</p>
          <h2>Every new piece in one place.</h2>
          <p>Open any product for its retailer, dimensions and the alternatives already considered for this room.</p>
        </div>

        <div className="roomProductRail">
          {data.selection.products.map((product, index) => {
            const pending = pendingChanges[product.slot];
            return (
              <button className="roomProductCard" type="button" key={product.slot} onClick={() => setDrawerSlot(product.slot)}>
                <div className="roomProductImage">
                  {product.selected.image ? (
                    <img src={product.selected.image.url} alt={product.selected.image.altText || product.selected.productName} />
                  ) : <span>Image pending</span>}
                  <i>{String(index + 1).padStart(2, "0")}</i>
                </div>
                <span>{product.slotLabel}</span>
                <strong>{candidateName(product.selected)}</strong>
                <small>{money(product.selected.offer.priceMinor)}</small>
                {pending ? <em>Next: {pending.candidate.productName}</em> : null}
              </button>
            );
          })}
        </div>
      </section>

      {!shared ? (
        <section className="roomNextActions">
          <div>
            <p className="eyebrow">Keep refining</p>
            <h2>The image costs credits. The thinking still does not.</h2>
          </div>
          <div className="roomNextLinks">
            <Link href="/brief"><span>Edit the brief</span><strong>Free</strong></Link>
            <Link href="/products"><span>Review products</span><strong>Free</strong></Link>
            <Link href="/render"><span>Another interpretation</span><strong>1 credit</strong></Link>
          </div>
        </section>
      ) : (
        <section className="sharedRoomCta">
          <p className="eyebrow">Roomfound</p>
          <h2>Design a room you can actually buy.</h2>
          <Link className="button buttonLight" href="/design">Design my room</Link>
        </section>
      )}

      {activeProduct ? (
        <ProductDrawer
          key={activeProduct.slot}
          product={activeProduct}
          pending={pendingChanges[activeProduct.slot]}
          shared={shared}
          liveOffers={liveOffers}
          offersLoading={offersLoading}
          retailerHref={retailerHref}
          onViewSwaps={() => trackSwapViews(activeProduct)}
          onClose={() => setDrawerSlot(null)}
          onChoose={(alternative) => chooseAlternative(activeProduct, alternative)}
          onRemovePending={() => removePending(activeProduct.slot)}
        />
      ) : null}

      {changedCount > 0 && pendingSelection && !shared ? (
        <div className="pendingSwapBar">
          <div>
            <span>{changedCount} {changedCount === 1 ? "product" : "products"} changed for the next version</span>
            <strong>{money(pendingSelection.totalMinor)}</strong>
            <small>Current room remains {money(data.selection.totalMinor)}</small>
          </div>
          <button type="button" onClick={prepareUpdatedRender}>Generate updated room · 1 credit</button>
        </div>
      ) : null}
    </main>
  );
}

function ProductDrawer({
  product,
  pending,
  shared,
  liveOffers,
  offersLoading,
  retailerHref,
  onViewSwaps,
  onClose,
  onChoose,
  onRemovePending,
}: {
  product: ProposedProduct;
  pending?: ProductAlternative;
  shared: boolean;
  liveOffers: LiveOffer[];
  offersLoading: boolean;
  retailerHref: (offerId: string) => string;
  onViewSwaps: () => void;
  onClose: () => void;
  onChoose: (alternative: ProductAlternative) => void;
  onRemovePending: () => void;
}) {
  const selected = product.selected;
  const [showSwaps, setShowSwaps] = useState(false);
  const displayPrice = liveOffers[0]?.price_minor ?? selected.offer.priceMinor;

  function openSwaps() {
    if (!showSwaps) onViewSwaps();
    setShowSwaps((value) => !value);
  }

  return (
    <div className="productDrawerBackdrop" role="presentation" onMouseDown={onClose}>
      <aside
        className="productDrawer"
        role="dialog"
        aria-modal="true"
        aria-label={product.slotLabel}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="productDrawerTop">
          <span>{product.slotLabel}</span>
          <button type="button" onClick={onClose} aria-label="Close product drawer">×</button>
        </div>

        <div className="productDrawerImage">
          {selected.image ? <img src={selected.image.url} alt={selected.image.altText || selected.productName} /> : <span>Image pending</span>}
        </div>

        <div className="productDrawerIdentity">
          <small>{selected.brandName || selected.offer.retailerName}</small>
          <h2>{candidateName(selected)}</h2>
          <strong>{liveOffers.length > 1 ? "From " : ""}{money(displayPrice)}</strong>
        </div>

        <div className="productDrawerFacts">
          <div><span>Retailers</span><strong>{offersLoading ? "Checking…" : liveOffers.length ? `${liveOffers.length} live UK offer${liveOffers.length === 1 ? "" : "s"}` : "No live offer right now"}</strong></div>
          <div><span>Availability</span><strong>{liveOffers[0] ? availabilityLabel(liveOffers[0].availability) : availabilityLabel(selected.offer.availability)}</strong></div>
          <div>
            <span>Dimensions</span>
            <strong>
              {selected.dimensions.widthMm && selected.dimensions.depthMm
                ? `${Math.round(selected.dimensions.widthMm / 10)} W × ${Math.round(selected.dimensions.depthMm / 10)} D${selected.dimensions.heightMm ? ` × ${Math.round(selected.dimensions.heightMm / 10)} H` : ""} cm`
                : "See retailer"}
            </strong>
          </div>
          <div><span>Room match</span><strong>{product.score}/100</strong></div>
        </div>

        <p className="productDrawerReason">{product.reasons.slice(0, 3).join(" ")}</p>

        <div className="liveRetailerOffers">
          <div className="liveRetailerHeading">
            <span>Where to buy</span>
            <small>Current retailer offers</small>
          </div>

          {offersLoading ? <p className="offerLoading">Checking current price and availability…</p> : null}

          {!offersLoading && liveOffers.map((offer) => (
            <div className="liveRetailerRow" key={offer.id}>
              <div>
                <strong>{offer.retailer_name}</strong>
                <small>{availabilityLabel(offer.availability)} · {deliveryLabel(offer)}</small>
              </div>
              <strong>{money(offer.price_minor)}</strong>
              <a
                href={retailerHref(offer.id)}
                target="_blank"
                rel="sponsored noopener"
              >
                View at retailer
              </a>
            </div>
          ))}

          {!offersLoading && liveOffers.length === 0 ? (
            <div className="noLiveRetailer">
              <strong>The product stays in your design.</strong>
              <p>Its retailer offer is currently unavailable. Roomfound will show another retailer here when the same variant has a live UK offer.</p>
            </div>
          ) : null}
        </div>

        {pending && !shared ? (
          <div className="drawerPendingChoice">
            <span>Queued for next version</span>
            <strong>{candidateName(pending.candidate)} · {money(pending.candidate.offer.priceMinor)}</strong>
            <button type="button" onClick={onRemovePending}>Keep current product</button>
          </div>
        ) : null}

        {!shared ? (
          <div className="drawerSwaps">
            <button className="drawerSwapToggle" type="button" onClick={openSwaps}>
              <span>Swap this product</span>
              <small>{showSwaps ? "Hide alternatives" : "Cheaper · similar · premium"}</small>
            </button>
            {showSwaps ? (["cheaper", "similar", "premium"] as const).map((kind) => {
              const alternative = product.alternatives.find((item) => item.kind === kind);
              const label = kind === "cheaper" ? "Cheaper" : kind === "similar" ? "Similar" : "Premium";

              return (
                <div className="drawerAlternative" key={kind}>
                  <span>{label}</span>
                  {alternative ? (
                    <>
                      <div className="drawerAlternativeImage">
                        {alternative.candidate.image ? (
                          <img src={alternative.candidate.image.url} alt={alternative.candidate.image.altText || alternative.candidate.productName} />
                        ) : null}
                      </div>
                      <div>
                        <strong>{candidateName(alternative.candidate)}</strong>
                        <small>{money(alternative.candidate.offer.priceMinor)} · {alternative.candidate.offer.retailerName}</small>
                      </div>
                      <button type="button" onClick={() => onChoose(alternative)}>Use next</button>
                    </>
                  ) : <div className="drawerNoAlternative">No strong live alternative yet</div>}
                </div>
              );
            }) : null}
          </div>
        ) : null}
      </aside>
    </div>
  );
}

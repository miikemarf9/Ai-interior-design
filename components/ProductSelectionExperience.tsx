'use client';

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DesignBrief, IntakeForBrief } from "@/lib/brief";
import type { ProductAlternative, ProductSelection, ProposedProduct, SelectionCandidate } from "@/lib/catalog/selection";

type SavedBrief = {
  brief?: DesignBrief;
  approved?: boolean;
};

function money(minor: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(minor / 100);
}

function candidateLabel(candidate: SelectionCandidate) {
  return candidate.variantName
    ? `${candidate.productName} · ${candidate.variantName}`
    : candidate.productName;
}

function availabilityLabel(value: string) {
  return value === "in_stock" ? "In stock" : value === "low_stock" ? "Low stock" : value === "preorder" ? "Pre-order" : value;
}

export function ProductSelectionExperience() {
  const [intake, setIntake] = useState<IntakeForBrief | null>(null);
  const [brief, setBrief] = useState<DesignBrief | null>(null);
  const [selection, setSelection] = useState<ProductSelection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [approved, setApproved] = useState(false);
  const [designId, setDesignId] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const intakeRaw = window.localStorage.getItem("roomfound-intake-v1");
    const briefRaw = window.localStorage.getItem("roomfound-brief-v1");
    try {
      const runtimeRaw = window.localStorage.getItem("roomfound-design-runtime-v1");
      const runtime = runtimeRaw ? JSON.parse(runtimeRaw) as { designId?: string } : {};
      setDesignId(runtime.designId || "");
    } catch {
      setDesignId("");
    }

    if (!intakeRaw || !briefRaw) {
      setLoading(false);
      return;
    }

    try {
      const intakeSaved = JSON.parse(intakeRaw) as { state?: IntakeForBrief };
      const briefSaved = JSON.parse(briefRaw) as SavedBrief;
      if (!intakeSaved.state || !briefSaved.brief || !briefSaved.approved) {
        setLoading(false);
        return;
      }

      setIntake(intakeSaved.state);
      setBrief(briefSaved.brief);

      const existing = window.localStorage.getItem("roomfound-product-selection-v1");
      if (existing) {
        const parsed = JSON.parse(existing) as { selection?: ProductSelection; approved?: boolean };
        if (parsed.selection) {
          setSelection(parsed.selection);
          setApproved(Boolean(parsed.approved));
          setLoading(false);
          return;
        }
      }

      createSelection(intakeSaved.state, briefSaved.brief);
    } catch {
      setLoading(false);
    }
  }, []);

  async function createSelection(intakeState: IntakeForBrief, briefState: DesignBrief) {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/products/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intake: intakeState, brief: briefState }),
      });
      const data = await response.json();
      if (!response.ok || !data.selection) throw new Error(data.error || "Selection failed");
      setSelection(data.selection);
      setApproved(false);
      saveSelection(data.selection, false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Selection failed");
    } finally {
      setLoading(false);
    }
  }

  function saveSelection(next: ProductSelection, isApproved: boolean) {
    window.localStorage.setItem(
      "roomfound-product-selection-v1",
      JSON.stringify({
        selection: next,
        approved: isApproved,
        updatedAt: new Date().toISOString(),
      }),
    );
  }

  function swapProduct(slot: string, alternative: ProductAlternative) {
    if (!selection) return;
    const nextProducts = selection.products.map((product) => {
      if (product.slot !== slot) return product;

      const previous = product.selected;
      const previousAlternative: ProductAlternative = {
        kind: alternative.kind,
        candidate: previous,
        score: product.score,
        reasons: product.reasons,
      };

      return {
        ...product,
        selected: alternative.candidate,
        score: alternative.score,
        reasons: alternative.reasons,
        alternatives: [
          previousAlternative,
          ...product.alternatives.filter((item) => item.candidate.variantId !== alternative.candidate.variantId),
        ].slice(0, 3),
      };
    });

    const totalMinor = nextProducts.reduce((sum, product) => sum + product.selected.offer.priceMinor, 0);
    const next = {
      ...selection,
      products: nextProducts,
      totalMinor,
      remainingMinor: selection.budgetMinor - totalMinor,
      createdAt: new Date().toISOString(),
    };

    setSelection(next);
    setApproved(false);
    saveSelection(next, false);
  }

  function approveProducts() {
    if (!selection) return;
    setApproved(true);
    saveSelection(selection, true);
  }

  const budgetState = useMemo(() => {
    if (!selection) return null;
    return {
      percent: Math.min(100, Math.round((selection.totalMinor / Math.max(selection.budgetMinor, 1)) * 100)),
      over: selection.remainingMinor < 0,
    };
  }, [selection]);

  if (loading) {
    return (
      <section className="selectionLoading shell">
        <p className="eyebrow">Selecting real products</p>
        <h1>Building the room from what can actually be bought.</h1>
        <div className="briefLoadingLine"><i /></div>
        <p>No render credit is being used.</p>
      </section>
    );
  }

  if (!intake || !brief) {
    return (
      <section className="selectionMissing shell">
        <p className="eyebrow">Product intelligence</p>
        <h1>Approve your design brief first.</h1>
        <p>Product selection only starts once the room direction has been agreed.</p>
        <Link className="button buttonPrimary" href="/brief">Return to brief</Link>
      </section>
    );
  }

  if (error) {
    return (
      <section className="selectionMissing shell">
        <p className="eyebrow">Product intelligence</p>
        <h1>We could not read the live catalogue.</h1>
        <p>{error}</p>
        <button className="button buttonPrimary" type="button" onClick={() => createSelection(intake, brief)}>Try again</button>
      </section>
    );
  }

  if (!selection || selection.products.length === 0) {
    return (
      <section className="selectionEmpty shell">
        <p className="eyebrow">Stage 6 is ready</p>
        <h1>The intelligence is connected. The catalogue needs its first real products.</h1>
        <p>
          The selector is querying the live Neon catalogue and refusing to invent furniture. As soon as curated retailer products are ingested,
          this page will build the proposed room from those real items.
        </p>
        <div className="selectionEmptyFacts">
          <div><span>Live candidates found</span><strong>{selection?.catalogueCandidates ?? 0}</strong></div>
          <div><span>Render credits used</span><strong>0</strong></div>
          <div><span>Fallback fake products</span><strong>None</strong></div>
        </div>
        <Link className="button buttonSecondary" href="/brief">Back to brief</Link>
      </section>
    );
  }

  return (
    <div className="productSelectionExperience shell">
      <section className="selectionHero">
        <div>
          <p className="eyebrow">Products selected for your room</p>
          <h1>Check the furniture before we render anything.</h1>
          <p>
            Every item below comes from the live catalogue and has been selected against your style, budget, dimensions,
            materials, colours, practical requirements and anything you are keeping.
          </p>
        </div>
        <aside className="selectionBudget">
          <span className="microLabel">Whole-room budget</span>
          <strong>{money(selection.totalMinor)} <small>of {money(selection.budgetMinor)}</small></strong>
          <div className="selectionBudgetBar"><i style={{ width: `${budgetState?.percent ?? 0}%` }} /></div>
          <p className={budgetState?.over ? "isOver" : ""}>
            {budgetState?.over
              ? `${money(Math.abs(selection.remainingMinor))} over budget. Swap an item before approval.`
              : `${money(selection.remainingMinor)} still available.`}
          </p>
          <div><span>Render credits used</span><strong>0</strong></div>
        </aside>
      </section>

      <section className="selectionPrinciple">
        <span>Reality first</span>
        <p>If you hate a sofa, change the sofa here. We only generate the room once the actual product set feels right.</p>
      </section>

      <section className="selectedProducts">
        {selection.products.map((product, index) => (
          <ProductCard
            key={product.slot}
            product={product}
            index={index}
            onSwap={(alternative) => swapProduct(product.slot, alternative)}
            designId={designId}
          />
        ))}
      </section>

      <section className="selectionContext">
        <div>
          <p className="eyebrow">What the selector respected</p>
          <h2>Constraints, not decoration.</h2>
        </div>
        <div className="selectionContextRows">
          <div><span>Retained</span><strong>{selection.retainedItems.length ? selection.retainedItems.join(", ") : "No retained furniture specified"}</strong></div>
          <div><span>Requirements</span><strong>{selection.requirements.length ? selection.requirements.join(", ") : "General living-room use"}</strong></div>
          <div><span>Live catalogue candidates</span><strong>{selection.catalogueCandidates}</strong></div>
          <div><span>Proposed new products</span><strong>{selection.products.length}</strong></div>
        </div>
      </section>

      <section className={`selectionApproval ${approved ? "isApproved" : ""}`}>
        <div>
          <span className="microLabel">{approved ? "Products approved" : "Before image generation"}</span>
          <h2>{approved ? "This is the furniture set." : "Happy with the real products?"}</h2>
          <p>
            {approved
              ? "This approved set can now become the hard product constraint for image generation."
              : "Approve only when you are comfortable seeing these exact products used as the reference set for the room render."}
          </p>
        </div>
        {approved ? (
          <Link className="button buttonLight" href="/render">Continue to generation · 1 credit</Link>
        ) : (
          <button
            className="button buttonLight"
            type="button"
            disabled={Boolean(budgetState?.over)}
            onClick={approveProducts}
          >
            Approve products · 0 credits
          </button>
        )}
      </section>
    </div>
  );
}

function ProductCard({
  product,
  index,
  onSwap,
  designId,
}: {
  product: ProposedProduct;
  index: number;
  onSwap: (alternative: ProductAlternative) => void;
  designId: string;
}) {
  const [open, setOpen] = useState(false);
  const item = product.selected;

  return (
    <article className="selectedProductCard">
      <div className="selectedProductIndex">{String(index + 1).padStart(2, "0")}</div>
      <div className="selectedProductImage">
        {item.image ? <img src={item.image.url} alt={item.image.altText || item.productName} loading="lazy" decoding="async" /> : <div className="imagePending">Image pending</div>}
        <span>{product.slotLabel}</span>
      </div>
      <div className="selectedProductMain">
        <div className="selectedProductHeading">
          <div>
            <small>{item.brandName || item.offer.retailerName}</small>
            <h2>{candidateLabel(item)}</h2>
          </div>
          <strong>{money(item.offer.priceMinor)}</strong>
        </div>

        <div className="selectedProductMeta">
          <span>{availabilityLabel(item.offer.availability)}</span>
          <span>{item.offer.retailerName}</span>
          {item.dimensions.widthMm && item.dimensions.depthMm ? (
            <span>{Math.round(item.dimensions.widthMm / 10)} × {Math.round(item.dimensions.depthMm / 10)} cm</span>
          ) : null}
          <span>Match {product.score}/100</span>
        </div>

        <p className="selectedProductWhy">{product.reasons.slice(0, 3).join(" ")}</p>

        <div className="selectedProductActions">
          <button type="button" className="textButton" onClick={() => setOpen((value) => !value)}>
            {open ? "Hide alternatives" : "Change this product"}
          </button>
          <a
            className="textButton"
            href={`/go/${item.offer.id}?surface=pre_render_selection${designId ? `&designId=${encodeURIComponent(designId)}` : ""}`}
            target="_blank"
            rel="sponsored noopener"
          >
            View retailer
          </a>
        </div>

        {open ? (
          <div className="productAlternatives">
            {(["cheaper", "similar", "premium"] as const).map((kind) => {
              const alternative = product.alternatives.find((item) => item.kind === kind);
              return (
                <div className="alternativeRow" key={kind}>
                  <span>{kind === "cheaper" ? "Cheaper alternative" : kind === "similar" ? "Similar alternative" : "Premium alternative"}</span>
                  {alternative ? (
                    <>
                      <div>
                        <strong>{candidateLabel(alternative.candidate)}</strong>
                        <small>{alternative.candidate.offer.retailerName} · {money(alternative.candidate.offer.priceMinor)}</small>
                      </div>
                      <button type="button" onClick={() => onSwap(alternative)}>Use this</button>
                    </>
                  ) : (
                    <div className="alternativeUnavailable">No strong live match yet</div>
                  )}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </article>
  );
}

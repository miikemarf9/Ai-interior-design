'use client';

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DesignBrief, IntakeForBrief } from "@/lib/brief";
import type { ProductSelection } from "@/lib/catalog/selection";

type CreditState = {
  balance: number;
  verificationStatus: "unverified" | "development" | "verified";
  verifiedRequired: boolean;
  renderCreditCost: number;
};

type RuntimeState = {
  ownerKey?: string;
  designId?: string;
  roomAssetId?: string;
  photoName?: string;
};

type RenderResult = {
  generationId: string;
  resultAssetId: string;
  resultUrl: string;
  balance: number;
  renderCreditsUsed: number;
  costUsdMicros: number | null;
  durationMs: number;
};

export function RenderExperience() {
  const [intake, setIntake] = useState<IntakeForBrief | null>(null);
  const [brief, setBrief] = useState<DesignBrief | null>(null);
  const [selection, setSelection] = useState<ProductSelection | null>(null);
  const [runtime, setRuntime] = useState<RuntimeState | null>(null);
  const [credits, setCredits] = useState<CreditState | null>(null);
  const [result, setResult] = useState<RenderResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    try {
      const intakeRaw = window.localStorage.getItem("roomfound-intake-v1");
      const briefRaw = window.localStorage.getItem("roomfound-brief-v1");
      const selectionRaw = window.localStorage.getItem("roomfound-product-selection-v1");
      const runtimeRaw = window.localStorage.getItem("roomfound-design-runtime-v1");

      const savedIntake = intakeRaw ? JSON.parse(intakeRaw) as { state?: IntakeForBrief } : {};
      const savedBrief = briefRaw ? JSON.parse(briefRaw) as { brief?: DesignBrief; approved?: boolean } : {};
      const savedSelection = selectionRaw ? JSON.parse(selectionRaw) as { selection?: ProductSelection; approved?: boolean } : {};
      const savedRuntime = runtimeRaw ? JSON.parse(runtimeRaw) as RuntimeState : {};

      if (savedIntake.state) setIntake(savedIntake.state);
      if (savedBrief.brief && savedBrief.approved) setBrief(savedBrief.brief);
      if (savedSelection.selection && savedSelection.approved) setSelection(savedSelection.selection);
      setRuntime(savedRuntime);

      if (savedRuntime.ownerKey) {
        loadCredits(savedRuntime.ownerKey);
      }
    } catch {
      // The prerequisite state below will explain what is missing.
    } finally {
      setReady(true);
    }
  }, []);

  async function loadCredits(ownerKey: string) {
    try {
      const response = await fetch(`/api/credits/status?ownerKey=${encodeURIComponent(ownerKey)}`, {
        cache: "no-store",
      });
      const data = await response.json();
      if (response.ok) setCredits(data);
    } catch {
      setCredits(null);
    }
  }

  const missing = useMemo(() => {
    const items: string[] = [];
    if (!runtime?.designId || !runtime?.roomAssetId || !runtime?.ownerKey) items.push("original room photograph");
    if (!intake) items.push("room consultation");
    if (!brief) items.push("approved design brief");
    if (!selection?.products.length) items.push("approved real products");
    return items;
  }, [runtime, intake, brief, selection]);

  async function generateRoom() {
    if (!runtime?.ownerKey || !runtime.designId || !intake || !brief || !selection) return;

    setGenerating(true);
    setError("");

    try {
      const response = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerKey: runtime.ownerKey,
          designId: runtime.designId,
          requestId: crypto.randomUUID(),
          intake,
          brief,
          selection,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (typeof data.balance === "number" && credits) {
          setCredits({ ...credits, balance: data.balance });
        }
        if (data.code === "RENDER_FAILED_REFUNDED") {
          await loadCredits(runtime.ownerKey);
        }
        throw new Error(data.error || "The room could not be generated.");
      }

      setResult(data);
      setCredits((current) => current ? { ...current, balance: data.balance } : current);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The room could not be generated.");
    } finally {
      setGenerating(false);
    }
  }

  if (!ready) {
    return (
      <section className="renderLoading shell">
        <p className="eyebrow">Preparing your room</p>
        <h1>Checking the approved design before generation.</h1>
        <div className="briefLoadingLine"><i /></div>
      </section>
    );
  }

  if (missing.length) {
    return (
      <section className="renderMissing shell">
        <p className="eyebrow">Image generation</p>
        <h1>There is still something to approve first.</h1>
        <p>Missing: {missing.join(", ")}.</p>
        <Link className="button buttonPrimary" href={selection ? "/products" : brief ? "/products" : "/design"}>
          Return to design
        </Link>
      </section>
    );
  }

  const blockedByVerification = Boolean(credits?.verifiedRequired);
  const noCredits = Boolean(credits && credits.balance < 1);

  return (
    <div className="renderExperience shell">
      <section className="renderHero">
        <div className="renderHeroCopy">
          <p className="eyebrow">Generate your room</p>
          <h1>The expensive step only happens when you say so.</h1>
          <p>
            Your original room, approved brief, retained furniture, room restrictions and exact selected products
            are now the constraints for the image model.
          </p>
        </div>

        <aside className="renderCreditPanel">
          <span className="microLabel">Clear credit boundary</span>
          <div className="renderCreditRule isFree">
            <span>Editing your brief</span>
            <strong>Free</strong>
          </div>
          <div className="renderCreditRule isPaid">
            <span>Generate your room</span>
            <strong>1 credit</strong>
          </div>
          <div className="renderCreditBalance">
            <span>Credits available</span>
            <strong>{credits?.balance ?? "—"}</strong>
          </div>
          <p>Every successful new render or regeneration costs another credit. Technical failures are returned automatically.</p>
        </aside>
      </section>

      <section className="renderInputs">
        <div className="renderOriginal">
          <div className="renderSectionHeading">
            <span>01</span>
            <div>
              <small>Reference room</small>
              <h2>Your room stays your room.</h2>
            </div>
          </div>
          <div className="renderOriginalImage">
            <img src={`/api/assets/${runtime?.roomAssetId}?ownerKey=${encodeURIComponent(runtime?.ownerKey || "")}`} alt="Original customer room" />
            <span>Original photograph</span>
          </div>
        </div>

        <div className="renderConstraints">
          <div className="renderSectionHeading">
            <span>02</span>
            <div>
              <small>Hard constraints</small>
              <h2>What the render must respect.</h2>
            </div>
          </div>
          <div className="renderConstraintRows">
            <div><span>Keep</span><strong>{intake?.keep.length ? intake.keep.join(", ") : "No retained furniture specified"}</strong></div>
            <div><span>Room limits</span><strong>{intake?.measurements.notes || "No additional restrictions supplied"}</strong></div>
            <div><span>Measurements</span><strong>{intake?.measurements.width || "?"} W × {intake?.measurements.length || "?"} L × {intake?.measurements.height || "?"} H cm</strong></div>
            <div><span>Approved products</span><strong>{selection?.products.length ?? 0} real catalogue items</strong></div>
          </div>
        </div>
      </section>

      <section className="renderProducts">
        <div className="renderProductsHeading">
          <p className="eyebrow">03 · Product references</p>
          <h2>These are the real products the model receives.</h2>
        </div>
        <div className="renderProductStrip">
          {selection?.products.map((product) => (
            <article key={product.selected.variantId}>
              <div>
                {product.selected.image ? (
                  <img src={product.selected.image.url} alt={product.selected.image.altText || product.selected.productName} />
                ) : null}
              </div>
              <small>{product.slotLabel}</small>
              <strong>{product.selected.productName}</strong>
            </article>
          ))}
        </div>
        <Link className="textButton" href="/products">Change products · Free</Link>
      </section>

      <section className="renderAction">
        <div>
          <span className="microLabel">{result ? "Another version" : "Ready to generate"}</span>
          <h2>{result ? "Want a different interpretation?" : "Generate the approved room."}</h2>
          <p>
            {result
              ? "The approved brief and products remain the same. A new image is a new generation and costs another credit."
              : "This is the first point in the journey where a design credit is spent."}
          </p>
          <div className="renderFreeLink">
            <Link href="/brief">Edit your brief</Link>
            <span>Free</span>
          </div>
        </div>

        <div className="renderActionButton">
          {blockedByVerification ? (
            <div className="renderBlocked">
              <strong>Account verification required</strong>
              <p>Verify your email in My rooms to activate the 3 free design credits attached to your account.</p>
            </div>
          ) : (
            <button
              className="button buttonLight"
              type="button"
              disabled={generating || noCredits}
              onClick={generateRoom}
            >
              {generating
                ? "Generating your room…"
                : result
                  ? "Generate another version · 1 credit"
                  : "Generate your room · 1 credit"}
            </button>
          )}
          {noCredits && !blockedByVerification ? <p className="renderNoCredits">No design credits remaining.</p> : null}
        </div>
      </section>

      {error ? <div className="renderError"><strong>Render not charged</strong><p>{error}</p></div> : null}

      {result ? (
        <section className="renderResult">
          <div className="renderResultHeading">
            <p className="eyebrow">Your generated room</p>
            <h2>Built from the approved reality.</h2>
            <p>Generation {result.generationId.slice(0, 8)} · 1 credit used · {Math.max(1, Math.round(result.durationMs / 1000))}s</p>
          </div>
          <div className="renderResultImage">
            <img src={result.resultUrl} alt="Generated room design" />
          </div>
          <div className="renderResultPayoff">
            <div>
              <span className="microLabel">The payoff</span>
              <strong>Now experience the room as a complete design.</strong>
            </div>
            <Link className="button buttonPrimary" href="/room">Open my designed room</Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}

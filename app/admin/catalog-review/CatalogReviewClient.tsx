"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import styles from "./CatalogReview.module.css";

type Candidate = {
  id: string;
  title: string;
  description: string | null;
  brand_name: string | null;
  image_url: string | null;
  additional_images: unknown;
  price_minor: number | null;
  compare_at_price_minor: number | null;
  currency: string;
  availability: string;
  merchant_category: string | null;
  category_path: string | null;
  normalized_category_slug: string | null;
  colour_text: string | null;
  material_text: string | null;
  dimensions_text: string | null;
  quality_score: number;
  product_url: string | null;
  affiliate_url: string | null;
  review_notes: string | null;
  retailer_name: string;
};

const money = (minor: number | null, currency: string) =>
  minor === null ? "Price unavailable" : new Intl.NumberFormat("en-GB", { style: "currency", currency: currency || "GBP" }).format(minor / 100);

const pretty = (value: string | null) =>
  value ? value.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Uncategorised";

export default function CatalogReviewClient() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [category, setCategory] = useState("all");
  const [minimumPrice, setMinimumPrice] = useState(50);
  const [nextScanOffset, setNextScanOffset] = useState(1_000);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState("");
  const [feedComplete, setFeedComplete] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [accessIssue, setAccessIssue] = useState<"signed-out" | "not-admin" | "">("");
  const [loaded, setLoaded] = useState(false);

  const categories = useMemo(
    () => [...new Set(candidates.map((item) => item.normalized_category_slug || "uncategorised"))].sort(),
    [candidates],
  );
  const categoryCandidates = category === "all"
    ? candidates
    : candidates.filter((item) => (item.normalized_category_slug || "uncategorised") === category);
  const visible = categoryCandidates
    .filter((item) => minimumPrice === 0 || (item.price_minor ?? 0) >= minimumPrice * 100)
    .sort((a, b) => (b.price_minor ?? 0) - (a.price_minor ?? 0));

  async function loadProducts() {
    setLoading(true);
    setError("");
    setNotice("");
    setAccessIssue("");
    try {
      const response = await fetch("/api/catalog/review", { cache: "no-store" });
      const result = await response.json();
      if (response.status === 401) { setLoaded(false); setCandidates([]); setAccessIssue("signed-out"); return; }
      if (response.status === 403) { setLoaded(false); setCandidates([]); setAccessIssue("not-admin"); return; }
      if (!response.ok) throw new Error(result.error || "Could not open the review list.");
      setCandidates(result.candidates || []);
      setNextScanOffset(Number(result.nextScanOffset ?? 1_000));
      setFeedComplete(Boolean(result.feedComplete));
      setLoaded(true);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Could not open the review list.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadProducts(); }, []);

  async function decide(item: Candidate, action: "keep" | "reject") {
    const prompt = action === "keep"
      ? "Keep this product? It will be added to Transform My Room’s live product catalogue."
      : "Remove this product from the review list? It will be rejected and won’t be added.";
    if (!window.confirm(prompt)) return;

    setBusyId(item.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/catalog/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ candidateId: item.id, action }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "That choice could not be saved.");
      setCandidates((current) => current.filter((candidate) => candidate.id !== item.id));
      setNotice(action === "keep" ? "Kept and added to the live catalogue." : "Rejected and removed from review.");
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "That choice could not be saved.");
    } finally {
      setBusyId("");
    }
  }

  async function importMore() {
    if (importing || feedComplete) return;
    setImporting(true);
    setError("");
    setNotice("");
    let offset = nextScanOffset;
    let totalScanned = 0;
    let totalStaged = 0;
    let reachedFeedEnd = false;

    try {
      for (let batch = 0; batch < 12; batch += 1) {
        setImportProgress("Checking feed rows " + (offset + 1).toLocaleString("en-GB") + "–" + (offset + 1_000).toLocaleString("en-GB") + "…");
        const response = await fetch("/api/catalog/import/awin", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ retailerSlug: "aosom-uk", scanOffset: offset, minimumPriceMinor: 5_000 }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "The Aosom feed scan failed.");
        totalScanned += Number(result.scanned || 0);
        totalStaged += Number(result.staged || 0);
        offset += Number(result.scanned || 0);
        setNextScanOffset(offset);
        if (result.reachedEnd || Number(result.scanned || 0) === 0) {
          reachedFeedEnd = true;
          break;
        }
      }

      const refresh = await fetch("/api/catalog/review", {
        cache: "no-store",
      });
      const review = await refresh.json();
      if (!refresh.ok) throw new Error(review.error || "The new products were staged, but the review list could not refresh.");
      setCandidates(review.candidates || []);
      setNextScanOffset(Number(review.nextScanOffset ?? offset));
      setFeedComplete(Boolean(review.feedComplete) || reachedFeedEnd);
      setNotice(
        "Scanned " + totalScanned.toLocaleString("en-GB") + " more feed rows and staged " +
        totalStaged.toLocaleString("en-GB") + " new £50+ candidates for review. They are not live yet." +
        (reachedFeedEnd ? " The remaining Aosom feed has been checked." : " Click the button again to keep scanning."),
      );
    } catch (problem) {
      setNextScanOffset(offset);
      setError(
        (problem instanceof Error ? problem.message : "The feed scan failed.") +
        " You can click the scan button again to continue from the next batch.",
      );
    } finally {
      setImporting(false);
      setImportProgress("");
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Transform My Room · private area</p>
            <h1 className={styles.title}>Review Aosom products</h1>
            <p className={styles.intro}>Check each item before it is added to the catalogue. Keeping an item makes it available in the live product catalogue; rejecting removes it from this review list.</p>
          </div>
          {loaded && <button type="button" onClick={() => void loadProducts()} disabled={loading} className={styles.lockButton}>{loading ? "Refreshing…" : "Refresh list"}</button>}
        </header>

        {loading && !loaded && <p role="status" className={styles.muted}>Loading pending Aosom items…</p>}
        {accessIssue === "signed-out" && (
          <section className={styles.loginCard}>
            <h2 className={styles.loginTitle}>Sign in to review products</h2>
            <p className={styles.muted}>Use your verified owner account. No separate product passcode or API key is needed.</p>
            <Link href="/account" className={styles.primaryButton}>Open account sign-in</Link>
          </section>
        )}
        {accessIssue === "not-admin" && (
          <section className={styles.loginCard}>
            <h2 className={styles.loginTitle}>Owner access required</h2>
            <p className={styles.muted}>Sign out and use the verified owner account connected to your Transform My Room site.</p>
            <Link href="/account" className={styles.primaryButton}>Open My account</Link>
          </section>
        )}
        {loaded && (
          <>
            <div className={styles.toolbar}>
              <p className={styles.pendingCount}>Showing <strong>{visible.length}</strong> of <strong>{categoryCandidates.length}</strong> pending {category === "all" ? "products" : "in this category"}. {minimumPrice > 0 && <span>{categoryCandidates.length - visible.length} under £{minimumPrice} hidden; still pending.</span>}</p>
              <div className={styles.filters}>
                <label className={styles.filterLabel}>
                  <span>Minimum price</span>
                  <select value={minimumPrice} onChange={(event) => setMinimumPrice(Number(event.target.value))} className={styles.select}>
                    <option value={0}>Any price</option>
                    <option value={25}>£25 and up</option>
                    <option value={50}>£50 and up</option>
                    <option value={75}>£75 and up</option>
                    <option value={100}>£100 and up</option>
                  </select>
                </label>
                <label className={styles.filterLabel}>
                  <span>Category</span>
                  <select value={category} onChange={(event) => setCategory(event.target.value)} className={styles.select}>
                    <option value="all">All categories</option>
                    {categories.map((item) => <option key={item} value={item}>{pretty(item)}</option>)}
                  </select>
                </label>
              </div>
            </div>
            <section className={styles.importPanel}>
              <div>
                <h2>Find more higher-priced Aosom items</h2>
                <p>Scans the rest of Aosom’s feed in small batches. Only £50+ living-room products with stronger data are added to this review list. They won’t be approved automatically.</p>
              </div>
              <button onClick={() => void importMore()} disabled={importing || feedComplete} className={styles.importButton}>
                {importing ? importProgress : feedComplete ? "Aosom feed checked" : "Find more £50+ items"}
              </button>
            </section>
            {notice && <p role="status" className={styles.notice}>{notice}</p>}
            {error && <p role="alert" className={styles.error}>{error}</p>}
            {visible.length === 0 ? (
              <div className={styles.emptyState}>
                <h2>{candidates.length ? "No products in this category" : "You’re all caught up"}</h2>
                <p>{candidates.length ? "Choose another category above." : "There are no pending Aosom products left to review."}</p>
              </div>
            ) : (
              <div className={styles.grid}>
                {visible.map((item) => (
                  <article key={item.id} className={styles.card}>
                    <div className={styles.imageFrame}>
                      {item.image_url ? <img src={item.image_url} alt={item.title} loading="lazy" className={styles.image} /> : <div className={styles.noImage}>No product image</div>}
                    </div>
                    <div className={styles.cardBody}>
                      <div className={styles.topline}>
                        <span className={styles.categoryTag}>{pretty(item.normalized_category_slug)}</span>
                        <span className={styles.price}>{money(item.price_minor, item.currency)}</span>
                      </div>
                      <h2 className={styles.productTitle}>{item.title}</h2>
                      <p className={styles.brand}>{item.brand_name || item.retailer_name}</p>
                      <dl className={styles.details}>
                        {item.merchant_category && <div><dt>Aosom category</dt><dd>{item.merchant_category}</dd></div>}
                        {item.colour_text && <div><dt>Colour</dt><dd>{item.colour_text}</dd></div>}
                        {item.material_text && <div><dt>Material</dt><dd>{item.material_text}</dd></div>}
                        {item.dimensions_text && <div><dt>Size</dt><dd>{item.dimensions_text}</dd></div>}
                        <div><dt>Stock</dt><dd>{pretty(item.availability)}</dd></div>
                      </dl>
                      {item.product_url && <a href={item.product_url} target="_blank" rel="noreferrer" className={styles.productLink}>View on Aosom ↗</a>}
                      <div className={styles.actions}>
                        <button disabled={busyId === item.id} onClick={() => void decide(item, "keep")} className={styles.keepButton}>{busyId === item.id ? "Saving…" : "Keep this"}</button>
                        <button disabled={busyId === item.id} onClick={() => void decide(item, "reject")} className={styles.rejectButton}>Reject</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}

      </div>
    </main>
  );
}

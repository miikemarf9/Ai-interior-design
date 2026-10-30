"use client";

import { useMemo, useState } from "react";
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
  const [passcode, setPasscode] = useState("");
  const [key, setKey] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [category, setCategory] = useState("all");
  const [minimumPrice, setMinimumPrice] = useState(50);
  const [busyId, setBusyId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

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

  async function loadProducts(secret: string) {
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/catalog/review", {
        headers: { "x-catalog-review-key": secret },
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not open the review list.");
      setCandidates(result.candidates || []);
      setKey(secret);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Could not open the review list.");
      setKey("");
    } finally {
      setLoading(false);
    }
  }

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
        headers: { "content-type": "application/json", "x-catalog-review-key": key },
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

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Transform My Room · private area</p>
            <h1 className={styles.title}>Review Aosom products</h1>
            <p className={styles.intro}>Check each item before it is added to the catalogue. Keeping an item makes it available in the live product catalogue; rejecting removes it from this review list.</p>
          </div>
          {key && <button onClick={() => { setKey(""); setPasscode(""); setCandidates([]); setNotice(""); }} className={styles.lockButton}>Lock review page</button>}
        </header>

        {!key ? (
          <form onSubmit={(event) => { event.preventDefault(); void loadProducts(passcode); }} className={styles.loginCard}>
            <h2 className={styles.loginTitle}>Enter your private passcode</h2>
            <p className={styles.muted}>This page is private. Enter the passcode provided to you to load the pending Aosom products.</p>
            <label className={styles.label} htmlFor="review-passcode">Passcode</label>
            <input id="review-passcode" type="password" autoComplete="current-password" value={passcode} onChange={(event) => setPasscode(event.target.value)} className={styles.input} />
            {error && <p role="alert" className={styles.error}>{error}</p>}
            <button disabled={loading || !passcode} className={styles.primaryButton}>{loading ? "Opening list…" : "Open product list"}</button>
          </form>
        ) : (
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

"use client";

import { useMemo, useState } from "react";

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
  const [busyId, setBusyId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const categories = useMemo(
    () => [...new Set(candidates.map((item) => item.normalized_category_slug || "uncategorised"))].sort(),
    [candidates],
  );
  const visible = category === "all"
    ? candidates
    : candidates.filter((item) => (item.normalized_category_slug || "uncategorised") === category);

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
    <main className="min-h-screen bg-[#f6f5f1] px-4 py-8 text-[#252720] sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-[#d9d8d0] pb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#68745d]">Transform My Room · private area</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Review Aosom products</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#62645d]">
              Check each item before it is added to the catalogue. Keeping an item makes it available in the live product catalogue; rejecting removes it from this review list.
            </p>
          </div>
          {key && <button onClick={() => { setKey(""); setPasscode(""); setCandidates([]); setNotice(""); }} className="rounded-full border border-[#b9baae] px-4 py-2 text-sm font-medium hover:bg-white">Lock review page</button>}
        </header>

        {!key ? (
          <form onSubmit={(event) => { event.preventDefault(); void loadProducts(passcode); }} className="max-w-lg rounded-2xl border border-[#deddd5] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Enter your private passcode</h2>
            <p className="mt-2 text-sm leading-6 text-[#62645d]">This page is private. Enter the passcode provided to you to load the pending Aosom products.</p>
            <label className="mt-5 block text-sm font-medium" htmlFor="review-passcode">Passcode</label>
            <input id="review-passcode" type="password" autoComplete="current-password" value={passcode} onChange={(event) => setPasscode(event.target.value)} className="mt-2 w-full rounded-xl border border-[#c9c9bf] px-4 py-3 outline-none focus:border-[#68745d] focus:ring-2 focus:ring-[#68745d]/20" />
            {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
            <button disabled={loading || !passcode} className="mt-4 rounded-full bg-[#354330] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{loading ? "Opening list…" : "Open product list"}</button>
          </form>
        ) : (
          <>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#deddd5] bg-white p-4">
              <p className="text-sm"><strong>{candidates.length}</strong> products still waiting for a decision</p>
              <label className="flex items-center gap-2 text-sm">
                <span>Show:</span>
                <select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-lg border border-[#c9c9bf] bg-white px-3 py-2">
                  <option value="all">All categories</option>
                  {categories.map((item) => <option key={item} value={item}>{pretty(item)}</option>)}
                </select>
              </label>
            </div>
            {notice && <p role="status" className="mb-4 rounded-xl bg-[#e6eee1] px-4 py-3 text-sm text-[#354330]">{notice}</p>}
            {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
            {visible.length === 0 ? (
              <div className="rounded-2xl border border-[#deddd5] bg-white p-10 text-center">
                <h2 className="text-xl font-semibold">{candidates.length ? "No products in this category" : "You’re all caught up"}</h2>
                <p className="mt-2 text-sm text-[#62645d]">{candidates.length ? "Choose another category above." : "There are no pending Aosom products left to review."}</p>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {visible.map((item) => (
                  <article key={item.id} className="overflow-hidden rounded-2xl border border-[#deddd5] bg-white shadow-sm">
                    <div className="aspect-[4/3] bg-[#efeee8]">
                      {item.image_url ? <img src={item.image_url} alt={item.title} loading="lazy" className="h-full w-full object-contain p-3" /> : <div className="flex h-full items-center justify-center text-sm text-[#77786f]">No product image</div>}
                    </div>
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <span className="rounded-full bg-[#edf0e9] px-3 py-1 text-xs font-medium text-[#45513e]">{pretty(item.normalized_category_slug)}</span>
                        <span className="text-lg font-semibold">{money(item.price_minor, item.currency)}</span>
                      </div>
                      <h2 className="mt-3 text-lg font-semibold leading-6">{item.title}</h2>
                      <p className="mt-1 text-sm text-[#62645d]">{item.brand_name || item.retailer_name}</p>
                      <dl className="mt-4 space-y-2 text-sm">
                        {item.merchant_category && <div><dt className="inline text-[#77786f]">Aosom category: </dt><dd className="inline">{item.merchant_category}</dd></div>}
                        {item.colour_text && <div><dt className="inline text-[#77786f]">Colour: </dt><dd className="inline">{item.colour_text}</dd></div>}
                        {item.material_text && <div><dt className="inline text-[#77786f]">Material: </dt><dd className="inline">{item.material_text}</dd></div>}
                        {item.dimensions_text && <div><dt className="inline text-[#77786f]">Size: </dt><dd className="inline">{item.dimensions_text}</dd></div>}
                        <div><dt className="inline text-[#77786f]">Stock: </dt><dd className="inline">{pretty(item.availability)}</dd></div>
                      </dl>
                      {item.product_url && <a href={item.product_url} target="_blank" rel="noreferrer" className="mt-4 inline-flex text-sm font-medium text-[#526148] underline underline-offset-4">View on Aosom</a>}
                      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-[#ecebe5] pt-4">
                        <button disabled={busyId === item.id} onClick={() => void decide(item, "keep")} className="rounded-xl bg-[#354330] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{busyId === item.id ? "Saving…" : "Keep this"}</button>
                        <button disabled={busyId === item.id} onClick={() => void decide(item, "reject")} className="rounded-xl border border-[#c9c9bf] px-4 py-3 text-sm font-semibold hover:bg-[#f6f5f1] disabled:opacity-50">Reject</button>
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

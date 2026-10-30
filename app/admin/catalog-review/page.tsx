import type { Metadata } from "next";
import CatalogReviewClient from "./CatalogReviewClient";

export const metadata: Metadata = {
  title: "Private product review | Transform My Room",
  robots: { index: false, follow: false, noarchive: true },
};

export default function CatalogReviewPage() {
  return <CatalogReviewClient />;
}

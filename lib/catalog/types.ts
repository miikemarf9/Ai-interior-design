export type Availability =
  | 'in_stock'
  | 'low_stock'
  | 'preorder'
  | 'backorder'
  | 'out_of_stock'
  | 'unknown';

export type UkDeliveryStatus =
  | 'available'
  | 'restricted'
  | 'collection_only'
  | 'unavailable'
  | 'unknown';

export type ProductDimensions = {
  widthMm: number | null;
  heightMm: number | null;
  depthMm: number | null;
  seatWidthMm?: number | null;
  seatDepthMm?: number | null;
  seatHeightMm?: number | null;
};

export type CatalogRetailer = {
  id: string;
  name: string;
  slug: string;
  websiteUrl: string;
  logoUrl: string | null;
  shipsToUk: boolean;
};

export type CatalogOffer = {
  id: string;
  retailer: CatalogRetailer;
  retailerSku: string | null;
  priceMinor: number;
  compareAtPriceMinor: number | null;
  currency: string;
  availability: Availability;
  ukDeliveryStatus: UkDeliveryStatus;
  deliveryPriceMinor: number | null;
  deliveryMinDays: number | null;
  deliveryMaxDays: number | null;
  productUrl: string;
  affiliateUrl: string | null;
  lastCheckedAt: string;
};

export type CatalogImage = {
  id: string;
  url: string;
  altText: string | null;
  isPrimary: boolean;
  sortOrder: number;
  variantId: string | null;
  offerId: string | null;
};

export type CatalogVariant = {
  id: string;
  productId: string;
  name: string | null;
  manufacturerSku: string | null;
  dimensions: ProductDimensions;
  colourDescription: string | null;
  materialDescription: string | null;
  styles: string[];
  materials: string[];
  colours: string[];
  qualityScore: number;
  offers: CatalogOffer[];
  images: CatalogImage[];
};

export type CatalogProduct = {
  id: string;
  name: string;
  slug: string;
  brandName: string | null;
  description: string | null;
  designSummary: string | null;
  categorySlugs: string[];
  curationScore: number;
  variants: CatalogVariant[];
};

export type ProductSelectionCandidate = {
  productId: string;
  variantId: string;
  category: string;
  productName: string;
  brandName: string | null;
  dimensions: ProductDimensions;
  styles: string[];
  materials: string[];
  colours: string[];
  bestOffer: CatalogOffer;
  primaryImage: CatalogImage | null;
  curationScore: number;
  qualityScore: number;
};

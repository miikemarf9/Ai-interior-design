export type VerificationStatus = "verified" | "warning" | "failed" | "insufficient";

export type ProductVerification = {
  position: number;
  slot: string;
  productId: string;
  variantId: string;
  offerId: string | null;
  productName: string;
  variantName: string | null;
  retailerName: string | null;
  priceMinor: number | null;
  realProductStatus: VerificationStatus;
  realProductNote: string;
  ukAvailabilityStatus: VerificationStatus;
  ukAvailabilityNote: string;
  priceStatus: VerificationStatus;
  priceNote: string;
  priceCheckedAt: string | null;
  dimensionsStatus: VerificationStatus;
  dimensionsNote: string;
  roomFitStatus: VerificationStatus;
  roomFitNote: string;
  visualStatus: VerificationStatus;
  visualConfidence: number | null;
  visualNote: string;
  widthMm: number | null;
  heightMm: number | null;
  depthMm: number | null;
};

export type RoomVerification = {
  id: string;
  designId: string;
  generationId: string;
  version: string;
  overallStatus: VerificationStatus;
  roomMeasurementStatus: VerificationStatus;
  roomMeasurementNote: string;
  checkedAt: string;
  visualModel: string | null;
  visualProvider: string | null;
  products: ProductVerification[];
  limitations: string[];
};

/** Reviewed pilot register. Active retailer/product flags are NOT image-use permission.
 * Add entries only after Stage 2 evidence has been checked. No research candidates belong here.
 * Evidence references identify private approval records; never return them to the browser.
 */
export type CatalogueClearance = {
  productId: string;
  variantId: string;
  offerId: string;
  imageUrl: string;
  exactVariantName: string;
  packSize: number;
  unitLabel: string;
  displayEvidence: string;
  aiReferenceEvidence: string;
  customerOutputEvidence: string;
  dataEvidence: string;
  reviewedAt: string;
  expiresAt: string;
  deliveryBasis: 'per_unit' | 'per_order' | 'unknown';
  deliveryDetails: string;
};

// Four Aosom living-room pilot products reviewed against their exact feed photos and listings on 31 October 2026.
// The photos appear in the affiliate product picker; product photos are not sent to the image model.
export const CLEARED_CATALOGUE: readonly CatalogueClearance[] = [
  {
    productId: 'cbbeafca-74f8-45a0-9bff-5657d837408f',
    variantId: 'd094ea50-ef93-41f8-9e1e-c302d0f6b5b4',
    offerId: '10c81fad-d1da-4fa3-ab7c-9327537be1a0',
    imageUrl: 'https://img.aosomcdn.com/100/product/2025/11/26/RnL45419abe961f76.jpg',
    exactVariantName: 'Warm brown mango wood',
    packSize: 1,
    unitLabel: 'coffee table',
    displayEvidence: 'Aosom UK Awin feed photo and exact product listing reviewed 2026-10-31; display is limited to the affiliate product picker with the retailer destination.',
    aiReferenceEvidence: 'Product photo is not sent to OpenAI. The written brief may use broad material and style cues only; exact product replication is not promised.',
    customerOutputEvidence: 'The generated room is labelled illustrative. The real retailer product remains separately shown with its live offer link; no exact-match or fit guarantee is made.',
    dataEvidence: 'Aosom UK feed candidate F-AFU-B2743P403489; GBP price and in-stock state checked in the imported feed; photo and listing reviewed 2026-10-31. Demand on Transform My Room is untested.',
    reviewedAt: '2026-10-31T16:00:00.000Z',
    expiresAt: '2026-11-07T16:00:00.000Z',
    deliveryBasis: 'unknown',
    deliveryDetails: 'Delivery charge, lead time and postcode availability are not confirmed here; check the Aosom listing and checkout.',
  },
  {
    productId: 'e22306f7-944d-4452-b5ac-cb2242ff76c8',
    variantId: 'e9cce523-1138-4d9a-a2e4-9fb9fdca4694',
    offerId: 'dc119dc8-365e-46eb-8026-2aeefe63cbea',
    imageUrl: 'https://img.aosomcdn.com/100/product/2025/11/26/s403ee19abe961fa1.jpg',
    exactVariantName: 'Warm brown mango wood',
    packSize: 1,
    unitLabel: 'TV unit',
    displayEvidence: 'Aosom UK Awin feed photo and exact product listing reviewed 2026-10-31; display is limited to the affiliate product picker with the retailer destination.',
    aiReferenceEvidence: 'Product photo is not sent to OpenAI. The written brief may use broad material and style cues only; exact product replication is not promised.',
    customerOutputEvidence: 'The generated room is labelled illustrative. The real retailer product remains separately shown with its live offer link; no exact-match or fit guarantee is made.',
    dataEvidence: 'Aosom UK feed candidate F-AFU-B2743P403490; GBP price and in-stock state checked in the imported feed; photo and listing reviewed 2026-10-31. Demand on Transform My Room is untested.',
    reviewedAt: '2026-10-31T16:00:00.000Z',
    expiresAt: '2026-11-07T16:00:00.000Z',
    deliveryBasis: 'unknown',
    deliveryDetails: 'Delivery charge, lead time and postcode availability are not confirmed here; check the Aosom listing and checkout.',
  },
  {
    productId: 'a3838162-5a67-449d-8dcb-fabff7560830',
    variantId: 'd0a68616-abd6-465a-93b4-44aa138fa75d',
    offerId: 'c82212a3-dab3-4928-8a10-7a3daf14d72f',
    imageUrl: 'https://img.aosomcdn.com/100/product/2024/09/29/mJEe3a1923d065c71.jpeg',
    exactVariantName: 'Forest green chenille chair with crescent ottoman',
    packSize: 1,
    unitLabel: 'chair set',
    displayEvidence: 'Aosom UK Awin feed photo and exact product listing reviewed 2026-10-31; display is limited to the affiliate product picker with the retailer destination.',
    aiReferenceEvidence: 'Product photo is not sent to OpenAI. The written brief may use broad material and style cues only; exact product replication is not promised.',
    customerOutputEvidence: 'The generated room is labelled illustrative. The real retailer product remains separately shown with its live offer link; no exact-match or fit guarantee is made.',
    dataEvidence: 'Aosom UK feed candidate F-DEK-W1397P154376; GBP price and in-stock state checked in the imported feed; photo and listing reviewed 2026-10-31. Demand on Transform My Room is untested.',
    reviewedAt: '2026-10-31T16:00:00.000Z',
    expiresAt: '2026-11-07T16:00:00.000Z',
    deliveryBasis: 'unknown',
    deliveryDetails: 'Delivery charge, lead time and postcode availability are not confirmed here; check the Aosom listing and checkout.',
  },
  {
    productId: 'd91ae382-79e4-47c5-a9cc-7e323c564fe5',
    variantId: '6a5f7136-5b93-408f-90d7-173b23a921f3',
    offerId: 'ef1edd81-ab5b-4fb0-ab7e-3bb746dfbcff',
    imageUrl: 'https://img.aosomcdn.com/100/product/2026/04/17/dcj3b119d994e3bd4.jpg',
    exactVariantName: 'Beige chenille modular two-piece L-shaped sofa',
    packSize: 1,
    unitLabel: 'sofa',
    displayEvidence: 'Aosom UK Awin feed photo and exact listing reviewed 2026-10-31; display is limited to the affiliate product picker with the retailer destination.',
    aiReferenceEvidence: 'Product photo is not sent to OpenAI. The written brief may use broad material and style cues only; exact product replication is not promised.',
    customerOutputEvidence: 'The generated room is labelled illustrative. The real retailer product remains separately shown with its live offer link; no exact-match or fit guarantee is made.',
    dataEvidence: 'Aosom UK feed candidate F-GOM-W2678S00017; price checked against Aosom UK at £575.99 on 2026-10-31; product page lists beige chenille, modular two-piece sectional, 250 × 158 × 60 cm, 4.6/5 from 21 ratings. Transform My Room demand is untested.',
    reviewedAt: '2026-10-31T16:00:00.000Z',
    expiresAt: '2026-11-07T16:00:00.000Z',
    deliveryBasis: 'per_order',
    deliveryDetails: 'Aosom states free UK mainland delivery; Northern Ireland courier fees apply. Guernsey and Jersey availability is restricted. Confirm current postcode delivery at checkout.',
  },
];

export function currentClearances(now = Date.now(), entries = CLEARED_CATALOGUE) {
  return entries.filter(entry => entry.productId && entry.variantId && entry.offerId
    && /^https:\/\//.test(entry.imageUrl) && entry.exactVariantName.trim()
    && Number.isInteger(entry.packSize) && entry.packSize > 0 && entry.unitLabel.trim()
    && entry.displayEvidence && entry.aiReferenceEvidence && entry.customerOutputEvidence && entry.dataEvidence
    && Date.parse(entry.reviewedAt) <= now && Date.parse(entry.expiresAt) > now);
}

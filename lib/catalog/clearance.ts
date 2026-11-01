/** Reviewed pilot register. Active retailer/product flags are NOT image-use permission.
 * Add entries only after Stage 2 evidence has been checked. No research candidates belong here.
 * Evidence references identify private approval records; never return them to the browser.
 */
export type CatalogueClearance = {
  roomType: 'living_room' | 'bedroom';
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

// Six Aosom living-room pilot products reviewed against their exact feed photos and listings on 31 October 2026.
// The photos appear in the affiliate product picker; product photos are not sent to the image model.
export const CLEARED_CATALOGUE: readonly CatalogueClearance[] = [
  {
    roomType: 'living_room',
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
    roomType: 'living_room',
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
    roomType: 'living_room',
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
    roomType: 'living_room',
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

  {
    roomType: 'living_room',
    productId: '3d4b64f7-3f28-4606-93b2-ea52c3f3cb86',
    variantId: '3da48ba7-eb99-446b-8cb0-b73145e01166',
    offerId: '1aad4485-a894-42c9-abaa-09ae90309487',
    imageUrl: 'https://img.aosomcdn.com/100/product/2025/03/27/mz5849195d76450e6.jpg',
    exactVariantName: 'Brown fabric three-seater sofa, 196 × 80.5 × 89 cm',
    packSize: 1,
    unitLabel: 'three-seat sofa',
    displayEvidence: 'Aosom UK Awin feed photo and exact product listing verified 2026-10-31; display is limited to the affiliate product picker with the retailer destination.',
    aiReferenceEvidence: 'Product photo is not sent to OpenAI. The written brief may use broad upholstery, colour and style cues only; exact product replication is not promised.',
    customerOutputEvidence: 'Generated rooms are labelled illustrative. The real retailer product is shown separately with its current offer link; no exact-match or fit guarantee is made.',
    dataEvidence: 'Aosom UK feed candidate 839-499V71BN; listing verified 2026-10-31 at £369.99 and in stock. Aosom identifies a 3-seat brown polyester-fabric sofa with rubberwood legs, 196 × 80.5 × 89 cm, and 4.2/5 from 6 ratings. It fits Contemporary Classic and Modern Country.',
    reviewedAt: '2026-10-31T00:00:00.000Z',
    expiresAt: '2026-11-07T00:00:00.000Z',
    deliveryBasis: 'per_order',
    deliveryDetails: 'Aosom states free UK mainland delivery; the page showed 05/11/2026–09/11/2026. Confirm current postcode delivery at checkout.',
  },
  {
    roomType: 'living_room',
    productId: '45459ec0-16c4-4235-b417-77a6cb8e87ee',
    variantId: 'bc814259-ea3f-4daf-a15d-521e26032a05',
    offerId: 'b69b0eb0-2d0f-440d-9a58-131d0302824e',
    imageUrl: 'https://img.aosomcdn.com/100/product/2026/04/17/BSKe2719d994e3bc0.jpg',
    exactVariantName: 'Beige oversized two-seater corduroy sofa, 224 × 81 × 81 cm',
    packSize: 1,
    unitLabel: 'two-seat sofa',
    displayEvidence: 'Aosom UK Awin feed photo and exact product listing verified 2026-10-31; display is limited to the affiliate product picker with the retailer destination.',
    aiReferenceEvidence: 'Product photo is not sent to OpenAI. The written brief may use broad upholstery, colour and style cues only; exact product replication is not promised.',
    customerOutputEvidence: 'Generated rooms are labelled illustrative. The real retailer product is shown separately with its current offer link; no exact-match or fit guarantee is made.',
    dataEvidence: 'Aosom UK feed candidate F-GOM-W2678S00031; listing verified 2026-10-31 at £359.99 and in stock. Aosom identifies a beige two-seat corduroy sofa with solid-wood/plywood frame, 224 × 81 × 81 cm, and 4.5/5 from 38 ratings. It fits Modern Organic.',
    reviewedAt: '2026-10-31T00:00:00.000Z',
    expiresAt: '2026-11-07T00:00:00.000Z',
    deliveryBasis: 'per_order',
    deliveryDetails: 'Aosom states free UK mainland delivery; the page showed 04/11/2026–12/11/2026. Confirm current postcode delivery at checkout.',
  },
];

export function currentClearances(now = Date.now(), entries = CLEARED_CATALOGUE) {
  return entries.filter(entry => entry.productId && entry.variantId && entry.offerId
    && /^https:\/\//.test(entry.imageUrl) && entry.exactVariantName.trim()
    && Number.isInteger(entry.packSize) && entry.packSize > 0 && entry.unitLabel.trim()
    && entry.displayEvidence && entry.aiReferenceEvidence && entry.customerOutputEvidence && entry.dataEvidence
    && Date.parse(entry.reviewedAt) <= now && Date.parse(entry.expiresAt) > now);
}

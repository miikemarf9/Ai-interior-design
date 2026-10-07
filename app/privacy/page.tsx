import type { Metadata } from "next";
import Link from "next/link";

export const metadata:Metadata={
  title:{absolute:"Privacy | Roomfound"},
  description:"How Roomfound handles account data, room photographs, AI design information, retailer interactions and optional analytics during the UK beta.",
  robots:{index:true,follow:true},
};

const contact=process.env.NEXT_PUBLIC_PRIVACY_EMAIL || "Privacy contact will be published before the public beta opens.";

export default function PrivacyPage(){
  return (
    <main className="legalPage">
      <div className="legalPageInner shell">
        <p className="eyebrow">Roomfound UK beta</p>
        <h1>Privacy.</h1>
        <p className="legalLead">This notice explains what Roomfound collects, why it is needed, where it can be shared and the controls available to you. It describes the beta product currently implemented.</p>

        <section>
          <h2>What we collect</h2>
          <p>Account data can include your email address, display name, password hash, verification state and security-session records. Room-design data can include photographs you upload, measurements, design preferences, written briefs, selected products, generated room images and verification evidence.</p>
          <p>We also keep operational records such as design-credit transactions, render status and cost information, retailer-link events and feedback. If you choose optional analytics, we record first-party page and funnel events using a pseudonymous analytics session. We do not intentionally store your raw IP address in the analytics table.</p>
        </section>

        <section>
          <h2>Why we use it</h2>
          <p>We use account and room information to provide the service you request: saving rooms, generating design briefs and images, selecting products, maintaining credits and reopening projects. Security records are used to protect accounts and prevent abuse. Retailer-click and conversion records are used to operate and measure affiliate commerce.</p>
          <p>Optional analytics are used only after you choose to allow them. Marketing-email use is separate and requires an explicit opt-in.</p>
        </section>

        <section>
          <h2>AI and service providers</h2>
          <p>Room photographs, product-reference images and design instructions may be sent to the configured AI provider when you request an AI operation. The current beta uses OpenAI APIs for AI design work. Database records are stored in Neon. Transactional account emails can be sent through Resend. Hosting and affiliate-network providers process the information needed to provide their part of the service.</p>
          <p>Roomfound does not sell personal data to advertisers. Affiliate retailers may receive normal web-request information when you choose to leave Roomfound and visit their site.</p>
        </section>

        <section>
          <h2>Retention</h2>
          <p>Your account and saved-room content are retained while the account remains active and while needed to provide the service, unless a deletion request is completed earlier. Optional analytics events are scheduled for deletion after 13 months. Expired authentication and abuse-prevention records are periodically cleaned up. Financial and affiliate records may need to be kept longer for accounting, tax, fraud-prevention or partner-dispute requirements.</p>
        </section>

        <section>
          <h2>Your controls</h2>
          <p>You can download a machine-readable copy of your current account data from My rooms. You can also submit access, deletion, correction, restriction or objection requests. Some information may need to be retained where there is a lawful reason to do so.</p>
          <div className="legalActions">
            <Link className="button buttonSecondary" href="/account">Open My rooms</Link>
            <Link className="textArrowLink" href="/cookies">Cookie details <span>→</span></Link>
          </div>
        </section>

        <section>
          <h2>Contact</h2>
          <p>{contact}</p>
          <p className="legalReviewNote">Beta launch gate: this notice should receive final UK data-protection and legal review before unrestricted public traffic is opened.</p>
        </section>
      </div>
    </main>
  );
}

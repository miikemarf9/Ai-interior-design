import type { Metadata } from "next";
import { CookieSettingsButton } from "@/components/PrivacyAnalytics";

export const metadata:Metadata={
  title:{absolute:"Cookies and browser storage | Transform My Room"},
  description:"The essential and optional browser storage used by the Transform My Room UK beta.",
};

export default function CookiesPage(){
  return (
    <main className="legalPage">
      <div className="legalPageInner shell">
        <p className="eyebrow">Privacy choices</p>
        <h1>Cookies & browser storage.</h1>
        <p className="legalLead">Essential storage works immediately. Product analytics and Awin partner-link tracking are separate optional choices, and stay off unless you allow them.</p>

        <section>
          <h2>Essential storage</h2>
          <div className="legalTable">
            <div><strong>roomfound_session</strong><span>Secure HTTP-only sign-in session. Up to 30 days.</span></div>
            <div><strong>roomfound_consent</strong><span>Remembers whether you chose essential-only or optional analytics. Up to 180 days.</span></div>
            <div><strong>roomfound_awin_consent</strong><span>Remembers whether you allowed or rejected Awin partner-link tracking so your choice is respected on retailer visits. Up to 180 days.</span></div>
            <div><strong>Room design local storage</strong><span>Keeps an unfinished intake, brief, product selection and anonymous room handoff available while you work through the requested design flow.</span></div>
          </div>
        </section>

        <section>
          <h2>Optional analytics</h2>
          <div className="legalTable">
            <div><strong>roomfound_analytics</strong><span>First-party pseudonymous analytics session. Created only after analytics consent. Up to 30 days.</span></div>
          </div>
          <p>With your permission, analytics can record the room type, styles and furniture categories you choose, approved product IDs, and whether a generated design is saved. It does not include your room photograph or free-text notes. Events are stored by Transform My Room, not sent to an advertising network. Refusing analytics does not block the design service.</p>
        </section>

        <section>
          <h2>Awin partner-link tracking</h2>
          <p>If you allow this option, Awin can record that a retailer visit came from a Transform My Room link and may use tracking to credit an eligible purchase. We send your choice with the link. If you reject it, we send Awin a no-consent signal and do not include our click reference; the retailer link still works. This helps fund our product research and planning tools on qualifying purchases, at no extra cost to you.</p>
        </section>

        <section>
          <h2>Changing your choice</h2>
          <p>You can clear Transform My Room cookies and site data in your browser at any time. The beta asks for a fresh analytics choice when the consent preference is no longer present.</p>
          <p><CookieSettingsButton /></p>
        </section>
      </div>
    </main>
  );
}

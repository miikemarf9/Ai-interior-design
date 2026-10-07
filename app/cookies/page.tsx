import type { Metadata } from "next";

export const metadata:Metadata={
  title:{absolute:"Cookies and browser storage | Roomfound"},
  description:"The essential and optional browser storage used by the Roomfound UK beta.",
};

export default function CookiesPage(){
  return (
    <main className="legalPage">
      <div className="legalPageInner shell">
        <p className="eyebrow">Privacy choices</p>
        <h1>Cookies & browser storage.</h1>
        <p className="legalLead">Roomfound keeps the default simple: essential storage works immediately; optional behavioural analytics stays off unless you choose to allow it.</p>

        <section>
          <h2>Essential storage</h2>
          <div className="legalTable">
            <div><strong>roomfound_session</strong><span>Secure HTTP-only sign-in session. Up to 30 days.</span></div>
            <div><strong>roomfound_consent</strong><span>Remembers whether you chose essential-only or optional analytics. Up to 180 days.</span></div>
            <div><strong>Room design local storage</strong><span>Keeps an unfinished intake, brief, product selection and anonymous room handoff available while you work through the requested design flow.</span></div>
          </div>
        </section>

        <section>
          <h2>Optional analytics</h2>
          <div className="legalTable">
            <div><strong>roomfound_analytics</strong><span>First-party pseudonymous analytics session. Created only after analytics consent. Up to 30 days.</span></div>
          </div>
          <p>Analytics events are stored by Roomfound rather than sent to an advertising network. Refusing analytics does not block the design service.</p>
        </section>

        <section>
          <h2>Changing your choice</h2>
          <p>You can clear Roomfound cookies and site data in your browser at any time. The beta asks for a fresh analytics choice when the consent preference is no longer present.</p>
        </section>
      </div>
    </main>
  );
}

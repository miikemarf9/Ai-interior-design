import Link from "next/link";

export default function NotFound(){
  return (
    <main className="globalStatePage">
      <div className="shell">
        <p className="eyebrow">404</p>
        <h1>That room is not here.</h1>
        <p>The link may have expired, the room may no longer be public, or the address may be incorrect.</p>
        <Link className="button buttonPrimary" href="/">Back to Roomfound</Link>
      </div>
    </main>
  );
}

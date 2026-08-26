export default function AccountLinkPage() {
  return (
    <main className="auth-page">
      <section className="auth-page-story">
        <p className="eyebrow">ACCOUNT RECOVERY</p>
        <h1>আপনার পুরোনো যাত্রা নিরাপদে যুক্ত করুন।</h1>
        <p>
          We found an existing record that may belong to you. For safety, matching email alone never
          joins accounts automatically.
        </p>
      </section>
      <section className="auth-page-panel">
        <h2>Manual verification required</h2>
        <p>
          Contact support from the same verified account. A trained reviewer will verify ownership
          and create an expiring, audited recovery link. No document should be sent through ordinary
          chat.
        </p>
        <a className="btn btn-primary" href="/bn/help">
          নিরাপদ সহায়তা নিন
        </a>
      </section>
    </main>
  );
}

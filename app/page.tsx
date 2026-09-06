"use client";
import Reveal from "@/components/Reveal";
import TrialWidget from "@/components/TrialWidget";

const FEATURE_DIFF = {
  basic: ["Sales (POS)", "Products", "Basic reports"],
  advanced: ["Everything in Basic", "Inventory / Goods-In", "Staff & RBAC", "Full reports", "Coupons"],
};

export default function LandingPage() {
  return (
    <div>
      {/* ── Hero / intro ─────────────────────────────────────────────── */}
      <section className="hero">
        <span className="hero-badge">● Now with a free 5-session trial</span>
        <h1>Point of sale, built for independent grocery shops.</h1>
        <p className="lead">
          Barcode scanning, cash &amp; card, inventory, staff, and reports — running on the
          till you already have.
        </p>
        <div className="hero-actions">
          <a href="#try-now" className="btn">Try it now — 5 free sessions</a>
          <a href="#pricing" className="btn secondary">See pricing</a>
        </div>
        <div className="hero-strip">
          <div><strong>5</strong>free trial sessions</div>
          <div><strong>20%</strong>VAT calculated automatically</div>
          <div><strong>100%</strong>your data stays on your till</div>
        </div>
      </section>

      <Reveal>
        <section className="section">
          <div className="grid-2">
            <div className="card hoverable">
              <div className="feature-icon">🖥️</div>
              <h3>Run it in your browser</h3>
              <p className="muted">
                The trial opens the real POS, not a video — scan, sell, and check reports
                exactly as it works on a live till.
              </p>
            </div>
            <div className="card hoverable">
              <div className="feature-icon">🔒</div>
              <h3>Own your data</h3>
              <p className="muted">
                Runs locally once purchased. Your sales data never has to leave your shop.
              </p>
            </div>
          </div>
        </section>
      </Reveal>

      {/* ── Pricing ───────────────────────────────────────────────────── */}
      <Reveal>
        <section className="section" id="pricing">
          <span className="section-eyebrow">Pricing</span>
          <h2 className="section-title">Simple, honest plans</h2>
          <p className="section-sub">
            One-time setup, then a small annual maintenance fee. No hidden per-transaction
            charges.
          </p>
          <div className="pricing-grid">
            <div className="plan-card">
              <div className="plan-name">Basic</div>
              <div className="plan-price">£150<span>/year</span></div>
              <ul className="plan-features">
                {FEATURE_DIFF.basic.map((f) => <li key={f}>{f}</li>)}
              </ul>
              <a href="#contact" className="btn secondary block">Choose Basic</a>
            </div>
            <div className="plan-card featured">
              <span className="plan-badge">Most popular</span>
              <div className="plan-name">Advanced</div>
              <div className="plan-price">£200<span>/year</span></div>
              <ul className="plan-features">
                {FEATURE_DIFF.advanced.map((f) => <li key={f}>{f}</li>)}
              </ul>
              <a href="#contact" className="btn block">Choose Advanced</a>
            </div>
          </div>
        </section>
      </Reveal>

      {/* ── Try now ───────────────────────────────────────────────────── */}
      <Reveal>
        <section className="section" id="try-now">
          <span className="section-eyebrow">Try it</span>
          <h2 className="section-title">See it running, for real</h2>
          <p className="section-sub">
            Opens the actual point-of-sale system in your browser — not a video.
          </p>
          <div style={{ marginTop: 32 }}>
            <TrialWidget />
          </div>
        </section>
      </Reveal>

      {/* ── Download ──────────────────────────────────────────────────── */}
      <Reveal>
        <section className="section" id="download">
          <span className="section-eyebrow">Download</span>
          <h2 className="section-title">Get it running on your till</h2>
          <p className="section-sub">
            Once you&apos;ve chosen a plan, your installer and license key are ready from
            your account.
          </p>
          <div className="steps">
            <div className="card">
              <div className="step-num">1</div>
              <h3>Choose a plan</h3>
              <p className="muted">Pick Basic or Advanced above, or message us directly.</p>
            </div>
            <div className="card">
              <div className="step-num">2</div>
              <h3>Get your key</h3>
              <p className="muted">
                Your license key is emailed to you and shown on your account page.
              </p>
            </div>
            <div className="card">
              <div className="step-num">3</div>
              <h3>Download &amp; activate</h3>
              <p className="muted">
                Grab the <code>.exe</code> installer from your account, run it, and enter your
                key on first launch.
              </p>
            </div>
          </div>
          <div style={{ marginTop: 28, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <a href="/download" className="btn">Go to downloads</a>
            <a href="/account" className="btn secondary">View my account</a>
          </div>
        </section>
      </Reveal>

      {/* ── Contact ───────────────────────────────────────────────────── */}
      <Reveal>
        <section className="section" id="contact">
          <span className="section-eyebrow">Contact</span>
          <h2 className="section-title">Talk to us</h2>
          <p className="section-sub">
            Questions about pricing, a custom plan, or getting set up? Reach out directly.
          </p>
          <div className="contact-grid">
            <div className="card contact-item">
              <div className="feature-icon">✉️</div>
              <div>
                <span className="label">Email</span>
                <a href="mailto:ahmadhotakwali@gmail.com">ahmadhotakwali@gmail.com</a>
              </div>
            </div>
            <div className="card contact-item">
              <div className="feature-icon">💬</div>
              <div>
                <span className="label">WhatsApp</span>
                <a href="https://wa.me/923073438593" target="_blank" rel="noopener noreferrer">
                  0307 3438593
                </a>
              </div>
            </div>
          </div>
        </section>
      </Reveal>
    </div>
  );
}

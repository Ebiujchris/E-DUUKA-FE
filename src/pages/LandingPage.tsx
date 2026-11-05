import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthModal, { type AuthMode } from '../components/AuthModal';

const features = [
  {
    number: '01',
    icon: '▦',
    title: 'Know what’s in stock',
    description: 'Keep products, prices and stock levels together. Spot low stock before it slows you down.',
  },
  {
    number: '02',
    icon: '↗',
    title: 'Keep sales moving',
    description: 'Record a sale in a few steps and keep a clear view of what is selling in your shop.',
  },
  {
    number: '03',
    icon: '◷',
    title: 'Stay on top of credit',
    description: 'Keep customer credit records organised and see what is still outstanding.',
  },
  {
    number: '04',
    icon: '⌁',
    title: 'Make sense of your numbers',
    description: 'Bring shop activity into helpful reports so it is easier to plan your next move.',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');

  const openAuth = (mode: AuthMode) => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  const handleAuthSuccess = () => {
    setAuthOpen(false);
    navigate('/dashboard');
  };

  return (
    <div className="landing-page">
      <header className="landing-header">
        <nav className="landing-nav" aria-label="Main navigation">
          <a className="landing-brand" href="#" aria-label="E-Duuka home">
            <span className="landing-brand-mark">e</span>
            <span>E-Duuka</span>
          </a>
          <div className="landing-nav-links">
            <a href="#features">What you can do</a>
            <a href="#how-it-works">Getting started</a>
          </div>
          <div className="landing-nav-actions">
            <button type="button" className="landing-signin" onClick={() => openAuth('login')}>
              Sign in
            </button>
            <button type="button" className="landing-nav-cta" onClick={() => openAuth('register')}>
              Get started <span aria-hidden="true">↗</span>
            </button>
          </div>
        </nav>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <div className="landing-eyebrow"><span /> MADE FOR LOCAL RETAIL</div>
            <h1>Run your shop.<br /><span>Feel in control.</span></h1>
            <p className="landing-hero-description">
              Stock, sales, customer credit and reports — the everyday tools to help you run your shop with more clarity.
            </p>
            <div className="landing-hero-actions">
              <button type="button" className="landing-primary-cta" onClick={() => openAuth('register')}>
                Get started <span aria-hidden="true">→</span>
              </button>
              <button type="button" className="landing-secondary-cta" onClick={() => openAuth('login')}>
                I already have an account
              </button>
            </div>
            <div className="landing-reassurance"><span className="landing-check">✓</span> A clearer way to manage your day-to-day</div>
          </div>

          <div className="landing-visual" aria-label="Illustration of the E-Duuka shop dashboard">
            <div className="visual-orbit orbit-one" />
            <div className="visual-orbit orbit-two" />
            <div className="visual-leaf leaf-one" />
            <div className="visual-leaf leaf-two" />
            <div className="shop-preview">
              <div className="preview-topbar">
                <div className="preview-brand"><span className="preview-mark">e</span> E-Duuka</div>
                <div className="preview-profile"><span className="preview-status" /> MY SHOP <span className="preview-avatar">S</span></div>
              </div>
              <div className="preview-body">
                <div className="preview-greeting"><div><span>YOUR SHOP TODAY</span><strong>Good morning, Sarah <i>✳</i></strong></div><div className="preview-period">This week⌄</div></div>
                <div className="preview-stats">
                  <div className="preview-stat"><span>PRODUCTS</span><strong>248</strong><small><b>↗</b> Stock overview</small></div>
                  <div className="preview-stat"><span>SALES TODAY</span><strong>18 <small>sales</small></strong><small><b>↗</b> Sales activity</small></div>
                </div>
                <div className="preview-lower">
                  <div className="preview-chart">
                    <div className="preview-section-title">Shop activity <span>Last 7 days</span></div>
                    <div className="chart-value">A good week so far</div>
                    <div className="chart-bars" aria-hidden="true">
                      {[32, 54, 43, 72, 51, 84, 64].map((height, index) => <i key={index} style={{ height: `${height}%` }} className={index === 5 ? 'chart-bar-highlight' : ''} />)}
                    </div>
                    <div className="chart-days"><span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span><span>SUN</span></div>
                  </div>
                  <div className="preview-stock">
                    <div className="preview-section-title">Stock watch <span className="stock-count">2</span></div>
                    <div className="stock-item"><span className="stock-product product-orange">M</span><span>Milk<small>Running low</small></span><i /></div>
                    <div className="stock-item"><span className="stock-product product-blue">R</span><span>Rice<small>Running low</small></span><i /></div>
                    <div className="stock-link">View inventory <b>→</b></div>
                  </div>
                </div>
              </div>
              <div className="preview-bottom"><span><i /> All your shop activity, together</span><span>YOUR SHOP, AT A GLANCE</span></div>
            </div>
            <div className="visual-note"><span className="visual-note-icon">✓</span><span><strong>Less guesswork</strong><small>More time for your customers</small></span></div>
            <span className="visual-decoration decoration-dot dot-a" />
            <span className="visual-decoration decoration-dot dot-b" />
            <span className="visual-decoration decoration-plus">+</span>
          </div>
          <div className="hero-bottom-note"><span>01</span> YOUR BUSINESS, A LITTLE MORE IN ORDER <i /></div>
        </section>

        <section className="landing-features" id="features">
          <div className="section-heading">
            <div><p className="landing-section-label">THE EVERYDAY, MADE EASIER</p><h2>Everything your shop needs<br />to keep moving.</h2></div>
            <p>One simple place to keep the details in order — so you can spend less time piecing things together.</p>
          </div>
          <div className="feature-grid">
            {features.map((feature) => (
              <article className="feature-card" key={feature.number}>
                <div className="feature-card-top"><span className="feature-icon">{feature.icon}</span><span className="feature-number">{feature.number}</span></div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
                <span className="feature-arrow" aria-hidden="true">↗</span>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-start" id="how-it-works">
          <div className="start-mark" aria-hidden="true">e</div>
          <div><p className="landing-section-label">A FRESH START FOR YOUR SHOP</p><h2>Get your shop in order.</h2><p>Set up your account and bring your day-to-day shop management into one place.</p></div>
          <button type="button" className="landing-primary-cta" onClick={() => openAuth('register')}>Create your account <span aria-hidden="true">→</span></button>
        </section>
      </main>

      <footer className="landing-footer">
        <a className="landing-brand footer-brand" href="#" aria-label="E-Duuka home"><span className="landing-brand-mark">e</span><span>E-Duuka</span></a>
        <span>Simple tools for the business you’re building.</span>
        <span>© {new Date().getFullYear()} E-Duuka</span>
      </footer>

      <AuthModal
        isOpen={authOpen}
        mode={authMode}
        onClose={() => setAuthOpen(false)}
        onModeChange={setAuthMode}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}

import type { LoaderFunctionArgs } from "react-router";
import { redirect, Form, useLoaderData, Link } from "react-router";
import { useState, useEffect, useRef } from "react";

import { login } from "../../shopify.server";

import styles from "./styles.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function App() {
  const { showForm } = useLoaderData<typeof loader>();
  const [shopError, setShopError] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  const validateShopDomain = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return "Please enter your shop domain";
    const isMyshopify = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/i.test(trimmed);
    setShowHelp(!isMyshopify);
    if (isMyshopify) return "";
    return "Please enter your .myshopify.com domain";
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const formData = new FormData(e.currentTarget);
    const shop = formData.get("shop") as string;
    const error = validateShopDomain(shop);
    
    if (error) {
      e.preventDefault();
      setShopError(error);
      return;
    }
    
    setShopError("");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Clear error when user starts typing
    if (shopError) {
      setShopError("");
    }
    // Toggle help visibility live
    const value = e.currentTarget.value;
    const isMyshopify = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/i.test(value.trim());
    setShowHelp(Boolean(value) && !isMyshopify);
  };

  useEffect(() => {
    const container = heroRef.current;
    if (!container) return;

    const handlePointerMove = (e: PointerEvent) => {
      const r = container.getBoundingClientRect();
      const mx = (e.clientX - r.left) / r.width - 0.5;
      const my = (e.clientY - r.top) / r.height - 0.5;
      const dx = mx * 10;
      const dy = my * 8;
      container.querySelectorAll(`.${styles.brandAccent}`).forEach((el) => {
        (el as HTMLElement).style.setProperty("--dx", `${dx}px`);
        (el as HTMLElement).style.setProperty("--dy", `${dy}px`);
      });
    };

    const handleLeave = () => {
      container.querySelectorAll(`.${styles.brandAccent}`).forEach((el) => {
        (el as HTMLElement).style.setProperty("--dx", `0px`);
        (el as HTMLElement).style.setProperty("--dy", `0px`);
      });
    };

    container.addEventListener("pointermove", handlePointerMove);
    container.addEventListener("pointerleave", handleLeave);

    return () => {
      container.removeEventListener("pointermove", handlePointerMove);
      container.removeEventListener("pointerleave", handleLeave);
    };
  }, []);

  return (
    <div className={styles.index}>
      <div className={styles.hero} ref={heroRef}>
        <div className={styles.content}>
          <div className={styles.badge}>🚀 About The Fit - AI Virtual Try-On</div>
          <h1 className={styles.heading}>
            Turn Browsers Into Buyers with <span className={styles.brandAccent}>About The Fit</span>
          </h1>
          <p className={styles.subheading}>
            Reduce returns by 40% and increase conversions by 3x. Let customers see 
            themselves in your products before they buy. Powered by <span className={styles.brandAccent}>About The Fit</span>'s cutting-edge AI.
          </p>
          
          <div className={styles.videoWrap}>
            <div className={styles.videoContainer}>
              <iframe
                className={styles.videoIframe}
                src="https://www.youtube-nocookie.com/embed/FI1-iLFfhPk?rel=0&modestbranding=1&showinfo=0"
                title="About The Fit demo"
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
          
          {showForm && (
            <Form className={styles.form} method="post" action="/auth/login" onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <input 
                  className={`${styles.input} ${shopError ? styles.inputError : ''}`}
                  type="text" 
                  name="shop" 
                  placeholder="your-store.myshopify.com"
                  onChange={handleInputChange}
                  title="Enter your Shopify store domain (e.g., your-store.myshopify.com)"
                  required
                />
                <button className={styles.ctaButton} type="submit">
                  Start Free Trial →
                </button>
              </div>
              {shopError && <p className={styles.formError}>{shopError}</p>}
              {showHelp && !shopError && (
                <div className={styles.formHelp}>
                  <div className={styles.formHelpTitle}>Find your .myshopify.com URL</div>
                  <ol className={styles.formHelpList}>
                    <li>In Shopify admin, go to <strong>Settings → Domains</strong>.</li>
                    <li>Find the domain that contains <code>.myshopify.com</code> and copy it (e.g. <code>your-store.myshopify.com</code>).</li>
                    <li>Paste that value here.</li>
                  </ol>
                  <div className={styles.formHelpHint}>Or install via the Shopify App Store: <a href="https://apps.shopify.com/search?q=About%20The%20Fit" target="_blank" rel="noopener noreferrer">search for “About The Fit”</a>.</div>
                </div>
              )}
              <p className={styles.formHint}>
                ✓ No credit card required ✓ 14-day free trial ✓ Setup in 2 minutes
              </p>
            </Form>
          )}

          <div className={styles.socialProof}>
            <div className={styles.stat}>
              <div className={styles.statNumber}>40%</div>
              <div className={styles.statLabel}>Return Reduction</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statNumber}>3x</div>
              <div className={styles.statLabel}>Higher Conversions</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statNumber}>89%</div>
              <div className={styles.statLabel}>Customer Satisfaction</div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.features}>
        <div className={styles.content}>
          <h2 className={styles.sectionHeading}>Why Merchants Love About The Fit</h2>
          
          <div className={styles.featureGrid}>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>👁️</div>
              <h3 className={styles.featureTitle}>Instant Visual Confidence</h3>
              <p className={styles.featureText}>
                Let customers upload a photo and see themselves wearing your products instantly. 
                No guessing, no uncertainty. Just confident purchases.
              </p>
            </div>

            <div className={styles.feature}>
              <div className={styles.featureIcon}>📉</div>
              <h3 className={styles.featureTitle}>Slash Returns by 40%</h3>
              <p className={styles.featureText}>
                When customers know exactly how products look on them, they keep what they buy. 
                Save thousands in return shipping and processing costs.
              </p>
            </div>

            <div className={styles.feature}>
              <div className={styles.featureIcon}>⚡</div>
              <h3 className={styles.featureTitle}>2-Minute Setup</h3>
              <p className={styles.featureText}>
                No complex integrations or technical skills needed. Install, pick products, 
                and go live. Our AI handles everything automatically.
              </p>
            </div>

            <div className={styles.feature}>
              <div className={styles.featureIcon}>🎨</div>
              <h3 className={styles.featureTitle}>Seamless Brand Integration</h3>
              <p className={styles.featureText}>
                Matches your store's design perfectly. Customizable buttons, colors, and placement 
                make it feel like a native part of your store.
              </p>
            </div>

            <div className={styles.feature}>
              <div className={styles.featureIcon}>🤖</div>
              <h3 className={styles.featureTitle}>Powered by Google AI</h3>
              <p className={styles.featureText}>
                Industry-leading AI technology creates photorealistic virtual try-ons in seconds. 
                Your customers get studio-quality results every time.
              </p>
            </div>

            <div className={styles.feature}>
              <div className={styles.featureIcon}>📊</div>
              <h3 className={styles.featureTitle}>Smart Analytics Dashboard</h3>
              <p className={styles.featureText}>
                Track which products get tried on most, conversion rates, and customer engagement. 
                Make data-driven decisions to boost sales.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.howItWorks}>
        <div className={styles.content}>
          <h2 className={styles.sectionHeading}>How It Works</h2>
          
          <div className={styles.steps}>
            <div className={styles.step}>
              <div className={styles.stepNumber}>1</div>
              <h3 className={styles.stepTitle}>Install the App</h3>
              <p className={styles.stepText}>
                One-click install from the Shopify App Store. No coding required.
              </p>
            </div>

            <div className={styles.step}>
              <div className={styles.stepNumber}>2</div>
              <h3 className={styles.stepTitle}>Enable Try-On</h3>
              <p className={styles.stepText}>
                Select which products you want to enable virtual try-on for in seconds.
              </p>
            </div>

            <div className={styles.step}>
              <div className={styles.stepNumber}>3</div>
              <h3 className={styles.stepTitle}>Watch Sales Soar</h3>
              <p className={styles.stepText}>
                Customers try on, fall in love, and buy with confidence. You win.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.cta}>
        <div className={styles.content}>
          <h2 className={styles.ctaHeading}>
            Ready to Transform Your Fashion Store?
          </h2>
          <p className={styles.ctaText}>
            Join hundreds of fashion merchants who've boosted sales and slashed returns 
            with <span className={styles.brandAccent}>About The Fit</span>'s AI-powered virtual try-on.
          </p>
          
          {showForm && (
            <Form className={styles.form} method="post" action="/auth/login" onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <input 
                  className={`${styles.input} ${shopError ? styles.inputError : ''}`}
                  type="text" 
                  name="shop" 
                  placeholder="your-store.myshopify.com"
                  onChange={handleInputChange}
                  title="Enter your Shopify store domain (e.g., your-store.myshopify.com)"
                  required
                />
                <button className={styles.ctaButton} type="submit">
                  Start Free Trial →
                </button>
              </div>
              {shopError && <p className={styles.formError}>{shopError}</p>}
              <p className={styles.formHint}>
                ✓ 14-day free trial ✓ Cancel anytime ✓ No credit card required
              </p>
            </Form>
          )}
        </div>
      </div>

      <div className={styles.footer}>
        <div className={styles.content}>
          <div className={styles.footerContent}>
            <div className={styles.footerBrand}>
              <h3 className={styles.footerTitle}>About The Fit</h3>
              <p className={styles.footerDescription}>
                AI-powered virtual try-on technology that turns browsers into buyers.
              </p>
            </div>
            <div className={styles.footerLinks}>
              <div className={styles.footerSection}>
                <h4 className={styles.footerSectionTitle}>Legal</h4>
                <Link to="/privacy" className={styles.footerLink}>Privacy Policy</Link>
                <Link to="/terms" className={styles.footerLink}>Terms of Service</Link>
              </div>
              <div className={styles.footerSection}>
                <h4 className={styles.footerSectionTitle}>Support</h4>
                <a href="https://www.revuapp.io/submit/cmguzyiw40001l1046f965l8a" target="_blank" rel="noopener noreferrer" className={styles.footerLink}>Submit a Request</a>
                <a href="mailto:support@hampton.io" className={styles.footerLink}>Email Support</a>
              </div>
            </div>
          </div>
          <div className={styles.footerBottom}>
            <p className={styles.footerCopyright}>
              © {new Date().getFullYear()} About The Fit, Inc. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

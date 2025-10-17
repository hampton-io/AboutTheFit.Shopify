import type { MetaFunction } from "react-router";
import "../styles/terms.css";

export const meta: MetaFunction = () => {
  return [
    { title: "Terms of Service - About The Fit" },
    { name: "description", content: "Terms of Service for About The Fit AI Virtual Try-On App" },
  ];
};

export default function TermsOfService() {
  return (
    <div className="terms-container">
      <div className="terms-content">
        <div className="terms-header">
          <h1 className="terms-title">Terms of Service</h1>
          <p className="terms-last-updated">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="terms-section">
          <h2 className="terms-section-title">1. Acceptance of Terms</h2>
          <div className="terms-section-content">
            <p>
              By accessing and using About The Fit ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
            <p>
              These Terms of Service ("Terms") govern your use of our AI-powered virtual try-on application for Shopify stores. By installing, accessing, or using our service, you agree to these terms.
            </p>
          </div>
        </div>

        <div className="terms-section">
          <h2 className="terms-section-title">2. Description of Service</h2>
          <div className="terms-section-content">
            <p>
              About The Fit is an AI-powered virtual try-on application that allows Shopify store owners to offer customers the ability to virtually try on products using artificial intelligence. The service includes:
            </p>
            <ul>
              <li>AI-powered virtual try-on image generation</li>
              <li>Product integration with Shopify stores</li>
              <li>Analytics and performance tracking</li>
              <li>Customer support and technical assistance</li>
              <li>Regular updates and feature improvements</li>
            </ul>
          </div>
        </div>

        <div className="terms-section">
          <h2 className="terms-section-title">3. User Accounts and Eligibility</h2>
          <div className="terms-section-content">
            <h3>3.1 Account Requirements</h3>
            <p>To use our service, you must:</p>
            <ul>
              <li>Be at least 18 years old or have parental consent</li>
              <li>Have a valid Shopify store</li>
              <li>Provide accurate and complete registration information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Be responsible for all activities under your account</li>
            </ul>

            <h3>3.2 Account Security</h3>
            <p>
              You are responsible for maintaining the confidentiality of your account information and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
            </p>
          </div>
        </div>

        <div className="terms-section">
          <h2 className="terms-section-title">4. Subscription Plans and Billing</h2>
          <div className="terms-section-content">
            <h3>4.1 Available Plans</h3>
            <p>We offer the following subscription plans:</p>
            <ul>
              <li><strong>Free Plan:</strong> 10 credits per month with basic features</li>
              <li><strong>Side Hussle:</strong> $9.99/month for 500 credits with priority support</li>
              <li><strong>Business:</strong> $39.00/month for 10,000 credits with analytics dashboard</li>
              <li><strong>All In:</strong> $99.00/month for unlimited credits with white-label options</li>
            </ul>

            <h3>4.2 Billing and Payment</h3>
            <ul>
              <li>Subscriptions are billed monthly in advance</li>
              <li>Payment is processed through Shopify's billing system</li>
              <li>All fees are non-refundable except as required by law</li>
              <li>We may change pricing with 30 days' notice</li>
              <li>Failed payments may result in service suspension</li>
            </ul>

            <h3>4.3 Free Trial</h3>
            <p>
              New users may receive a free trial period as specified during signup. Trial periods vary by plan and are subject to change at our discretion.
            </p>
          </div>
        </div>

        <div className="terms-section">
          <h2 className="terms-section-title">5. Acceptable Use Policy</h2>
          <div className="terms-section-content">
            <h3>5.1 Permitted Uses</h3>
            <p>You may use our service to:</p>
            <ul>
              <li>Offer virtual try-on functionality for legitimate products</li>
              <li>Improve customer experience and reduce returns</li>
              <li>Generate analytics and performance reports</li>
              <li>Integrate with your Shopify store</li>
            </ul>

            <h3>5.2 Prohibited Uses</h3>
            <p>You may not use our service to:</p>
            <ul>
              <li>Generate inappropriate, offensive, or harmful content</li>
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe on intellectual property rights</li>
              <li>Attempt to reverse engineer or copy our technology</li>
              <li>Use the service for fraudulent or deceptive purposes</li>
              <li>Upload malicious code or attempt to compromise our systems</li>
              <li>Resell or redistribute the service without authorization</li>
            </ul>
          </div>
        </div>

        <div className="terms-section">
          <h2 className="terms-section-title">6. Intellectual Property Rights</h2>
          <div className="terms-section-content">
            <h3>6.1 Our Intellectual Property</h3>
            <p>
              About The Fit and all related trademarks, logos, and content are owned by us or our licensors. You may not use our intellectual property without written permission.
            </p>

            <h3>6.2 Your Content</h3>
            <p>
              You retain ownership of your product images and store content. By using our service, you grant us a limited license to process your content for the purpose of providing our service.
            </p>

            <h3>6.3 Generated Content</h3>
            <p>
              Virtual try-on images generated by our AI are provided for your use in connection with your store. You may not claim ownership of our AI technology or algorithms.
            </p>
          </div>
        </div>

        <div className="terms-section">
          <h2 className="terms-section-title">7. Privacy and Data Protection</h2>
          <div className="terms-section-content">
            <p>
              Your privacy is important to us. Our collection and use of personal information is governed by our Privacy Policy, which is incorporated into these Terms by reference.
            </p>
            <p>
              Key privacy commitments:
            </p>
            <ul>
              <li>Customer photos are processed temporarily and deleted after use</li>
              <li>We do not sell or share personal information with third parties</li>
              <li>We implement appropriate security measures to protect your data</li>
              <li>You have rights to access, correct, or delete your information</li>
            </ul>
          </div>
        </div>

        <div className="terms-section">
          <h2 className="terms-section-title">8. Service Availability and Modifications</h2>
          <div className="terms-section-content">
            <h3>8.1 Service Availability</h3>
            <p>
              We strive to maintain high service availability but cannot guarantee uninterrupted access. We may experience downtime for maintenance, updates, or technical issues.
            </p>

            <h3>8.2 Service Modifications</h3>
            <p>
              We reserve the right to modify, suspend, or discontinue the service at any time. We will provide reasonable notice of significant changes that affect your use of the service.
            </p>

            <h3>8.3 Feature Updates</h3>
            <p>
              We continuously improve our service and may add, modify, or remove features. New features may be available to all users or specific subscription tiers.
            </p>
          </div>
        </div>

        <div className="terms-section">
          <h2 className="terms-section-title">9. Limitation of Liability</h2>
          <div className="terms-section-content">
            <p>
              To the maximum extent permitted by law, About The Fit shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to:
            </p>
            <ul>
              <li>Loss of profits, revenue, or business opportunities</li>
              <li>Data loss or corruption</li>
              <li>Service interruptions or downtime</li>
              <li>Third-party actions or content</li>
              <li>AI-generated content accuracy or quality</li>
            </ul>
            <p>
              Our total liability shall not exceed the amount you paid for the service in the 12 months preceding the claim.
            </p>
          </div>
        </div>

        <div className="terms-section">
          <h2 className="terms-section-title">10. Indemnification</h2>
          <div className="terms-section-content">
            <p>
              You agree to indemnify and hold harmless About The Fit from any claims, damages, or expenses arising from:
            </p>
            <ul>
              <li>Your use of the service in violation of these Terms</li>
              <li>Your violation of any applicable laws or regulations</li>
              <li>Your infringement of third-party rights</li>
              <li>Content you upload or generate using the service</li>
            </ul>
          </div>
        </div>

        <div className="terms-section">
          <h2 className="terms-section-title">11. Termination</h2>
          <div className="terms-section-content">
            <h3>11.1 Termination by You</h3>
            <p>
              You may terminate your account at any time through your Shopify admin panel or by contacting us. Termination will be effective at the end of your current billing period.
            </p>

            <h3>11.2 Termination by Us</h3>
            <p>
              We may terminate or suspend your account immediately if you:
            </p>
            <ul>
              <li>Violate these Terms of Service</li>
              <li>Engage in fraudulent or illegal activities</li>
              <li>Fail to pay subscription fees</li>
              <li>Misuse the service or compromise its security</li>
            </ul>

            <h3>11.3 Effect of Termination</h3>
            <p>
              Upon termination, your access to the service will cease, and we may delete your account data after a reasonable period. You remain responsible for any outstanding fees.
            </p>
          </div>
        </div>

        <div className="terms-section">
          <h2 className="terms-section-title">12. Dispute Resolution</h2>
          <div className="terms-section-content">
            <h3>12.1 Governing Law</h3>
            <p>
              These Terms are governed by the laws of the State of California, United States, without regard to conflict of law principles.
            </p>

            <h3>12.2 Dispute Resolution Process</h3>
            <p>
              Before pursuing legal action, you agree to first contact us to attempt to resolve any dispute informally. If informal resolution fails, disputes will be resolved through binding arbitration.
            </p>

            <h3>12.3 Arbitration</h3>
            <p>
              Any disputes arising from these Terms or your use of the service will be resolved through binding arbitration administered by the American Arbitration Association.
            </p>
          </div>
        </div>

        <div className="terms-section">
          <h2 className="terms-section-title">13. General Provisions</h2>
          <div className="terms-section-content">
            <h3>13.1 Entire Agreement</h3>
            <p>
              These Terms, together with our Privacy Policy, constitute the entire agreement between you and About The Fit regarding the service.
            </p>

            <h3>13.2 Severability</h3>
            <p>
              If any provision of these Terms is found to be unenforceable, the remaining provisions will remain in full force and effect.
            </p>

            <h3>13.3 Waiver</h3>
            <p>
              Our failure to enforce any provision of these Terms does not constitute a waiver of that provision or any other provision.
            </p>

            <h3>13.4 Assignment</h3>
            <p>
              You may not assign these Terms without our consent. We may assign these Terms in connection with a merger, acquisition, or sale of assets.
            </p>
          </div>
        </div>

        <div className="terms-section">
          <h2 className="terms-section-title">14. Changes to Terms</h2>
          <div className="terms-section-content">
            <p>
              We may update these Terms from time to time. We will notify you of material changes by:
            </p>
            <ul>
              <li>Posting the updated Terms on our website</li>
              <li>Sending an email notification to registered users</li>
              <li>Providing notice through the app interface</li>
            </ul>
            <p>
              Your continued use of the service after changes become effective constitutes acceptance of the updated Terms.
            </p>
          </div>
        </div>

        <div className="terms-section">
          <h2 className="terms-section-title">15. Contact Information</h2>
          <div className="terms-section-content">
            <p>
              If you have any questions about these Terms of Service, please contact us:
            </p>
            <div className="terms-contact-info">
              <p><strong>Email:</strong> support@hampton.io</p>
              <p><strong>Support Portal:</strong> <a href="https://www.revuapp.io/submit/cmguzyiw40001l1046f965l8a" target="_blank" rel="noopener noreferrer">Submit a Request</a></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

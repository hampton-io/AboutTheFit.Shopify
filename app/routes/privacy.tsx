import type { MetaFunction } from "react-router";
import "../styles/privacy.css";

export const meta: MetaFunction = () => {
  return [
    { title: "Privacy Policy - About The Fit" },
    { name: "description", content: "Privacy Policy for About The Fit AI Virtual Try-On App" },
  ];
};

export default function PrivacyPolicy() {
  return (
    <div className="privacy-container">
      <div className="privacy-content">
        <div className="privacy-header">
          <h1 className="privacy-title">Privacy Policy</h1>
          <p className="privacy-last-updated">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="privacy-section">
          <h2 className="privacy-section-title">1. Information We Collect</h2>
          <div className="privacy-section-content">
            <h3>1.1 Personal Information</h3>
            <p>
              When you use About The Fit, we may collect the following types of personal information:
            </p>
            <ul>
              <li><strong>Account Information:</strong> Your Shopify store details, email address, and contact information</li>
              <li><strong>Usage Data:</strong> Information about how you interact with our app, including features used and performance metrics</li>
              <li><strong>Customer Data:</strong> Product information and images from your Shopify store for virtual try-on functionality</li>
              <li><strong>Technical Data:</strong> IP address, browser type, device information, and other technical identifiers</li>
            </ul>

            <h3>1.2 Customer Photos</h3>
            <p>
              When customers use the virtual try-on feature, they may upload photos of themselves. These photos are:
            </p>
            <ul>
              <li>Processed temporarily for AI image generation</li>
              <li>Not stored permanently on our servers</li>
              <li>Used solely for generating virtual try-on images</li>
              <li>Deleted automatically after processing</li>
            </ul>
          </div>
        </div>

        <div className="privacy-section">
          <h2 className="privacy-section-title">2. How We Use Your Information</h2>
          <div className="privacy-section-content">
            <p>We use the information we collect to:</p>
            <ul>
              <li>Provide and maintain the About The Fit service</li>
              <li>Process virtual try-on requests and generate AI images</li>
              <li>Improve our AI models and service quality</li>
              <li>Provide customer support and technical assistance</li>
              <li>Send important updates about the service</li>
              <li>Analyze usage patterns to enhance features</li>
              <li>Comply with legal obligations</li>
            </ul>
          </div>
        </div>

        <div className="privacy-section">
          <h2 className="privacy-section-title">3. Information Sharing and Disclosure</h2>
          <div className="privacy-section-content">
            <p>We do not sell, trade, or rent your personal information to third parties. We may share information only in the following circumstances:</p>
            <ul>
              <li><strong>Service Providers:</strong> With trusted third-party services that help us operate our platform (e.g., cloud hosting, analytics)</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights and safety</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
              <li><strong>Consent:</strong> When you have given explicit consent for specific sharing</li>
            </ul>
          </div>
        </div>

        <div className="privacy-section">
          <h2 className="privacy-section-title">4. Data Security</h2>
          <div className="privacy-section-content">
            <p>
              We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. These measures include:
            </p>
            <ul>
              <li>Encryption of data in transit and at rest</li>
              <li>Regular security assessments and updates</li>
              <li>Access controls and authentication systems</li>
              <li>Secure data centers and infrastructure</li>
              <li>Employee training on data protection</li>
            </ul>
          </div>
        </div>

        <div className="privacy-section">
          <h2 className="privacy-section-title">5. Data Retention</h2>
          <div className="privacy-section-content">
            <p>
              We retain your personal information only as long as necessary to provide our services and fulfill the purposes outlined in this policy. Specifically:
            </p>
            <ul>
              <li><strong>Account Data:</strong> Retained while your account is active and for a reasonable period after closure</li>
              <li><strong>Customer Photos:</strong> Deleted immediately after processing virtual try-on requests</li>
              <li><strong>Usage Data:</strong> Retained for analytics and improvement purposes, typically for 2 years</li>
              <li><strong>Legal Requirements:</strong> Some data may be retained longer to comply with legal obligations</li>
            </ul>
          </div>
        </div>

        <div className="privacy-section">
          <h2 className="privacy-section-title">6. Your Rights and Choices</h2>
          <div className="privacy-section-content">
            <p>Depending on your location, you may have the following rights regarding your personal information:</p>
            <ul>
              <li><strong>Access:</strong> Request access to your personal information</li>
              <li><strong>Correction:</strong> Request correction of inaccurate information</li>
              <li><strong>Deletion:</strong> Request deletion of your personal information</li>
              <li><strong>Portability:</strong> Request transfer of your data to another service</li>
              <li><strong>Objection:</strong> Object to certain processing activities</li>
              <li><strong>Withdrawal:</strong> Withdraw consent where processing is based on consent</li>
            </ul>
            <p>
              To exercise these rights, please contact us at the information provided in the "Contact Us" section below.
            </p>
          </div>
        </div>

        <div className="privacy-section">
          <h2 className="privacy-section-title">7. Third-Party Services</h2>
          <div className="privacy-section-content">
            <p>
              Our service integrates with Shopify and may use other third-party services. These services have their own privacy policies, and we encourage you to review them:
            </p>
            <ul>
              <li><strong>Shopify:</strong> <a href="https://www.shopify.com/legal/privacy" target="_blank" rel="noopener noreferrer">Shopify Privacy Policy</a></li>
              <li><strong>Google AI:</strong> <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google Privacy Policy</a></li>
              <li><strong>Cloud Services:</strong> Various cloud providers for hosting and processing</li>
            </ul>
          </div>
        </div>

        <div className="privacy-section">
          <h2 className="privacy-section-title">8. International Data Transfers</h2>
          <div className="privacy-section-content">
            <p>
              Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place for such transfers, including:
            </p>
            <ul>
              <li>Standard contractual clauses approved by relevant authorities</li>
              <li>Adequacy decisions for certain countries</li>
              <li>Other appropriate legal mechanisms</li>
            </ul>
          </div>
        </div>

        <div className="privacy-section">
          <h2 className="privacy-section-title">9. Children's Privacy</h2>
          <div className="privacy-section-content">
            <p>
              Our service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you become aware that a child has provided us with personal information, please contact us immediately.
            </p>
          </div>
        </div>

        <div className="privacy-section">
          <h2 className="privacy-section-title">10. Changes to This Policy</h2>
          <div className="privacy-section-content">
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any material changes by:
            </p>
            <ul>
              <li>Posting the updated policy on our website</li>
              <li>Sending an email notification to registered users</li>
              <li>Providing notice through the app interface</li>
            </ul>
            <p>
              Your continued use of the service after changes become effective constitutes acceptance of the updated policy.
            </p>
          </div>
        </div>

        <div className="privacy-section">
          <h2 className="privacy-section-title">11. Contact Us</h2>
          <div className="privacy-section-content">
            <p>
              If you have any questions about this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="privacy-contact-info">
              <p><strong>Email:</strong> support@hampton.io</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

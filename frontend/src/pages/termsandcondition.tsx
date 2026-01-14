// src/pages/TermsAndConditions.js
import '../styles/terms-and-conditions.css';
import { Layout } from '../components';

const TermsAndConditions = () => {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <Layout expand={false} hasHeader={true}>
      <div className="terms-conditions-wrapper">
        <div className="terms-conditions-container">
          <header className="terms-header">
            <h1 className="terms-title">WeCinema Terms & Conditions</h1>
            <div className="terms-meta">
              <p className="effective-date">Effective: {currentDate}</p>
              <p className="agreement-type">Platform Agreement for Video Distribution & Marketplace</p>
            </div>
          </header>

          <div className="legal-notice">
            <p><strong>IMPORTANT:</strong> These Terms govern your use of WeCinema.co platform including video uploads, marketplace transactions, chat communications, and payment processing.</p>
          </div>

          <div className="terms-content">
            <nav className="terms-toc">
              <h3>Table of Contents</h3>
              <ul>
                <li><a href="#account">1. Account Registration</a></li>
                <li><a href="#content">2. Content Upload & Licensing</a></li>
                <li><a href="#marketplace">3. Marketplace Transactions</a></li>
                <li><a href="#payments">4. Payments & Fees</a></li>
                <li><a href="#communication">5. Communication System</a></li>
                <li><a href="#intellectual">6. Intellectual Property</a></li>
                <li><a href="#termination">7. Termination</a></li>
                <li><a href="#liability">8. Liability & Disputes</a></li>
              </ul>
            </nav>

            <section id="account" className="terms-section">
              <h2 className="section-title">1. Account Registration & User Responsibilities</h2>
              <div className="term-article">
                <div className="term-clause">
                  <h4 className="clause-title">1.1 Account Creation</h4>
                  <p>To access WeCinema features including video upload, marketplace transactions, and chat system, users must:</p>
                  <ul className="terms-list">
                    <li>Provide accurate registration information</li>
                    <li>Maintain account security and password confidentiality</li>
                    <li>Be at least 18 years old or have parental consent</li>
                    <li>Not create multiple accounts without authorization</li>
                  </ul>
                </div>
                <div className="term-clause">
                  <h4 className="clause-title">1.2 User Types</h4>
                  <p>WeCinema supports three user roles:</p>
                  <div className="user-roles">
                    <div className="role-card">
                      <h5>Content Creator</h5>
                      <p>Uploads videos, retains ownership rights, can sell through marketplace</p>
                    </div>
                    <div className="role-card">
                      <h5>Buyer</h5>
                      <p>Purchases video content, creates orders, uses chat for communication</p>
                    </div>
                    <div className="role-card">
                      <h5>Seller</h5>
                      <p>Sells video listings, completes work, receives payments upon completion</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section id="content" className="terms-section">
              <h2 className="section-title">2. Content Upload & Licensing Terms</h2>
              <div className="term-article">
                <div className="term-clause">
                  <h4 className="clause-title">2.1 Video Upload Requirements</h4>
                  <p>By uploading content to WeCinema, you warrant that:</p>
                  <ul className="terms-list">
                    <li>You own all rights to the content or have necessary permissions</li>
                    <li>Content does not infringe any third-party rights</li>
                    <li>Content complies with our Acceptable Use Policy</li>
                    <li>You grant WeCinema license to host and distribute your content</li>
                  </ul>
                </div>
                <div className="term-clause">
                  <h4 className="clause-title">2.2 Revenue Sharing Model</h4>
                  <div className="revenue-model">
                    <div className="revenue-tier">
                      <h5>Basic Upload</h5>
                      <p className="percentage">Platform takes 30% of revenue</p>
                      <p>Standard distribution and hosting</p>
                      <div className="features">
                        <span>✓ Basic analytics</span>
                        <span>✓ Standard encoding</span>
                        <span>✓ 720p streaming</span>
                      </div>
                    </div>
                    
                    <div className="revenue-tier featured">
                      <h5>Premium Partnership</h5>
                      <p className="percentage">Platform takes 20% of revenue</p>
                      <p>Enhanced promotion and distribution</p>
                      <div className="features">
                        <span>✓ Advanced analytics</span>
                        <span>✓ 4K encoding</span>
                        <span>✓ Priority support</span>
                        <span>✓ Custom thumbnails</span>
                      </div>
                    </div>
                    
                    <div className="revenue-tier">
                      <h5>Exclusive Content</h5>
                      <p className="percentage">Platform takes 40% of revenue</p>
                      <p>Maximum exposure and marketing support</p>
                      <div className="features">
                        <span>✓ Featured placement</span>
                        <span>✓ Social media promotion</span>
                        <span>✓ Email marketing</span>
                        <span>✓ Dedicated account manager</span>
                      </div>
                    </div>
                    
                    <div className="revenue-tier hypemode-tier">
                      <div className="hypemode-badge">🔥 Hypemode</div>
                      <h5>Hypemode Feature</h5>
                      <p className="percentage hypemode-percentage">Platform takes 15% of revenue</p>
                      <p>Enhanced marketplace visibility and promotion</p>
                      <div className="features">
                        <span>✓ Top search ranking</span>
                        <span>✓ "Trending" badge</span>
                        <span>✓ Push notifications</span>
                        <span>✓ Homepage featuring</span>
                        <span>✓ Priority in recommendations</span>
                      </div>
                    </div>
                  </div>
                  <p className="revenue-note">
                    <strong>Note:</strong> Revenue share percentages apply to net revenue after payment processing fees (Stripe: 2.9% + $0.30 per transaction).
                  </p>
                </div>
              </div>
            </section>

            <section id="marketplace" className="terms-section">
              <h2 className="section-title">3. Marketplace Transactions</h2>
              <div className="term-article">
                <div className="term-clause">
                  <h4 className="clause-title">3.1 Listing Creation</h4>
                  <p>When creating listings in the marketplace, sellers must:</p>
                  <ul className="terms-list">
                    <li>Provide accurate descriptions and pricing</li>
                    <li>Specify delivery timelines clearly</li>
                    <li>Disclose any usage restrictions or licensing terms</li>
                    <li>Maintain availability of listed content</li>
                  </ul>
                </div>
                <div className="term-clause">
                  <h4 className="clause-title">3.2 Order Process</h4>
                  <div className="process-flow">
                    <div className="process-step">
                      <span className="step-number">1</span>
                      <p>Buyer selects listing and creates order</p>
                    </div>
                    <div className="process-step">
                      <span className="step-number">2</span>
                      <p>Payment processed via Stripe (held in escrow)</p>
                    </div>
                    <div className="process-step">
                      <span className="step-number">3</span>
                      <p>Seller completes work and delivers through platform</p>
                    </div>
                    <div className="process-step">
                      <span className="step-number">4</span>
                      <p>Buyer approves delivery, payment released to seller</p>
                    </div>
                  </div>
                </div>
                <div className="term-clause">
                  <h4 className="clause-title">3.3 Hypemode Listings</h4>
                  <p>Listings enabled with Hypemode feature receive:</p>
                  <ul className="terms-list">
                    <li>Premium placement in marketplace search results</li>
                    <li>Special "Trending" badge for increased visibility</li>
                    <li>Push notification alerts to interested buyers</li>
                    <li>Featured placement on homepage</li>
                    <li>Reduced platform fee of 15% (instead of standard 30%)</li>
                    <li>Automatic inclusion in weekly "Featured Collections"</li>
                  </ul>
                </div>
              </div>
            </section>

            <section id="payments" className="terms-section">
              <h2 className="section-title">4. Payment Processing & Fees</h2>
              <div className="term-article">
                <div className="term-clause">
                  <h4 className="clause-title">4.1 Stripe Integration</h4>
                  <p>WeCinema uses Stripe for secure payment processing:</p>
                  <ul className="terms-list">
                    <li>All transactions processed through Stripe</li>
                    <li>Standard platform fee: 5% per transaction (in addition to revenue share)</li>
                    <li>Hypemode transactions: 5% platform fee + 15% revenue share</li>
                    <li>Payment held in escrow until order completion</li>
                    <li>Refunds processed within 7-10 business days</li>
                  </ul>
                </div>
                <div className="term-clause">
                  <h4 className="clause-title">4.2 Fee Structure</h4>
                  <div className="fee-breakdown">
                    <div className="fee-card">
                      <h5>Standard Upload</h5>
                      <div className="fee-details">
                        <p>Platform Fee: <strong>5%</strong></p>
                        <p>Revenue Share: <strong>30%</strong></p>
                        <p className="total-fee">Total: <span>35%</span></p>
                      </div>
                    </div>
                    <div className="fee-card">
                      <h5>Premium Partnership</h5>
                      <div className="fee-details">
                        <p>Platform Fee: <strong>5%</strong></p>
                        <p>Revenue Share: <strong>20%</strong></p>
                        <p className="total-fee">Total: <span>25%</span></p>
                      </div>
                    </div>
                    <div className="fee-card">
                      <h5>Hypemode Feature</h5>
                      <div className="fee-details">
                        <p>Platform Fee: <strong>5%</strong></p>
                        <p>Revenue Share: <strong>15%</strong></p>
                        <p className="total-fee hypemode-total">Total: <span>20%</span></p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="term-clause">
                  <h4 className="clause-title">4.3 Payment Release Conditions</h4>
                  <p>Payments are released to sellers when:</p>
                  <ul className="terms-list">
                    <li>Buyer confirms work completion</li>
                    <li>48-hour dispute period has passed without issue</li>
                    <li>All platform fees have been deducted</li>
                    <li>Account meets minimum payout threshold ($50)</li>
                  </ul>
                </div>
                <div className="term-clause">
                  <h4 className="clause-title">4.4 Dispute Resolution</h4>
                  <p>In case of transaction disputes:</p>
                  <ul className="terms-list">
                    <li>Platform mediates through chat history and evidence</li>
                    <li>Decision made within 5 business days</li>
                    <li>Either party can appeal decision</li>
                    <li>Escrow funds distributed as per resolution</li>
                  </ul>
                </div>
              </div>
            </section>

            <section id="communication" className="terms-section">
              <h2 className="section-title">5. Communication & Chat System</h2>
              <div className="term-article">
                <div className="term-clause">
                  <h4 className="clause-title">5.1 Chat Guidelines</h4>
                  <p>The integrated chat system allows buyers and sellers to communicate. Users agree to:</p>
                  <ul className="terms-list">
                    <li>Keep communications professional and relevant to transactions</li>
                    <li>Not share personal contact information before transaction completion</li>
                    <li>Use chat for order discussions, revisions, and delivery confirmations</li>
                    <li>All chat logs are stored and may be used for dispute resolution</li>
                  </ul>
                </div>
                <div className="term-clause">
                  <h4 className="clause-title">5.2 Prohibited Communications</h4>
                  <p>Chat may not be used for:</p>
                  <ul className="terms-list warning">
                    <li>Harassment or abusive language</li>
                    <li>Attempting to bypass platform payments</li>
                    <li>Spamming or promotional messages</li>
                    <li>Sharing illegal or copyrighted material</li>
                  </ul>
                </div>
              </div>
            </section>

            <section id="intellectual" className="terms-section">
              <h2 className="section-title">6. Intellectual Property Rights</h2>
              <div className="term-article">
                <div className="term-clause">
                  <h4 className="clause-title">6.1 Content Ownership</h4>
                  <p>Uploaded content remains property of the creator. However, by using WeCinema:</p>
                  <ul className="terms-list">
                    <li>Creators grant non-exclusive license to WeCinema for hosting and distribution</li>
                    <li>Marketplace sales transfer usage rights as specified in listing</li>
                    <li>Platform may use thumbnails and excerpts for promotional purposes</li>
                    <li>Original ownership rights are retained unless explicitly transferred</li>
                  </ul>
                </div>
                <div className="term-clause">
                  <h4 className="clause-title">6.2 License Types in Marketplace</h4>
                  <div className="license-types">
                    <div className="license-card">
                      <h5>Standard License</h5>
                      <p>Personal use only, non-commercial</p>
                      <p className="price">Lower price point</p>
                    </div>
                    <div className="license-card">
                      <h5>Commercial License</h5>
                      <p>Business use, monetization allowed</p>
                      <p className="price">Higher price point</p>
                    </div>
                    <div className="license-card">
                      <h5>Exclusive License</h5>
                      <p>All rights transferred to buyer</p>
                      <p className="price">Premium pricing</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section id="termination" className="terms-section">
              <h2 className="section-title">7. Account Termination & Suspension</h2>
              <div className="term-article">
                <div className="term-clause">
                  <h4 className="clause-title">7.1 User Termination Rights</h4>
                  <p>Users may terminate accounts at any time:</p>
                  <ul className="terms-list">
                    <li>Active orders must be completed before termination</li>
                    <li>Pending payments will be processed within 30 days</li>
                    <li>Uploaded content may remain on platform for 90 days after termination</li>
                    <li>Marketplace listings will be deactivated immediately</li>
                  </ul>
                </div>
                <div className="term-clause">
                  <h4 className="clause-title">7.2 Platform Suspension Rights</h4>
                  <p>WeCinema may suspend or terminate accounts for:</p>
                  <ul className="terms-list warning">
                    <li>Violation of terms of service</li>
                    <li>Fraudulent activity or chargebacks</li>
                    <li>Copyright infringement claims</li>
                    <li>Abusive behavior in chat system</li>
                    <li>Multiple unresolved disputes</li>
                  </ul>
                </div>
              </div>
            </section>

            <section id="liability" className="terms-section">
              <h2 className="section-title">8. Liability, Disputes & Legal</h2>
              <div className="term-article">
                <div className="term-clause">
                  <h4 className="clause-title">8.1 Limitation of Liability</h4>
                  <p>WeCinema's liability is limited to:</p>
                  <ul className="terms-list">
                    <li>Platform fees paid in the last 6 months</li>
                    <li>Direct damages up to $1000</li>
                    <li>Not responsible for user-generated content disputes</li>
                    <li>Not liable for third-party payment processor issues</li>
                  </ul>
                </div>
                <div className="term-clause">
                  <h4 className="clause-title">8.2 Governing Law & Disputes</h4>
                  <ul className="terms-list">
                    <li>Governing law: [Your Jurisdiction]</li>
                    <li>Disputes resolved through binding arbitration</li>
                    <li>Class action lawsuits waived</li>
                    <li>30-day negotiation period required before legal action</li>
                  </ul>
                </div>
                <div className="term-clause">
                  <h4 className="clause-title">8.3 Updates to Terms</h4>
                  <p>We reserve the right to modify these terms:</p>
                  <ul className="terms-list">
                    <li>Users notified 30 days before changes take effect</li>
                    <li>Continued use constitutes acceptance of new terms</li>
                    <li>Major changes may require re-acceptance</li>
                    <li>Previous terms archived and accessible</li>
                  </ul>
                </div>
              </div>
            </section>

            <div className="acceptance-section">
              <div className="acceptance-box">
                <h3>Acceptance of Terms</h3>
                <p>By using WeCinema.co, you acknowledge that you have read, understood, and agree to be bound by these Terms & Conditions, including our Privacy Policy and Acceptable Use Policy.</p>
                <div className="last-updated">
                  <p><strong>Last Updated:</strong> {currentDate}</p>
                  <p><strong>Version:</strong> 2.1</p>
                  <p><strong>Includes:</strong> Hypemode Feature Terms</p>
                </div>
              </div>
            </div>

            <div className="contact-info">
              <h4>Questions about these terms?</h4>
              <p>Contact: legal@wecinema.co | Support: support@wecinema.co</p>
              <p>Business Hours: Mon-Fri, 9 AM - 6 PM [Your Timezone]</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TermsAndConditions;
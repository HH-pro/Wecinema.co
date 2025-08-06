// src/pages/TermsAndConditions.js

import '../components/header/drowpdown.css'; // Create this CSS file for styling
import { Layout } from '../components';

const TermsAndConditions = () => {
  return (
    <Layout expand={false} hasHeader={false}>
    <div className="terms-conditions">
      <h1>Partnership with WeCinema.co Agreement</h1>
      <p>This Partnership with WeCinema.co Agreement ("Agreement") is made and entered into as of [Date], by and between:</p>

      <h2>1. Parties</h2>
      <p><strong>WeCinema.co</strong>, a [State/Country] corporation, with its principal place of business at [Address] ("WeCinema"), and</p>
      <p><strong>Studio/Production Company Name</strong>, a [State/Country] corporation, with its principal place of business at [Address] ("Studio").</p>

      <h2>2. Recitals</h2>
      <p>WHEREAS, WeCinema is an online platform dedicated to hosting and distributing films and other media content;</p>
      <p>WHEREAS, Studio is engaged in the production of films and desires to distribute its content through WeCinema;</p>
      <p>WHEREAS, the parties wish to enter into a joint venture and agree on terms of partial ownership and distribution of the films uploaded to WeCinema.</p>

      <h2>3. Agreement</h2>
      <h3>3.1 Joint Venture and Partnership</h3>
      <p>3.1.1 <strong>Formation</strong>: The parties hereby form a joint venture ("Joint Venture") for the purpose of producing, distributing, and monetizing films and other media content ("Content").</p>
      <p>3.1.2 <strong>Partnership</strong>: The parties agree to become full partners in this Joint Venture, sharing resources, expertise, and revenues as outlined in this Agreement.</p>

      <h3>3.2 Partial Ownership</h3>
      <p>3.2.1 <strong>Content Ownership</strong>: Upon uploading any Content to WeCinema, Studio grants WeCinema a partial ownership interest in said Content, including all associated images and sound ("Partial Ownership"). This Partial Ownership shall be defined as [Percentage]% of the ownership rights to the Content.</p>
      <p>3.2.2 <strong>Rights Granted</strong>: This Partial Ownership includes the rights to distribute, sublicense, reproduce, display, and perform the Content on WeCinema and through any other distribution channels operated or affiliated with WeCinema.</p>
      <p>3.2.3 <strong>Trademark and Branding</strong>: Any Content produced under this Joint Venture shall include branding consistent with WeCinema's standards and may be promoted as a co-produced work under the "WeCinema Originals" label or similar designation.</p>

      <h3>3.3 Revenue Sharing</h3>
      <p>3.3.1 <strong>Revenue Distribution</strong>: All revenue generated from the distribution and monetization of the Content, including but not limited to subscription fees, advertising revenue, and licensing fees, shall be shared between the parties in proportion to their respective ownership interests.</p>
      <p>3.3.2 <strong>Accounting and Reporting</strong>: WeCinema shall provide Studio with quarterly financial reports detailing the revenues generated from the Content and the corresponding payments due to Studio. Payments shall be made within [Number] days following the end of each quarter.</p>

      <h3>3.4 Production and Distribution</h3>
      <p>3.4.1 <strong>Production</strong>: The parties agree to collaborate on the production of Content, with each party contributing resources as mutually agreed upon. Specific terms of each production, including budgets, timelines, and creative control, shall be detailed in separate production agreements.</p>
      <p>3.4.2 <strong>Distribution</strong>: WeCinema shall have the exclusive right to distribute the Content on its platform and through any other channels as deemed appropriate by WeCinema. Studio shall not distribute the Content through any other means without the express written consent of WeCinema.</p>

      <h3>3.5 Intellectual Property</h3>
      <p>3.5.1 <strong>Intellectual Property Rights</strong>: All intellectual property rights in the Content, except for the Partial Ownership granted to WeCinema, shall remain with Studio.</p>
      <p>3.5.2 <strong>Use of Trademarks</strong>: Each party grants the other a non-exclusive, royalty-free license to use its trademarks and logos for the purpose of promoting the Content and the Joint Venture.</p>

      <h3>3.6 Confidentiality</h3>
      <p>3.6.1 <strong>Confidential Information</strong>: Each party agrees to keep confidential any proprietary or confidential information disclosed by the other party in connection with this Agreement and the Joint Venture.</p>

      <h3>3.7 Termination</h3>
      <p>3.7.1 <strong>Termination for Cause</strong>: Either party may terminate this Agreement upon written notice if the other party breaches any material term of this Agreement and fails to cure such breach within [Number] days after receiving written notice thereof.</p>
      <p>3.7.2 <strong>Effect of Termination</strong>: Upon termination, each party shall retain ownership of its respective intellectual property and any revenues due up to the date of termination shall be paid in accordance with Section 3.</p>

      <h3>3.8 Miscellaneous</h3>
      <p>3.8.1 <strong>Governing Law</strong>: This Agreement shall be governed by and construed in accordance with the laws of the State/Country of [Jurisdiction], without regard to its conflict of laws principles.</p>
      <p>3.8.2 <strong>Entire Agreement</strong>: This Agreement constitutes the entire agreement between the parties and supersedes all prior agreements or understandings, whether written or oral, relating to the subject matter hereof.</p>
      <p>3.8.3 <strong>Amendments</strong>: Any amendment or modification of this Agreement must be in writing and signed by authorized representatives of both parties.</p>
      <p>3.8.4 <strong>Notices</strong>: Any notice required or permitted to be given under this Agreement shall be in writing and shall be deemed to have been given when delivered personally, sent by confirmed email, or mailed by registered or certified mail, return receipt requested, to the addresses set forth above.</p>

      <p>IN WITNESS WHEREOF, the parties hereto have executed this Agreement as of the day and year first above written.</p>

      <div className="signatories">
        <div>
          <p><strong>WeCinema.co</strong></p>
          <p>By: ________________________</p>
          <p>Name: ______________________</p>
          <p>Title: _______________________</p>
        </div>
        <div>
          <p><strong>Studio/Production Company Name</strong></p>
          <p>By: ________________________</p>
          <p>Name: ______________________</p>
          <p>Title: _______________________</p>
        </div>
      </div>
    </div>
    </Layout>

  );
};

export default TermsAndConditions;

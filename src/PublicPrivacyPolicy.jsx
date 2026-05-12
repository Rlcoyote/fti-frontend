// ─── Public Privacy Policy page (v28.55) ─────────────────────────────────────
// Accessible at /privacy-policy on app.flotest.com without auth.
//
// Hosted in the React app rather than the IONOS marketing site because the
// IONOS WordPress build's privacy-policy template was a placeholder shell
// ("Please enter the name of your data controller") and editing it through
// IONOS's admin proved more friction than it was worth. This route puts
// the privacy policy in the same place we build features — owned by us,
// versioned in git, no separate CMS to manage.
//
// Twilio A2P 10DLC campaign points its Privacy Policy URL to this page.
// Content covers: data controller, what's collected, why, sharing,
// retention, subject rights, SMS-specific opt-out path, contact.

export default function PublicPrivacyPolicy() {
  return (
    <div style={{
      minHeight: "100vh", background: "#0c1524", color: "#e8ecf2",
      padding: "32px 20px",
    }}>
      <div style={{
        maxWidth: 760, margin: "0 auto", background: "#fff", color: "#1a2340",
        padding: "40px 44px", borderRadius: 10, lineHeight: 1.6,
        boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
      }}>
        {/* Header */}
        <div style={{ marginBottom: 28, paddingBottom: 16, borderBottom: "2px solid #d0d8e8" }}>
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.14em", color: "#B01020" }}>
            FLO-TEST, INC.
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: "8px 0 0", color: "#1a2340" }}>
            Privacy Policy
          </h1>
          <div style={{ fontSize: 12, color: "#6b7a99", marginTop: 8 }}>
            Effective date: May 12, 2026
          </div>
        </div>

        <Section title="Data Controller">
          Flo-Test, Inc.<br/>
          Phone: 432-943-2737<br/>
          Email: <a href="mailto:sales@flotest.com" style={linkStyle}>sales@flotest.com</a>
        </Section>

        <Section title="Personal Data We Collect">
          <p>We collect the following categories of personal data:</p>
          <ul style={ulStyle}>
            <li>Full name</li>
            <li>Mobile phone number</li>
            <li>Email address</li>
            <li>Job-related communications and service-ticket records (employees and customer representatives engaged on active service tickets)</li>
            <li>Biometric authentication credentials — stored locally on the user's device only; biometric data is never transmitted to or stored by Flo-Test servers</li>
            <li>IP address and approximate geolocation captured at app login for security and audit purposes</li>
          </ul>
        </Section>

        <Section title="Purpose of Collecting Data">
          <ol style={olStyle}>
            <li>Operational coordination of active service tickets — crew assignment, Job Safety Analysis (JSA) signing, customer site contact, and crew arrival ETA notifications</li>
            <li>Authentication of authorized users to the Flo-Test operations application</li>
            <li>Invoicing and post-job customer follow-up</li>
            <li>Compliance with safety documentation requirements (JSA acknowledgments)</li>
          </ol>
        </Section>

        <Section title="SMS Messaging">
          <p>
            Flo-Test sends operational SMS text messages to employees (PIN setup links, JSA acknowledgment requests, job assignment notifications) and to authorized customer representatives engaged on active service tickets (crew arrival/ETA notifications, service completion follow-ups). Recipients consent to receive these messages before any are sent — either by checking the SMS consent box during in-app PIN setup (employees) or by giving verbal consent during the job-setup conversation with Flo-Test sales staff (customer representatives), recorded in our operations system with a timestamp.
          </p>
          <p>
            Message and data rates may apply. Message frequency varies by job activity (typically 1 to 10 messages per week per recipient depending on active ticket count). Reply <strong>STOP</strong> to any message to opt out at any time, or reply <strong>HELP</strong> for assistance. Full SMS Terms are at{" "}
            <a href="https://www.flotest.com/sms-terms/" style={linkStyle}>https://www.flotest.com/sms-terms/</a>.
          </p>
          <p>
            Mobile phone numbers and SMS opt-in data are never shared with third parties for marketing purposes. Phone numbers are shared only with Twilio, Inc. for the technical delivery of operational SMS messages.
          </p>
        </Section>

        <Section title="Data Sharing / Third Parties">
          <p>
            We share personal data only with the third-party service providers we rely on to operate the Flo-Test platform:
          </p>
          <ul style={ulStyle}>
            <li><strong>Twilio, Inc.</strong> — SMS message delivery (phone numbers and message content only)</li>
            <li><strong>Intuit QuickBooks</strong> — customer and invoicing data, for accounting integration</li>
            <li><strong>Railway</strong> — application hosting (database is encrypted at rest)</li>
            <li><strong>Resend</strong> — transactional email delivery (email addresses and message content only)</li>
          </ul>
          <p>
            Personal data is <strong>not sold, traded, or shared</strong> for marketing purposes with any party.
          </p>
        </Section>

        <Section title="Data Retention">
          <p>
            Operational records (tickets, JSAs, activity logs, SMS consent records) are retained for <strong>three years</strong> from the date of creation, consistent with industry safety documentation standards. Phone numbers and contact data are retained as long as the employee or customer relationship is active. You may request removal of your personal data at any time using the contact below.
          </p>
        </Section>

        <Section title="Your Rights">
          <p>You may request any of the following by contacting us:</p>
          <ul style={ulStyle}>
            <li>Access to the personal data we hold about you</li>
            <li>Correction of inaccurate or incomplete data</li>
            <li>Deletion of your personal data (subject to legal retention requirements where applicable)</li>
            <li>Opt-out from SMS messaging at any time, by replying <strong>STOP</strong> to any message or by contacting us directly</li>
          </ul>
        </Section>

        <Section title="Security">
          <p>
            We protect personal data using industry-standard measures: encrypted transport (HTTPS/TLS), encrypted database storage at rest, authenticated access controls, biometric authentication for the operations app, and audit logging of access to sensitive records.
          </p>
        </Section>

        <Section title="Contact for Privacy Inquiries">
          <p>
            For any privacy-related question, correction request, deletion request, or opt-out outside of replying STOP to an SMS message, contact Flo-Test directly:
          </p>
          <p style={{ marginLeft: 16 }}>
            Flo-Test, Inc.<br/>
            Phone: <a href="tel:+14329432737" style={linkStyle}>432-943-2737</a><br/>
            Email: <a href="mailto:sales@flotest.com" style={linkStyle}>sales@flotest.com</a>
          </p>
        </Section>

        <Section title="Changes to This Policy">
          <p>
            We may update this Privacy Policy as our services or applicable regulations change. The effective date at the top of this page will reflect the most recent revision. Material changes will be communicated to affected users directly.
          </p>
        </Section>

        <div style={{
          marginTop: 32, paddingTop: 16, borderTop: "1px solid #d0d8e8",
          fontSize: 11, color: "#6b7a99", textAlign: "center",
        }}>
          Flo-Test, Inc. · Operations Application · v28.55
        </div>
      </div>
    </div>
  );
}

// ── Inline section component ────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <section style={{ marginBottom: 24 }}>
      <h2 style={{
        fontSize: 16, fontWeight: 800, color: "#1a2340",
        marginBottom: 10, letterSpacing: "0.02em",
      }}>{title}</h2>
      <div style={{ fontSize: 14, color: "#1a2340" }}>{children}</div>
    </section>
  );
}

const linkStyle = { color: "#1a5fa8", textDecoration: "underline" };
const ulStyle = { paddingLeft: 22, margin: "8px 0", color: "#1a2340" };
const olStyle = { paddingLeft: 22, margin: "8px 0", color: "#1a2340" };

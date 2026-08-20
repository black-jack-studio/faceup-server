import LegalDocumentLayout from "@/components/LegalDocumentLayout";

export default function PrivacyPolicy() {
  return (
    <LegalDocumentLayout title="Privacy Policy">
      <p className="text-white/50 text-xs mb-4">© 2025 Stanislas & Anatole Beaudoin – All rights reserved.</p>

      <h2>Introduction</h2>
      <p>This policy explains how personal information is handled when you use the FaceUp application.</p>

      <h2>Data Collection</h2>
      <p>The app collects account information (e.g., username, email address), along with usage statistics, gameplay preferences, and device details including operating system and unique identifiers.</p>

      <h2>Use of Data</h2>
      <p>Information gathered is used to improve the app experience, provide customer support, enable gameplay features, and ensure regulatory compliance.</p>

      <h2>Data Sharing</h2>
      <p>We do not sell or rent your personal information. Sharing occurs only with essential third-party service providers handling hosting, payments, and analytics functions.</p>

      <h2>User Rights</h2>
      <p>Under applicable regulations such as GDPR, you may access, correct, or delete your personal data at any time. You can delete your account directly from the app (Profile → Settings → Delete Account), or contact us at <strong>help.faceup@gmail.com</strong>.</p>

      <h2>Randomized Reward Odds</h2>
      <p>The Premium Spin on the Wheel of Fortune costs 10 gems (a purchasable currency) and grants one randomly-selected reward. The odds of each outcome are:</p>
      <ul>
        <li>150 coins — 25.6%</li>
        <li>250 coins — 6.4%</li>
        <li>500 coins — 1.3%</li>
        <li>8 gems — 25.6%</li>
        <li>20 gems — 6.4%</li>
        <li>25 gems — 1.3%</li>
        <li>1 bolt — 25.6%</li>
        <li>3 bolts — 6.4%</li>
        <li>5 bolts — 1.3%</li>
      </ul>

      <h2>Security</h2>
      <p>We implement technical and organizational safeguards to protect your data from unauthorized access, alteration, or destruction.</p>

      <h2>Contact</h2>
      <p>Questions should be directed to <strong>help.faceup@gmail.com</strong>.</p>
    </LegalDocumentLayout>
  );
}

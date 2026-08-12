import LegalDocumentLayout from "@/components/LegalDocumentLayout";

export default function TermsOfService() {
  return (
    <LegalDocumentLayout title="Terms of Service">
      <p className="text-white/50 text-xs mb-4">© 2025 Stanislas & Anatole Beaudoin – All rights reserved.</p>

      <h2>1. Acceptance of Terms</h2>
      <p>By downloading and using FaceUp, you agree to comply with and be bound by these Terms of Service. If you do not agree, please do not use the application.</p>

      <h2>2. Description of Service</h2>
      <p>FaceUp is a mobile gaming application offering a blackjack-like experience for entertainment purposes only. The app may include in-app purchases for virtual items. No real money gambling is offered or permitted.</p>

      <h2>3. Eligibility</h2>
      <p>You must be at least 18 years old (or the legal age in your country if higher) to use this application. By using the app, you confirm that you meet this requirement.</p>

      <h2>4. Virtual Currency and Purchases</h2>
      <p>The app may provide access to virtual currency, coins, or other digital items. These items are not redeemable for real money, have no real-world value, and cannot be exchanged outside the app.</p>

      <h2>5. Refund Policy</h2>
      <p>All purchases made through the App are processed via the App Store (Apple) or Google Play Store. Because the items provided are digital and available immediately, all sales are final and non-refundable, except as required by applicable law.</p>
      <p>Any refund requests must be submitted directly to Apple or Google, according to their respective refund policies. We do not provide direct refunds or exchanges for in-app purchases.</p>

      <h2>6. User Conduct</h2>
      <p>Users agree not to:</p>
      <ul>
        <li>Attempt to hack, cheat, or exploit the game</li>
        <li>Use the app for illegal or unauthorized purposes</li>
        <li>Harass, threaten, or abuse other players</li>
      </ul>

      <h2>7. Intellectual Property</h2>
      <p>All content, design, graphics, source code, and trademarks within the app remain the exclusive property of Stanislas & Anatole Beaudoin. Unauthorized use, reproduction, or distribution is strictly prohibited.</p>

      <h2>8. Disclaimer of Warranties</h2>
      <p>The app is provided "as is" without warranties of any kind. We do not guarantee uninterrupted operation, error-free gameplay, or that the app will meet all user expectations.</p>

      <h2>9. Limitation of Liability</h2>
      <p>Stanislas & Anatole Beaudoin shall not be liable for any damages, direct or indirect, arising from the use or inability to use the app, including but not limited to data loss, device issues, or financial loss.</p>

      <h2>10. Modifications</h2>
      <p>We reserve the right to update or modify these Terms at any time. Users will be notified of significant changes within the app or via the official website.</p>

      <h2>11. Governing Law</h2>
      <p>These Terms shall be governed by and interpreted in accordance with the laws of France. Any disputes shall be subject to the exclusive jurisdiction of the courts of Paris, France.</p>

      <h2>12. Contact</h2>
      <p>For any questions regarding these Terms, please contact <strong>help.faceup@gmail.com</strong>.</p>
    </LegalDocumentLayout>
  );
}

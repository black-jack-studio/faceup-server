import LegalDocumentLayout from "@/components/LegalDocumentLayout";

export default function Support() {
  return (
    <LegalDocumentLayout title="Support">
      <h2>Need help?</h2>
      <p>
        If you're running into an issue with FaceUp — a bug, a question about your account, or
        anything else — reach out and we'll get back to you as soon as we can.
      </p>
      <p>
        Contact us at <strong>help.faceup@gmail.com</strong>.
      </p>

      <h2>Account</h2>
      <p>
        You can change your username or password, or permanently delete your account, from
        Profile → Settings inside the app.
      </p>

      <h2>Purchases &amp; subscriptions</h2>
      <p>
        Purchases are processed through the App Store or Google Play. For refund requests,
        contact Apple or Google directly through their respective support channels — see our{" "}
        <a href="/legal/terms-of-service" className="underline hover:text-white">Terms of Service</a> for details.
      </p>
    </LegalDocumentLayout>
  );
}

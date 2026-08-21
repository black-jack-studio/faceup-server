import LegalDocumentLayout from "@/components/LegalDocumentLayout";

export default function LegalNotice() {
  return (
    <LegalDocumentLayout title="Legal Notice">
      <p className="text-white/50 text-xs mb-4">© 2025 Stanislas & Anatole Beaudoin. All rights reserved.</p>

      <h2>Application Publisher</h2>
      <p>Name: <strong>Stanislas Beaudoin ; Anatole Beaudoin</strong></p>
      <p>Address: <strong>Paris, France</strong></p>
      <p>Contact email: <strong>help.faceup@gmail.com</strong></p>

      <h2>Hosting</h2>
      <p>Host: <strong>Render Services, Inc.</strong></p>
      <p>Website: <strong>render.com</strong></p>

      <h2>Intellectual Property</h2>
      <p>All content of the application (texts, images, graphics, logo, source code) is protected by applicable intellectual property laws. Any duplication or display requires prior written permission.</p>

      <h2>Liability</h2>
      <p>The publisher assumes no responsibility for glitches, service interruptions, or damages — whether direct or indirect — stemming from application usage.</p>

      <h2>Contact</h2>
      <p>Questions or concerns should be directed to <strong>help.faceup@gmail.com</strong>.</p>
    </LegalDocumentLayout>
  );
}

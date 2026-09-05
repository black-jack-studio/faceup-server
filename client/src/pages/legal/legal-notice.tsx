import { useTranslation } from "react-i18next";
import LegalDocumentLayout from "@/components/LegalDocumentLayout";

// Shared with the Legal Notice sheet opened from Legal Links (see BottomSheet/legal-links.tsx).
export function LegalNoticeContent() {
  const { t } = useTranslation("legal");

  return (
    <>
      <p className="opacity-60 text-xs mb-4">{t("legalNotice.copyright")}</p>

      <h2>{t("legalNotice.publisher.title")}</h2>
      <p>{t("legalNotice.publisher.nameLabel")} <strong>Stanislas Beaudoin ; Anatole Beaudoin</strong></p>
      <p>{t("legalNotice.publisher.addressLabel")} <strong>Paris, France</strong></p>
      <p>{t("legalNotice.publisher.contactLabel")} <strong>help.faceup@gmail.com</strong></p>

      <h2>{t("legalNotice.hosting.title")}</h2>
      <p>{t("legalNotice.hosting.hostLabel")} <strong>Render Services, Inc.</strong></p>
      <p>{t("legalNotice.hosting.websiteLabel")} <strong>render.com</strong></p>

      <h2>{t("legalNotice.intellectualProperty.title")}</h2>
      <p>{t("legalNotice.intellectualProperty.body")}</p>

      <h2>{t("legalNotice.liability.title")}</h2>
      <p>{t("legalNotice.liability.body")}</p>

      <h2>{t("legalNotice.contact.title")}</h2>
      <p>{t("legalNotice.contact.body")} <strong>help.faceup@gmail.com</strong>.</p>
    </>
  );
}

export default function LegalNotice() {
  const { t } = useTranslation("legal");
  return (
    <LegalDocumentLayout title={t("titles.legalNotice")}>
      <LegalNoticeContent />
    </LegalDocumentLayout>
  );
}

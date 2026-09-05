import { useTranslation } from "react-i18next";
import LegalDocumentLayout from "@/components/LegalDocumentLayout";

// Shared with the Support sheet opened from Legal Links (see BottomSheet/legal-links.tsx).
export function SupportContent() {
  const { t } = useTranslation("support");
  return (
    <>
      <h2>{t("needHelpTitle")}</h2>
      <p>
        {t("needHelpBody")}
      </p>
      <p>
        {t("contactPrefix")} <strong>help.faceup@gmail.com</strong>.
      </p>

      <h2>{t("accountTitle")}</h2>
      <p>
        {t("accountBody")}
      </p>

      <h2>{t("purchasesTitle")}</h2>
      <p>
        {t("purchasesBodyPrefix")}{" "}
        <a href="/legal/terms-of-service" className="underline">{t("termsOfService")}</a> {t("purchasesBodySuffix")}
      </p>
    </>
  );
}

export default function Support() {
  const { t } = useTranslation("support");
  return (
    <LegalDocumentLayout title={t("title")}>
      <SupportContent />
    </LegalDocumentLayout>
  );
}

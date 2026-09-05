import { useTranslation } from "react-i18next";
import LegalDocumentLayout from "@/components/LegalDocumentLayout";

// Shared with the Terms of Service sheet opened from Legal Links (see BottomSheet/legal-links.tsx).
export function TermsOfServiceContent() {
  const { t } = useTranslation("legal");

  return (
    <>
      <p className="opacity-60 text-xs mb-4">{t("termsOfService.copyright")}</p>

      <h2>{t("termsOfService.acceptance.title")}</h2>
      <p>{t("termsOfService.acceptance.body")}</p>

      <h2>{t("termsOfService.description.title")}</h2>
      <p>{t("termsOfService.description.body")}</p>

      <h2>{t("termsOfService.eligibility.title")}</h2>
      <p>{t("termsOfService.eligibility.body")}</p>

      <h2>{t("termsOfService.virtualCurrency.title")}</h2>
      <p>{t("termsOfService.virtualCurrency.body")}</p>

      <h2>{t("termsOfService.refundPolicy.title")}</h2>
      <p>{t("termsOfService.refundPolicy.body1")}</p>
      <p>{t("termsOfService.refundPolicy.body2")}</p>

      <h2>{t("termsOfService.userConduct.title")}</h2>
      <p>{t("termsOfService.userConduct.intro")}</p>
      <ul>
        {(t("termsOfService.userConduct.items", { returnObjects: true }) as string[]).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <h2>{t("termsOfService.intellectualProperty.title")}</h2>
      <p>{t("termsOfService.intellectualProperty.body")}</p>

      <h2>{t("termsOfService.disclaimer.title")}</h2>
      <p>{t("termsOfService.disclaimer.body")}</p>

      <h2>{t("termsOfService.limitationOfLiability.title")}</h2>
      <p>{t("termsOfService.limitationOfLiability.body")}</p>

      <h2>{t("termsOfService.modifications.title")}</h2>
      <p>{t("termsOfService.modifications.body")}</p>

      <h2>{t("termsOfService.governingLaw.title")}</h2>
      <p>{t("termsOfService.governingLaw.body")}</p>

      <h2>{t("termsOfService.contact.title")}</h2>
      <p>{t("termsOfService.contact.body")} <strong>help.faceup@gmail.com</strong>.</p>
    </>
  );
}

export default function TermsOfService() {
  const { t } = useTranslation("legal");
  return (
    <LegalDocumentLayout title={t("titles.termsOfService")}>
      <TermsOfServiceContent />
    </LegalDocumentLayout>
  );
}

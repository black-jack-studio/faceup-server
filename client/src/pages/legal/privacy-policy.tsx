import { useTranslation } from "react-i18next";
import LegalDocumentLayout from "@/components/LegalDocumentLayout";

// Shared with the Privacy sheet Settings opens (see BottomSheet/settings.tsx) — same text
// either way, just wrapped differently (this page's own dark LegalDocumentLayout below, or the
// sheet's light background), so the policy itself can't drift between the two entry points.
export function PrivacyPolicyContent() {
  const { t } = useTranslation("legal");

  return (
    <>
      <p className="opacity-60 text-xs mb-4">{t("privacyPolicy.copyright")}</p>

      <h2>{t("privacyPolicy.introduction.title")}</h2>
      <p>{t("privacyPolicy.introduction.body")}</p>

      <h2>{t("privacyPolicy.dataCollection.title")}</h2>
      <p>{t("privacyPolicy.dataCollection.body")}</p>

      <h2>{t("privacyPolicy.useOfData.title")}</h2>
      <p>{t("privacyPolicy.useOfData.body")}</p>

      <h2>{t("privacyPolicy.dataSharing.title")}</h2>
      <p>{t("privacyPolicy.dataSharing.body")}</p>

      <h2>{t("privacyPolicy.userRights.title")}</h2>
      <p>{t("privacyPolicy.userRights.body")} <strong>help.faceup@gmail.com</strong>.</p>

      <h2>{t("privacyPolicy.randomizedRewardOdds.title")}</h2>
      <p>{t("privacyPolicy.randomizedRewardOdds.intro")}</p>
      <ul>
        {(t("privacyPolicy.randomizedRewardOdds.odds", { returnObjects: true }) as string[]).map((odd) => (
          <li key={odd}>{odd}</li>
        ))}
      </ul>

      <h2>{t("privacyPolicy.security.title")}</h2>
      <p>{t("privacyPolicy.security.body")}</p>

      <h2>{t("privacyPolicy.contact.title")}</h2>
      <p>{t("privacyPolicy.contact.body")} <strong>help.faceup@gmail.com</strong>.</p>
    </>
  );
}

export default function PrivacyPolicy() {
  const { t } = useTranslation("legal");
  return (
    <LegalDocumentLayout title={t("titles.privacyPolicy")}>
      <PrivacyPolicyContent />
    </LegalDocumentLayout>
  );
}

import LegalDocumentScreen from "../components/LegalDocumentScreen";
import { useTranslation } from "../hooks/use-translation";

const PrivacyPolicyScreen = () => {
  const { t } = useTranslation();

  const sections = {
    items: [
      {
        title: t("privacyPolicy.sections.dataWeCollect.title"),
        paragraphs: t("privacyPolicy.sections.dataWeCollect.paragraphs"),
      },
      {
        title: t("privacyPolicy.sections.dataUsage.title"),
        paragraphs: t("privacyPolicy.sections.dataUsage.paragraphs"),
      },
      {
        title: t("privacyPolicy.sections.passwordsAndSecurity.title"),
        paragraphs: t(
          "privacyPolicy.sections.passwordsAndSecurity.paragraphs",
        ),
      },
      {
        title: t("privacyPolicy.sections.dataSharing.title"),
        paragraphs: t("privacyPolicy.sections.dataSharing.paragraphs"),
      },
      {
        title: t("privacyPolicy.sections.dataRetention.title"),
        paragraphs: t("privacyPolicy.sections.dataRetention.paragraphs"),
      },
      {
        title: t("privacyPolicy.sections.userRights.title"),
        paragraphs: t("privacyPolicy.sections.userRights.paragraphs"),
      },
      {
        title: t("privacyPolicy.sections.policyUpdates.title"),
        paragraphs: t("privacyPolicy.sections.policyUpdates.paragraphs"),
      },
      {
        title: t("privacyPolicy.sections.contact.title"),
        paragraphs: t("privacyPolicy.sections.contact.paragraphs"),
      },
    ],
  };

  return (
    <LegalDocumentScreen
      title={t("privacyPolicy.title")}
      lastUpdated={t("privacyPolicy.lastUpdated")}
      sections={sections}
    />
  );
};

export default PrivacyPolicyScreen;

import LegalDocumentScreen from "../components/LegalDocumentScreen";
import { useTranslation } from "../hooks/use-translation";

const TermsOfServiceScreen = () => {
  const { t } = useTranslation();

  const sections = {
    items: [
      {
        title: t("termsOfService.sections.definitions.title"),
        paragraphs: t("termsOfService.sections.definitions.paragraphs"),
      },
      {
        title: t("termsOfService.sections.acceptance.title"),
        paragraphs: t("termsOfService.sections.acceptance.paragraphs"),
      },
      {
        title: t("termsOfService.sections.accountCreation.title"),
        paragraphs: t("termsOfService.sections.accountCreation.paragraphs"),
      },
      {
        title: t("termsOfService.sections.appUsage.title"),
        paragraphs: t("termsOfService.sections.appUsage.paragraphs"),
      },
      {
        title: t("termsOfService.sections.ordersAndPayments.title"),
        paragraphs: t("termsOfService.sections.ordersAndPayments.paragraphs"),
      },
      {
        title: t("termsOfService.sections.balanceAndWallet.title"),
        paragraphs: t("termsOfService.sections.balanceAndWallet.paragraphs"),
      },
      {
        title: t("termsOfService.sections.pricingAndChanges.title"),
        paragraphs: t("termsOfService.sections.pricingAndChanges.paragraphs"),
      },
      {
        title: t("termsOfService.sections.notificationsAndUpdates.title"),
        paragraphs: t(
          "termsOfService.sections.notificationsAndUpdates.paragraphs",
        ),
      },
      {
        title: t("termsOfService.sections.updatesAndMaintenance.title"),
        paragraphs: t(
          "termsOfService.sections.updatesAndMaintenance.paragraphs",
        ),
      },
      {
        title: t("termsOfService.sections.intellectualProperty.title"),
        paragraphs: t(
          "termsOfService.sections.intellectualProperty.paragraphs",
        ),
      },
      {
        title: t("termsOfService.sections.disclaimer.title"),
        paragraphs: t("termsOfService.sections.disclaimer.paragraphs"),
      },
      {
        title: t("termsOfService.sections.serviceTermination.title"),
        paragraphs: t(
          "termsOfService.sections.serviceTermination.paragraphs",
        ),
      },
      {
        title: t("termsOfService.sections.termsChanges.title"),
        paragraphs: t("termsOfService.sections.termsChanges.paragraphs"),
      },
      {
        title: t("termsOfService.sections.contact.title"),
        paragraphs: t("termsOfService.sections.contact.paragraphs"),
      },
      {
        title: t("termsOfService.sections.governingLaw.title"),
        paragraphs: t("termsOfService.sections.governingLaw.paragraphs"),
      },
    ],
  };

  return (
    <LegalDocumentScreen
      title={t("termsOfService.title")}
      lastUpdated={t("termsOfService.lastUpdated")}
      sections={sections}
    />
  );
};

export default TermsOfServiceScreen;

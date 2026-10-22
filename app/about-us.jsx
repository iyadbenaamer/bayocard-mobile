import LegalDocumentScreen from "../components/LegalDocumentScreen";
import { useTranslation } from "../hooks/use-translation";

const AboutUsScreen = () => {
  const { t } = useTranslation();

  const sections = {
    items: [
      {
        title: t("aboutUs.sections.whoWeAre.title"),
        paragraphs: t("aboutUs.sections.whoWeAre.paragraphs"),
      },
      {
        title: t("aboutUs.sections.vision.title"),
        paragraphs: t("aboutUs.sections.vision.paragraphs"),
      },
      {
        title: t("aboutUs.sections.mission.title"),
        paragraphs: t("aboutUs.sections.mission.paragraphs"),
      },
      {
        title: t("aboutUs.sections.values.title"),
        paragraphs: t("aboutUs.sections.values.paragraphs"),
      },
    ],
  };

  return <LegalDocumentScreen title={t("aboutUs.title")} sections={sections} />;
};

export default AboutUsScreen;

import { Dropdown } from "./Dropdown";
import { supportedLanguages, useTranslation, type SupportedLanguage } from "../lib/i18n";

export function LanguageDropdown({
  lang,
  setLang,
  menuClassName,
  triggerClassName,
}: {
  lang: SupportedLanguage;
  setLang: (lang: SupportedLanguage) => void;
  menuClassName?: string;
  triggerClassName?: string;
}) {
  const { t } = useTranslation();
  const rootClassName = menuClassName ? `language-dropdown ${menuClassName}` : "language-dropdown";
  const buttonClassName = triggerClassName ? `language-dropdown-button ${triggerClassName}` : "language-dropdown-button";

  return (
    <div className={rootClassName}>
      <Dropdown
        trigger={<span className="language-dropdown-trigger">{lang.toUpperCase()}</span>}
        items={supportedLanguages.map((language) => ({
          label: (
            <span className="language-dropdown-item">
              <span className="language-dropdown-chip" aria-hidden="true">
                {language.toUpperCase()}
              </span>
              <span className="language-dropdown-name">{t(`settings.languageName.${language}`)}</span>
            </span>
          ),
          value: language,
          active: language === lang,
        }))}
        onSelect={(value) => setLang(value as SupportedLanguage)}
        className={buttonClassName}
        hideChevron
        ariaLabel={t("sidebar.language")}
        title={t("sidebar.language")}
      />
    </div>
  );
}

import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const languages = [
  { code: "en", label: "EN" },
  { code: "de", label: "DE" },
  { code: "fr", label: "FR" },
  { code: "id", label: "ID" },
];

export const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();
  const currentLanguage = i18n.resolvedLanguage ?? i18n.language;

  const handleChangeLanguage = (languageCode: string) => {
    void i18n.changeLanguage(languageCode);
  };

  return (
    <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] pl-3 backdrop-blur-xl">
      <Globe className="h-3.5 w-3.5 text-white/45" />
      <Select value={currentLanguage} onValueChange={handleChangeLanguage}>
        <SelectTrigger
          className="h-8 w-[62px] border-0 bg-transparent px-2 text-xs font-semibold tracking-wide text-white/80 shadow-none focus:ring-0 focus:ring-offset-0"
          aria-label={t("language")}
        >
          <SelectValue placeholder={t("language")} />
        </SelectTrigger>

        <SelectContent className="min-w-[5rem] border-white/10 bg-popover/95 backdrop-blur-xl">
          {languages.map((language) => (
            <SelectItem
              key={language.code}
              value={language.code}
              className="text-xs font-semibold tracking-wide"
            >
              {language.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

import { Volume2, VolumeX } from "lucide-react";
import { useSound } from "@/context/SoundContext";
import { useTranslation } from "react-i18next";

export const SoundToggle = () => {
  const { isMuted, toggleMute } = useSound();
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={toggleMute}
      aria-label={t("sound")}
      aria-pressed={!isMuted}
      title={t("sound")}
      className="tap-scale grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/60 backdrop-blur-xl transition-colors hover:bg-white/[0.09] hover:text-white/90"
    >
      {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
    </button>
  );
};

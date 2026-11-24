import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const SoundContext = createContext<{
  playSound: (src: string) => void;
  isMuted: boolean;
  toggleMute: () => void;
}>({
  playSound: () => {},
  isMuted: false,
  toggleMute: () => {},
});

/**
 * Resolve a sound against the deployment's base path, so audio keeps working
 * when the app is served from a subdirectory (e.g. GitHub Pages project sites
 * live at /<repo>/ rather than /).
 */
const resolveSound = (src: string) =>
  `${import.meta.env.BASE_URL}${src.replace(/^\/+/, "")}`;

const PRELOAD = [
  "/sounds/submit-vote.wav",
  "/sounds/new-page.mp3",
  "/sounds/click-sound.mp3",
  "/sounds/player-joined.mp3",
];

export const SoundProvider = ({ children }: { children: React.ReactNode }) => {
  const [isMuted, setIsMuted] = useState(false);
  const audioCache = useRef(new Map<string, HTMLAudioElement>());

  useEffect(() => {
    PRELOAD.forEach((src) => {
      const url = resolveSound(src);
      const audio = new Audio(url);
      audio.preload = "auto";
      audioCache.current.set(url, audio);
    });
  }, []);

  const playSound = useCallback(
    (src: string) => {
      if (isMuted) return;
      const url = resolveSound(src);
      let audio = audioCache.current.get(url);
      if (!audio) {
        audio = new Audio(url);
        audioCache.current.set(url, audio);
      }
      audio.currentTime = 0;
      // Browsers reject playback before the first user gesture; not fatal.
      void audio.play().catch(() => {});
    },
    [isMuted],
  );

  const toggleMute = () => setIsMuted((prev) => !prev);

  return (
    <SoundContext.Provider value={{ playSound, isMuted, toggleMute }}>
      {children}
    </SoundContext.Provider>
  );
};

export const useSound = () => useContext(SoundContext);

import { useEffect, useRef } from "react";
import { useStudio } from "@/lib/scene/store";

/** Optional device speech; never auto-plays and never replaces visible review. */
export function SpokenFeedback() {
  const enabled = useStudio((s) => s.spokenFeedback);
  const summary = useStudio((s) => s.pending?.summary);
  const previous = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!enabled || !summary || summary === previous.current || !("speechSynthesis" in window)) return;
    previous.current = summary;
    const sentence = summary.slice(0, 280);
    const utterance = new SpeechSynthesisUtterance(sentence);
    utterance.rate = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    return () => window.speechSynthesis.cancel();
  }, [enabled, summary]);
  return null;
}
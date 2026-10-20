import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useStudio } from "@/lib/scene/store";
export function VoiceConsent() {
  const open = useStudio(s => s.voiceConsentOpen);
  return <Dialog open={open} onOpenChange={value => { if (!value) useStudio.getState().declineVoiceConsent(); }}><DialogContent>
    <DialogTitle>Before you use voice</DialogTitle>
    <DialogDescription>Your recording is sent to an AI transcription service. Your transcript, selected object and world layout are sent to an AI service to propose edits. Nothing is applied without your review.</DialogDescription>
    <p className="text-sm text-muted-foreground">Recording starts only after you choose Speak. Finish stops the microphone. You can edit without using voice.</p>
    <Link to="/privacy" className="text-sm text-accent underline">Privacy details</Link>
    <div className="flex flex-wrap gap-2"><Button variant="signal" onClick={() => useStudio.getState().acceptVoiceConsent()}>I agree</Button><Button variant="tool" onClick={() => useStudio.getState().declineVoiceConsent()}>Not now</Button></div>
  </DialogContent></Dialog>;
}
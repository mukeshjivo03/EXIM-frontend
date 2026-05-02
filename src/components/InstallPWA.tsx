import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, Share } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const InstallPWA = () => {
  const { isLoggedIn } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) {
      setIsVisible(false);
      return;
    }

    const shouldShowAfterLogin = sessionStorage.getItem("pwa-show-after-login") === "true";
    if (!shouldShowAfterLogin) {
      return;
    }

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      sessionStorage.removeItem("pwa-show-after-login");
      return;
    }

    // Detect iOS
    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = (window.navigator as any).standalone === true;
    
    if (isIosDevice && !isStandalone) {
      setIsIOS(true);
      setIsVisible(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Update UI notify the user they can install the PWA
      setIsVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Check if app was installed
    const handleInstalled = () => {
      setIsVisible(false);
      setDeferredPrompt(null);
      setIsInstalled(true);
      sessionStorage.removeItem("pwa-show-after-login");
      console.log("PWA was installed");
    };

    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, [isLoggedIn]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    await deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);

    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setIsVisible(false);
    sessionStorage.removeItem("pwa-show-after-login");
  };

  const dismiss = () => {
    setIsVisible(false);
    sessionStorage.removeItem("pwa-show-after-login");
  };

  if (!isVisible || isInstalled) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 safe-bottom z-50 animate-in fade-in slide-in-from-bottom-4 duration-500 sm:inset-x-4 sm:bottom-4 md:left-auto md:right-8 md:bottom-8 md:max-w-sm">
      <div className="bg-card border shadow-xl rounded-2xl p-4 sm:p-5">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="bg-primary/10 p-2.5 rounded-xl text-primary shrink-0">
            <Download className="size-5 sm:size-6" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm sm:text-base leading-5">Install JIVO EXIM</h3>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-5">
              {isIOS
                ? "Add this app to your Home Screen for a full-screen, faster experience."
                : "Install the app for a faster and better mobile experience."}
            </p>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={dismiss}
            aria-label="Dismiss install prompt"
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="mt-4">
          {isIOS ? (
            <div className="rounded-xl bg-accent/60 px-3 py-2.5 text-xs sm:text-sm text-accent-foreground">
              <p className="flex items-center gap-2">
                <Share className="size-4 shrink-0" />
                Tap Share, then choose "Add to Home Screen".
              </p>
            </div>
          ) : (
            <Button className="w-full h-10 sm:h-11 text-sm" onClick={handleInstallClick}>
              Install App
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstallPWA;

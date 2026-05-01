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
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-4 duration-500 md:left-auto md:right-8 md:bottom-8 md:max-w-sm">
      <div className="bg-card border shadow-lg rounded-xl p-4 flex items-center gap-4">
        <div className="bg-primary/10 p-2.5 rounded-lg text-primary">
          <Download className="size-6" />
        </div>
        
        <div className="flex-1">
          <h3 className="font-semibold text-sm">Install JIVO EXIM</h3>
          <p className="text-xs text-muted-foreground">
            {isIOS 
              ? "Tap the share button then 'Add to Home Screen'" 
              : "Install our app for a better experience"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isIOS ? (
             <div className="bg-accent p-2 rounded-md">
                <Share className="size-4" />
             </div>
          ) : (
            <Button size="sm" onClick={handleInstallClick}>
              Install
            </Button>
          )}
          <Button variant="ghost" size="icon-xs" onClick={dismiss}>
            <X className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InstallPWA;

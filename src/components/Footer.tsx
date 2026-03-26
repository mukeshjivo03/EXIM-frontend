const APP_VERSION = __APP_VERSION__;

export default function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background dark:bg-card">
      <div className="mx-auto flex h-12 max-w-7xl items-center justify-center gap-2 px-4 text-sm text-muted-foreground">
        <span>&copy; {new Date().getFullYear()} EXIM. All rights reserved.</span>
        {APP_VERSION && (
          <>
            <span className="text-muted-foreground/40">&middot;</span>
            <span className="text-xs text-muted-foreground/60">v{APP_VERSION}</span>
          </>
        )}
      </div>
    </footer>
  );
}

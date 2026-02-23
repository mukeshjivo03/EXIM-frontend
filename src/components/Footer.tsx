export default function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background dark:bg-card">
      <div className="mx-auto flex h-12 max-w-7xl items-center justify-center px-4 text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} EXIM. All rights reserved.
      </div>
    </footer>
  );
}

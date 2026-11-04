import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/common/ui-bits";

const links = [
  { to: "/", label: "Home" },
  { to: "/how-it-works", label: "How It Works" },
  { to: "/about", label: "About" },
] as const;

export function PublicLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b bg-card/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {links.map((l) => (
              <Link key={l.to} to={l.to} activeOptions={{ exact: true }} className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[status=active]:text-primary data-[status=active]:bg-secondary">
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            <Button asChild variant="ghost" size="sm"><Link to="/technologist-login"><ShieldCheck />Technologist Login</Link></Button>
            <Button asChild size="sm"><Link to="/login">Student Login</Link></Button>
          </div>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu"><Menu /></Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <div className="mt-8 flex flex-col gap-1">
                {links.map((l) => (
                  <Link key={l.to} to={l.to} onClick={() => setOpen(false)} activeOptions={{ exact: true }} className="rounded-lg px-3 py-2.5 font-medium data-[status=active]:bg-secondary data-[status=active]:text-primary">{l.label}</Link>
                ))}
                <div className="my-3 border-t" />
                <Button asChild onClick={() => setOpen(false)}><Link to="/login">Student Login</Link></Button>
                <Button asChild variant="outline" onClick={() => setOpen(false)} className="mt-2"><Link to="/technologist-login"><ShieldCheck />Technologist Login</Link></Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t bg-card">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
          <div className="md:col-span-2">
            <Logo />
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">
              A digital practical report platform designed with the Petroleum Training Institute (PTI), Effurun, practical workbooks in mind. Independent prototype — not an official PTI service.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Explore</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link to="/" className="hover:text-foreground">Home</Link></li>
              <li><Link to="/how-it-works" className="hover:text-foreground">How It Works</Link></li>
              <li><Link to="/about" className="hover:text-foreground">About</Link></li>
              <li><Link to="/booklet-preview" className="hover:text-foreground">Report Booklet Preview</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Portals</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link to="/register" className="hover:text-foreground">Student Registration</Link></li>
              <li><Link to="/login" className="hover:text-foreground">Student Login</Link></li>
              <li><Link to="/technologist-login" className="hover:text-foreground">Technologist Login</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t py-5 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} PracTrack AI · Stage 1 prototype · Effurun, Delta State, Nigeria
        </div>
      </footer>
    </div>
  );
}

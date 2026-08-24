import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Menu, ShieldCheck, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const publicLinks = [
  { to: "/", label: "Home" },
  { to: "/dashboard", label: "Dashboard" },
] as const;

const dealerLinks = [
  { to: "/dealer", label: "Dealer Dashboard" },
  { to: "/my-products", label: "My Products" },
  { to: "/register-product", label: "Register Product" },
] as const;

export function Navbar() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    setOpen(false);
    navigate({ to: "/", replace: true });
  }

  const links = user ? [...publicLinks, ...dealerLinks] : publicLinks;

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/80 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
        <Link to="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <span className="btn btn-primary !p-2">
            <ShieldCheck className="size-5" />
          </span>
          <span className="font-display text-base font-bold sm:text-lg">
            Smart Product <span className="gradient-text">Detector</span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "!text-foreground bg-secondary" }}
              activeOptions={{ exact: link.to === "/" }}
            >
              {link.label}
            </Link>
          ))}
          {user ? (
            <button onClick={signOut} className="btn btn-ghost ml-2">
              Logout
            </button>
          ) : (
            <Link to="/auth" className="btn btn-primary ml-2">
              Login
            </Link>
          )}
        </div>

        <button
          className="btn btn-ghost !px-2.5 lg:hidden"
          aria-label="Toggle navigation"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-border px-5 pb-5 pt-3 lg:hidden">
          <div className="flex flex-col gap-1">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                activeProps={{ className: "!text-foreground bg-secondary" }}
                activeOptions={{ exact: link.to === "/" }}
              >
                {link.label}
              </Link>
            ))}
            {user ? (
              <button onClick={signOut} className="btn btn-ghost mt-2">
                Logout
              </button>
            ) : (
              <Link to="/auth" onClick={() => setOpen(false)} className="btn btn-primary mt-2">
                Login
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

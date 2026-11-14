import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";
import { publicNav } from "@/config/navigation";
import { getCurrentUser } from "@/lib/dal/session";
import { homePathFor } from "@/lib/auth/permissions";

export async function PublicHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-3 px-4 sm:gap-6 sm:px-6 lg:px-8">
        <Logo />
        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {publicNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="rounded-full px-3.5 py-2 text-[15px] font-medium text-ink hover:bg-canvas">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex-1" />
        {user ? (
          <ButtonLink href={homePathFor(user.role)} size="sm">
            {user.role === "student" ? "My learning" : "Dashboard"}
          </ButtonLink>
        ) : (
          <div className="flex items-center gap-1 sm:gap-2">
            <ButtonLink href="/login" variant="secondary" size="sm">Log in</ButtonLink>
            <ButtonLink href="/signup" size="sm">Sign up free</ButtonLink>
          </div>
        )}
      </div>
    </header>
  );
}

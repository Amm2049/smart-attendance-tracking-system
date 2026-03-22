import Link from "next/link";
import { requireProfessor } from "@/lib/auth/require-professor";
import { Button } from "@/components/ui/button";
import { ProfessorMobileNav } from "@/components/professor-mobile-nav";
import { ProfessorNav } from "@/components/professor-nav";
import { AppLogo } from "@/components/app-logo";

export default async function ProfessorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { professor, userEmail } = await requireProfessor();

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <header className="sticky py-2 top-0 z-20 border-b bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3 md:gap-6">
            <ProfessorMobileNav />
            <Link className="shrink-0" href="/dashboard">
              <AppLogo compact className="gap-2.5" />
            </Link>
            <ProfessorNav />
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground sm:inline">
              {professor ? professor.name : userEmail}
            </span>
            <form action="/logout" method="post">
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="shadow-sm transition-transform duration-200 hover:-translate-y-0.5"
              >
                Logout
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 md:py-6">
        {children}
      </main>
    </div>
  );
}

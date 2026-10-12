import { signIn } from "@/auth";
import { ThemeToggle } from "@/components/ThemeProvider";

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center">
      <ThemeToggle className="absolute right-5 top-5" />
      <div>
        <div className="brand-accent-rule mb-5 h-1 w-16 rounded-full" />
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/dashboard" });
          }}
        >
          <button
            type="submit"
            className="brand-action rounded-lg px-6 py-3 font-medium"
          >
            Continue with Google
          </button>
        </form>
      </div>
    </main>
  );
}
import { signIn } from "@/auth";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
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
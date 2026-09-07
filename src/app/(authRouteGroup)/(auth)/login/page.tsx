import LoginForm from "@/features/auth/components/LoginForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In — Pulse Messenger",
  description: "Sign in to access your Pulse Messenger workspace.",
};

interface LoginParams {
  searchParams: Promise<{ redirect?: string; email?: string }>;
}

const LoginPage = async ({ searchParams }: LoginParams) => {
  const params = await searchParams;
  const redirectPath = params.redirect;
  const defaultEmail = params.email || "";

  return (
    <div className="h-full w-full overflow-y-auto flex flex-col">
      <div className="m-auto w-full max-w-[440px] p-3 sm:p-6 py-6 sm:py-10 flex justify-center">
        <LoginForm 
          redirectPath={redirectPath}
          defaultEmail={defaultEmail}
        />
      </div>
    </div>
  );
};

export default LoginPage;
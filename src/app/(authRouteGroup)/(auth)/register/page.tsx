import RegisterForm from "@/features/auth/components/RegisterForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account — Pulse Messenger",
  description: "Create your workspace account on Pulse Messenger.",
};

export default function RegisterPage() {
  return (
    <div className="h-full w-full overflow-y-auto flex flex-col">
      <div className="m-auto w-full max-w-[460px] p-3 sm:p-6 py-6 sm:py-10 flex justify-center">
        <RegisterForm />
      </div>
    </div>
  );
}
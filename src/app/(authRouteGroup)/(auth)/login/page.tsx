import LoginForm from "@/features/auth/components/LoginForm";

interface LoginParams {
  searchParams: Promise<{ redirect?: string; email?: string }>;
}

const LoginPage = async ({ searchParams }: LoginParams) => {
  const params = await searchParams;
  const redirectPath = params.redirect;
  const defaultEmail = params.email || "";  // 👈 যোগ করা হয়েছে

  return (
    <LoginForm 
      redirectPath={redirectPath}
      defaultEmail={defaultEmail}  // 👈 যোগ করা হয়েছে
    />
  );
};

export default LoginPage;
import { Suspense } from "react";
import { AuthCollage } from "@/components/auth/AuthCollage";
import { SignInForm } from "./SignInForm";

export default function SignInPage() {
  return (
    <div className="flex h-[calc(100dvh-3.5rem)]">
      {/* Left: image collage — desktop only */}
      <div className="hidden lg:block lg:w-[55%] relative">
        <AuthCollage />
      </div>

      {/* Right: form */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-10 overflow-y-auto bg-[var(--background)]">
        <Suspense>
          <SignInForm />
        </Suspense>
      </div>
    </div>
  );
}

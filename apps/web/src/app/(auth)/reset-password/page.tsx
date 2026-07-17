"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { passwordSchema } from "@connecthub/shared-types";
import { useResetPassword } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";
import { FormAlert } from "@/components/ui/form-alert";

// Local form schema (just the password field — token comes from the URL, not user input)
const formSchema = z.object({ password: passwordSchema });
type FormInput = z.infer<typeof formSchema>;

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const resetPasswordMutation = useResetPassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormInput>({ resolver: zodResolver(formSchema) });

  const apiError = resetPasswordMutation.error instanceof ApiError ? resetPasswordMutation.error.message : null;

  if (!token) {
    return (
      <div className="text-center">
        <h2 className="text-lg font-semibold mb-2">Invalid link</h2>
        <p className="text-sm text-muted-foreground">
          This password reset link is missing a token. Request a new one below.
        </p>
        <Link href="/forgot-password" className="text-sm text-primary hover:underline mt-6 inline-block">
          Request a new link
        </Link>
      </div>
    );
  }

  if (resetPasswordMutation.isSuccess) {
    return (
      <div className="text-center">
        <h2 className="text-lg font-semibold mb-2">Password reset</h2>
        <p className="text-sm text-muted-foreground">Your password has been updated. You can now log in.</p>
        <Link href="/login" className="text-sm text-primary hover:underline mt-6 inline-block">
          Go to login
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1">Choose a new password</h2>
      <p className="text-sm text-muted-foreground mb-6">Make it strong — at least 8 characters with a mix of cases and numbers.</p>

      <form
        onSubmit={handleSubmit((data) => resetPasswordMutation.mutate({ token, password: data.password }))}
        className="space-y-4"
        noValidate
      >
        <FormAlert message={apiError} />

        <div>
          <Label htmlFor="password">New password</Label>
          <Input id="password" type="password" className="mt-1.5" invalid={!!errors.password} {...register("password")} />
          <FieldError message={errors.password?.message} />
        </div>

        <Button type="submit" className="w-full" isLoading={resetPasswordMutation.isPending}>
          Reset password
        </Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

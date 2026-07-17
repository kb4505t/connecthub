"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@connecthub/shared-types";
import { useForgotPassword } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";

export default function ForgotPasswordPage() {
  const forgotPasswordMutation = useForgotPassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  if (forgotPasswordMutation.isSuccess) {
    return (
      <div className="text-center">
        <h2 className="text-lg font-semibold mb-2">Check your email</h2>
        <p className="text-sm text-muted-foreground">
          If an account exists for that address, we&apos;ve sent a link to reset your password.
        </p>
        <Link href="/login" className="text-sm text-primary hover:underline mt-6 inline-block">
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1">Reset your password</h2>
      <p className="text-sm text-muted-foreground mb-6">Enter your email and we&apos;ll send you a reset link.</p>

      <form onSubmit={handleSubmit((data) => forgotPasswordMutation.mutate(data))} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" className="mt-1.5" invalid={!!errors.email} {...register("email")} />
          <FieldError message={errors.email?.message} />
        </div>

        <Button type="submit" className="w-full" isLoading={forgotPasswordMutation.isPending}>
          Send reset link
        </Button>
      </form>

      <p className="text-sm text-muted-foreground text-center mt-6">
        <Link href="/login" className="text-primary hover:underline">
          Back to login
        </Link>
      </p>
    </div>
  );
}

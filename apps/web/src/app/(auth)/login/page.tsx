"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@connecthub/shared-types";
import { useLogin } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";
import { FormAlert } from "@/components/ui/form-alert";

export default function LoginPage() {
  const router = useRouter();
  const loginMutation = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = (data: LoginInput) => {
    loginMutation.mutate(data, {
      onSuccess: () => router.push("/"),
    });
  };

  const apiError = loginMutation.error instanceof ApiError ? loginMutation.error.message : null;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1">Welcome back</h2>
      <p className="text-sm text-muted-foreground mb-6">Log in to your ConnectHub account.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormAlert message={apiError} />

        <div>
          <Label htmlFor="identifier">Email or username</Label>
          <Input id="identifier" className="mt-1.5" invalid={!!errors.identifier} {...register("identifier")} />
          <FieldError message={errors.identifier?.message} />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="text-xs text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <Input id="password" type="password" className="mt-1.5" invalid={!!errors.password} {...register("password")} />
          <FieldError message={errors.password?.message} />
        </div>

        <Button type="submit" className="w-full" isLoading={loginMutation.isPending}>
          Log in
        </Button>
      </form>

      <p className="text-sm text-muted-foreground text-center mt-6">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-primary hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}

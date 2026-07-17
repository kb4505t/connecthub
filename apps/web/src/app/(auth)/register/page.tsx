"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterInput } from "@connecthub/shared-types";
import { useRegister } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";
import { FormAlert } from "@/components/ui/form-alert";

export default function RegisterPage() {
  const router = useRouter();
  const registerMutation = useRegister();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const onSubmit = (data: RegisterInput) => {
    registerMutation.mutate(data, {
      onSuccess: () => router.push("/"),
    });
  };

  const apiError = registerMutation.error instanceof ApiError ? registerMutation.error.message : null;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1">Create your account</h2>
      <p className="text-sm text-muted-foreground mb-6">Join ConnectHub and start connecting.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormAlert message={apiError} />

        <div>
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" className="mt-1.5" placeholder="Jane Doe" {...register("fullName")} />
          <FieldError message={errors.fullName?.message} />
        </div>

        <div>
          <Label htmlFor="username">Username</Label>
          <Input id="username" className="mt-1.5" placeholder="janedoe" invalid={!!errors.username} {...register("username")} />
          <FieldError message={errors.username?.message} />
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            className="mt-1.5"
            placeholder="jane@example.com"
            invalid={!!errors.email}
            {...register("email")}
          />
          <FieldError message={errors.email?.message} />
        </div>

        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" className="mt-1.5" invalid={!!errors.password} {...register("password")} />
          <FieldError message={errors.password?.message} />
        </div>

        <Button type="submit" className="w-full" isLoading={registerMutation.isPending}>
          Create account
        </Button>
      </form>

      <p className="text-sm text-muted-foreground text-center mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}

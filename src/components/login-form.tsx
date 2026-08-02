"use client";

import { useServerFn } from "@tanstack/react-start";
import { useState, useTransition } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { signInFn, signUpFn, type AuthResult } from "~/lib/functions/auth";

type AuthError = Extract<AuthResult, { error: unknown }>["error"] | "";

const inputClassName =
  "relative block w-full appearance-none rounded-[1px] border px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-orange-500 focus:outline-none focus:ring-orange-500 sm:text-sm";

export function LoginForm() {
  const signIn = useServerFn(signInFn);
  const signUp = useServerFn(signUpFn);
  const [error, setError] = useState<AuthError>("");
  const [pending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const username = String(formData.get("username") ?? "");
    const password = String(formData.get("password") ?? "");
    const submitter = (e.nativeEvent as SubmitEvent).submitter as
      | HTMLButtonElement
      | null;
    const action = submitter?.value === "sign-up" ? signUp : signIn;

    startTransition(async () => {
      const result = await action({ data: { username, password } });
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      setError("");
      // The original relied on Next.js re-rendering the server-driven header
      // after the action; do a full reload so the auth state shows everywhere.
      window.location.reload();
    });
  };

  return (
    <form className="flex flex-col space-y-6" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-4">
        <div className="mt-1">
          <Input
            id="username"
            name="username"
            aria-label="Username"
            type="text"
            autoCapitalize="off"
            autoComplete="username"
            spellCheck={false}
            required
            maxLength={50}
            className={inputClassName}
            placeholder="Username"
          />
        </div>

        <div>
          <div className="mt-1">
            <Input
              id="password"
              name="password"
              aria-label="Password"
              type="password"
              required
              maxLength={100}
              className={inputClassName}
              placeholder="Password"
            />
          </div>
        </div>

        <Button
          type="submit"
          name="intent"
          value="sign-in"
          className="rounded-[1px] bg-accent1 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-accent1 focus:outline-none focus:ring-2 focus:ring-accent1 focus:ring-offset-2"
          disabled={pending}
        >
          {"Log in"}
        </Button>

        <Button
          type="submit"
          name="intent"
          value="sign-up"
          variant={"ghost"}
          className="rounded-[2px] border-[1px] border-accent1 bg-white px-4 py-2 text-xs font-semibold text-accent1"
          disabled={pending}
        >
          {"Create login"}
        </Button>
      </div>
      {error && (
        <div className="text-sm text-red-500">
          {typeof error === "string" ? error : error.message}
        </div>
      )}
    </form>
  );
}

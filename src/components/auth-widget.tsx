"use client";

import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, useTransition } from "react";
import { LoginForm } from "~/components/login-form";
import { Button } from "~/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { getUserFn, signOutFn } from "~/lib/functions/auth";

type AuthUser = { id: number; username: string };

function Caret() {
  return (
    <svg viewBox="0 0 10 6" className="h-[6px] w-[10px]">
      <polygon points="0,0 5,6 10,0"></polygon>
    </svg>
  );
}

export function AuthWidget() {
  const getUser = useServerFn(getUserFn);
  // undefined = not yet loaded (render the fixed-size placeholder so there is
  // zero layout shift), null = signed out, object = signed in.
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    void getUser()
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (user === undefined) {
    return (
      <button className="flex flex-row items-center gap-1" type="button">
        <div className="h-[20px]" />
        <Caret />
      </button>
    );
  }

  if (!user) {
    return <SignInSignUp />;
  }
  return <SignOut username={user.username} />;
}

function SignInSignUp() {
  return (
    <Popover>
      <PopoverTrigger className="flex flex-row items-center gap-1">
        Log in <Caret />
      </PopoverTrigger>
      <PopoverContent className="px-8 py-4">
        <span className="text-sm font-semibold text-accent1">Log in</span>
        <LoginForm />
      </PopoverContent>
    </Popover>
  );
}

function SignOut(props: { username: string }) {
  const signOut = useServerFn(signOutFn);
  const [pending, startTransition] = useTransition();

  return (
    <Popover>
      <PopoverTrigger className="flex flex-row items-center gap-1">
        {props.username} <Caret />
      </PopoverTrigger>
      <PopoverContent className="flex w-32 flex-col items-center px-8 py-4">
        <Button
          type="button"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              await signOut();
              window.location.assign("/");
            });
          }}
          variant={"ghost"}
          className="rounded-[2px] border-[1px] border-accent1 bg-white px-4 py-2 text-xs font-semibold text-accent1"
        >
          {"Sign Out"}
        </Button>
      </PopoverContent>
    </Popover>
  );
}

"use client";

import { useEffect } from "react";
import { toast } from "sonner";

export function WelcomeToast() {
  useEffect(() => {
    // ignore if screen height is too small
    if (window.innerHeight < 850) return;
    if (localStorage.getItem("welcome-toast") !== "3") {
      toast("🚀 Welcome to TanFaster!", {
        id: "welcome-toast",
        duration: Infinity,
        onDismiss: () => {
          localStorage.setItem("welcome-toast", "3");
        },
        description: (
          <>
            This is a highly performant e-commerce template using TanStack
            Start. All of the 1M products on this site are AI generated.
            <hr className="my-2" />
            This demo is to highlight the speed a full-stack TanStack Start
            site can achieve.{" "}
            <a
              href="https://github.com/exemplary-citizen/tanfaster"
              className="font-semibold text-accent1 hover:underline"
              target="_blank"
            >
              Get the Source
            </a>
            .
          </>
        ),
      });
    }
  }, []);

  return null;
}

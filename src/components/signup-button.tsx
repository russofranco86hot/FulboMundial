"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { signupAction, withdrawAction } from "@/app/actions";
import { UserPlus, UserMinus, Loader2 } from "lucide-react";

export function SignupButton({
  signedUp,
  disabled,
  groupId,
  groupSlug,
}: {
  signedUp: boolean;
  disabled?: boolean;
  groupId?: number;
  groupSlug?: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function act() {
    if (!groupId || !groupSlug) return;
    startTransition(async () => {
      const res = signedUp
        ? await withdrawAction(groupId, groupSlug)
        : await signupAction(groupId, groupSlug);
      if (!res.ok && res.error) alert(res.error);
      router.refresh();
    });
  }

  if (signedUp) {
    return (
      <button
        onClick={act}
        disabled={pending || disabled}
        className="btn-danger w-full text-lg flex items-center justify-center gap-2"
      >
        {pending ? (
          <Loader2 className="animate-spin" size={20} />
        ) : (
          <>
            <UserMinus size={20} />
            Darme de baja
          </>
        )}
      </button>
    );
  }
  return (
    <button
      onClick={act}
      disabled={pending || disabled}
      className="btn-primary w-full text-lg flex items-center justify-center gap-2"
    >
      {pending ? (
        <Loader2 className="animate-spin" size={20} />
      ) : (
        <>
          <UserPlus size={20} />
          Anotarme ⚽
        </>
      )}
    </button>
  );
}

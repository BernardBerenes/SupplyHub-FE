"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";

export type ConfirmDialogHandle = {
  confirm: (message: string) => Promise<boolean>;
};

export const ConfirmDialog = forwardRef<ConfirmDialogHandle>(function ConfirmDialog(_props, ref) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [message, setMessage] = useState("");
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  useImperativeHandle(ref, () => ({
    confirm(msg: string) {
      setMessage(msg);
      dialogRef.current?.showModal();
      return new Promise<boolean>((resolve) => {
        resolveRef.current = resolve;
      });
    },
  }));

  function answer(result: boolean) {
    dialogRef.current?.close();
    resolveRef.current?.(result);
    resolveRef.current = null;
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={() => answer(false)}
      className="fixed top-1/2 left-1/2 m-0 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-6 text-card-foreground"
    >
      <p className="text-sm text-card-foreground">{message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => answer(false)}
          className="cursor-pointer rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => answer(true)}
          className="cursor-pointer rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-white transition-transform active:scale-[0.98] hover:bg-destructive/90"
        >
          Delete
        </button>
      </div>
    </dialog>
  );
});

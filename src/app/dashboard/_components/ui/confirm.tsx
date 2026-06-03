"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { Modal } from "./modal";
import { Button } from "./button";

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

const Ctx = createContext<((opts: ConfirmOptions) => Promise<boolean>) | null>(null);

/** Promise-based confirm dialog — `if (await confirm({...})) { ... }`. Replaces window.confirm. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const confirm = useCallback((o: ConfirmOptions) => {
    setOpts(o);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  function close(ok: boolean) {
    resolver.current?.(ok);
    resolver.current = null;
    setOpts(null);
  }

  return (
    <Ctx.Provider value={confirm}>
      {children}
      <Modal
        open={opts !== null}
        onClose={() => close(false)}
        title={opts?.title ?? "Are you sure?"}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => close(false)}>
              Cancel
            </Button>
            <Button
              variant={opts?.danger ? "danger" : "primary"}
              size="sm"
              onClick={() => close(true)}
            >
              {opts?.confirmLabel ?? "Confirm"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">{opts?.message}</p>
      </Modal>
    </Ctx.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}

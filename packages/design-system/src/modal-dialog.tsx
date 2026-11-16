"use client";

import { useEffect, useId, useRef, type ReactNode, type SyntheticEvent } from "react";

/**
 * Browser-native modal for a short, consequential task.
 * showModal() makes the rest of the document inert and provides focus containment.
 * Never use this to claim a server mutation succeeded; pass verified status in children.
 */
export function ModalDialog({
  open,
  onDismiss,
  title,
  description,
  children,
  actions,
}: Readonly<{
  open: boolean;
  onDismiss: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
}>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const labelId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
      if (previousFocus.current?.isConnected) previousFocus.current.focus();
    }
    return () => {
      if (dialog.open) dialog.close();
      if (open && previousFocus.current?.isConnected) previousFocus.current.focus();
    };
  }, [open]);

  const handleCancel = (event: SyntheticEvent<HTMLDialogElement>) => {
    event.preventDefault();
    onDismiss();
  };

  return <dialog
    ref={dialogRef}
    className="np-dialog np-modal-dialog"
    aria-labelledby={labelId}
    aria-describedby={description ? descriptionId : undefined}
    onCancel={handleCancel}>
    <header className="np-modal-dialog__header">
      <h2 id={labelId}>{title}</h2>
      <button type="button" className="np-modal-dialog__dismiss" onClick={onDismiss} aria-label={`Close ${title}`}>Close</button>
    </header>
    {description ? <p id={descriptionId}>{description}</p> : null}
    <div className="np-modal-dialog__body">{children}</div>
    {actions ? <footer className="np-modal-dialog__actions">{actions}</footer> : null}
  </dialog>;
}

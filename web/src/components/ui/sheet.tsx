import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

import buttons from "./button.module.css";
import s from "./sheet.module.css";

/** A dialog that slides in from the right */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className={s.backdrop} />
        <Dialog.Popup className={s.popup}>
          <div className={s.head}>
            <div>
              <Dialog.Title className={s.title}>{title}</Dialog.Title>
              {description && (
                <Dialog.Description className={s.description}>{description}</Dialog.Description>
              )}
            </div>
            <Dialog.Close className={`${buttons.button} ${buttons.icon}`} aria-label="Close">
              <X size={16} />
            </Dialog.Close>
          </div>
          <div className={s.body}>{children}</div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

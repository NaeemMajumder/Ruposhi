'use client';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/format';

/** Accessible slide-in panel (focus trap, Esc to close, scroll lock) built on Radix Dialog. */
export function Sheet({
  open, onOpenChange, title, side = 'right', children, footer, className, description,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  side?: 'right' | 'left' | 'bottom';
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  description?: string;
}) {
  const pos =
    side === 'right'
      ? 'right-0 top-0 h-dvh w-full max-w-[440px] data-[state=open]:animate-[slideInR_.45s_var(--ease-silk)] data-[state=closed]:animate-[slideOutR_.3s_var(--ease-in-soft)_forwards]'
      : side === 'left'
        ? 'left-0 top-0 h-dvh w-[88%] max-w-[380px] data-[state=open]:animate-[slideInL_.45s_var(--ease-silk)] data-[state=closed]:animate-[slideOutL_.3s_var(--ease-in-soft)_forwards]'
        : 'bottom-0 left-0 max-h-[88dvh] w-full rounded-t-3xl data-[state=open]:animate-[slideInB_.45s_var(--ease-silk)] data-[state=closed]:animate-[slideOutB_.3s_var(--ease-in-soft)_forwards]';
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-night/50 backdrop-blur-[2px] data-[state=open]:animate-fade data-[state=closed]:animate-[fadeOut_.3s_ease_forwards]" />
        <Dialog.Content className={cn('fixed z-[61] flex flex-col bg-cream shadow-2xl outline-none', pos, className)}>
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <Dialog.Title className="font-display text-2xl font-medium">{title}</Dialog.Title>
            <Dialog.Close className="grid h-11 w-11 place-items-center rounded-full hover:bg-sand" aria-label="Close">
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">{description ?? title}</Dialog.Description>
          <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
          {footer && <div className="border-t border-line bg-surface px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function Modal({ open, onOpenChange, title, children, wide }: { open: boolean; onOpenChange: (v: boolean) => void; title: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-night/55 backdrop-blur-[2px] data-[state=open]:animate-fade data-[state=closed]:animate-[fadeOut_.3s_ease_forwards]" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-[71] max-h-[90dvh] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl bg-cream p-6 shadow-2xl outline-none data-[state=open]:animate-scale-in data-[state=closed]:animate-[scaleOut_.22s_var(--ease-in-soft)_forwards] sm:p-8',
            wide ? 'max-w-3xl' : 'max-w-lg',
          )}
        >
          <div className="mb-5 flex items-start justify-between gap-4">
            <Dialog.Title className="font-display text-3xl font-medium leading-tight">{title}</Dialog.Title>
            <Dialog.Close className="-mr-2 -mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-sand" aria-label="Close">
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">{title}</Dialog.Description>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

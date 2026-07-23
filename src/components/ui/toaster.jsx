import { useToast } from "@/components/ui/use-toast";
import SwipeableToast from "@/components/ui/SwipeableToast";
import { ToastProvider, ToastViewport } from "@/components/ui/toast";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <ToastProvider swipeDirection="down">
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <SwipeableToast
            key={id}
            id={id}
            title={title}
            description={description}
            action={action}
            dismiss={dismiss}
            {...props}
          />
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
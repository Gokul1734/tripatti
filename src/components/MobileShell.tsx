import { ReactNode } from 'react';

interface MobileShellProps {
  children: ReactNode;
}

export default function MobileShell({ children }: MobileShellProps) {
  return (
    <div className="mx-auto flex min-h-screen max-w-[430px] flex-col bg-background">
      {children}
    </div>
  );
}

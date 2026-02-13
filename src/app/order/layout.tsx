import { CashfreeScript } from "@/components/CashfreeScript";

export default function OrderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <CashfreeScript />
      {children}
    </>
  );
}

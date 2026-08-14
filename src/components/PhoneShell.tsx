export default function PhoneShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#efefef]">
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-white shadow-[0_0_40px_rgba(0,0,0,0.06)]">
        {children}
      </div>
    </div>
  );
}

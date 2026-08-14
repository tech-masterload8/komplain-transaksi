import Link from "next/link";

export function CircleIconButton({
  href,
  onClick,
  children,
  dark = true,
}: {
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
  dark?: boolean;
}) {
  const className = `inline-flex h-11 w-11 items-center justify-center rounded-full ${
    dark ? "bg-black text-white" : "bg-zinc-100 text-black"
  }`;
  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  );
}

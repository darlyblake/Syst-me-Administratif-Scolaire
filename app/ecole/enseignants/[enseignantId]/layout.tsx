export function generateStaticParams() {
  return [{ enseignantId: "default" }];
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

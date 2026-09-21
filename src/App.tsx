import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function App() {
  const [count, setCount] = useState(0);
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-6 p-8">
      <h1 className="text-4xl font-semibold tracking-tight">A place to begin</h1>
      <p className="text-base text-muted-foreground">Shape this page around what you want to do.</p>
      <div><Button onClick={() => setCount((value) => value + 1)}>Try an interaction</Button></div>
      <p role="status">{count === 0 ? "Ready when you are." : `Clicked ${count} times.`}</p>
    </main>
  );
}

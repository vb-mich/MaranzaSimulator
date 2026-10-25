import { TESTI } from '../data/testi';

export default function App() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-3xl font-black tracking-tight">{TESTI.titolo}</h1>
      <p className="text-sm uppercase tracking-widest text-fuchsia-400">{TESTI.sottotitolo}</p>
      <p className="text-neutral-400">{TESTI.avviso}</p>
    </main>
  );
}

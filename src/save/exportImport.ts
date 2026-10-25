// Save export/import as a JSON file (playtest: move a run between devices, attach it to a bug).

import { leggiImport, type Salvataggio } from './SaveAdapter';

export function nomeFile(s: Salvataggio): string {
  const nome = s.stato.nome.replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 24) || 'run';
  return `maranza-${nome}-giorno${s.stato.giorno + 1}.json`;
}

export function esporta(s: Salvataggio): void {
  const blob = new Blob([JSON.stringify(s)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nomeFile(s);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** Opens the file picker and resolves with the save inside, or null. */
export function scegliFile(): Promise<Salvataggio | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = async () => {
      const f = input.files?.[0];
      resolve(f ? leggiImport(await f.text()) : null);
    };
    input.click();
  });
}

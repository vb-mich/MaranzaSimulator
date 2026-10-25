import { useEffect } from 'react';
import { Paracadute } from './componenti/Paracadute';
import { Toasts } from './componenti/Toasts';
import { GiocoProvider, useGioco } from './gioco/contesto';
import { Cella } from './schermate/Cella';
import { Crea } from './schermate/Crea';
import { CartaEsito } from './schermate/Esiti';
import { Evento } from './schermate/Evento';
import { Fine } from './schermate/Fine';
import { Inizio } from './schermate/Inizio';
import { Principale } from './schermate/Principale';
import { Tribunale } from './schermate/Tribunale';

function Schermo() {
  const { ui } = useGioco();
  const s = ui.partita;
  const carta = ui.carte[0];

  // every new screen starts from the top
  const chiave = s ? `${ui.schermo}-${s.giorno}-${s.modo}-${s.attesa?.tipo ?? ''}` : ui.schermo;
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [chiave, carta]);

  if (ui.schermo === 'inizio' || (ui.schermo === 'gioco' && !s)) return <Inizio />;
  if (ui.schermo === 'crea') return <Crea />;
  if (!s) return <Inizio />;
  if (carta) return <CartaEsito carta={carta} s={s} />;
  if (s.modo === 'fine') return <Fine s={s} />;
  if (s.attesa?.tipo === 'TRIBUNALE') return <Tribunale s={s} />;
  if (s.attesa?.tipo === 'EVENTO') return <Evento s={s} />;
  if (s.modo === 'galera' || s.modo === 'ospedale') return <Cella s={s} />;
  return <Principale s={s} />;
}

export default function App() {
  return (
    <Paracadute>
      <GiocoProvider>
        <Schermo />
        <Toasts />
      </GiocoProvider>
    </Paracadute>
  );
}

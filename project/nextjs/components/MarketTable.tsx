import Link from 'next/link';
import { fmtChg, fmtPrice, type Coin } from '@/lib/data';

export function CoinBadge({ sym }: { sym: string }) {
  return <span className="flex h-8 w-8 flex-none items-center justify-center bg-ink text-[11px] font-extrabold text-bg">{sym.slice(0, 3)}</span>;
}

const cols = 'grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,0.9fr)_88px] md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_110px] items-center gap-3';

export default function MarketTable({ coins }: { coins: Coin[] }) {
  return (
    <div className="border-t-2 border-ink">
      <div className={`${cols} border-b-2 border-ink py-3 text-xs font-extrabold tracking-wider text-muted`}>
        <span>PAAR</span><span className="text-right">KURS</span><span className="text-right">24H</span>
        <span className="hidden text-right md:block">VOLUMEN 24H</span><span />
      </div>
      {coins.length === 0 && <p className="py-6 text-muted">Kein Treffer.</p>}
      {coins.map(c => (
        <div key={c.sym} className={`${cols} border-b border-line py-3.5`}>
          <div className="flex min-w-0 items-center gap-3">
            <CoinBadge sym={c.sym} />
            <div className="flex min-w-0 flex-col">
              <strong className="text-[15px]">{c.sym}<span className="font-normal text-muted">/USDT</span></strong>
              <span className="truncate text-[13px] text-muted">{c.name}</span>
            </div>
          </div>
          <span className="text-right font-semibold tabular-nums">{fmtPrice(c.price)}</span>
          <span className={`text-right font-semibold tabular-nums ${c.chg >= 0 ? 'text-up' : 'text-down'}`}>{fmtChg(c.chg)}</span>
          <span className="hidden text-right tabular-nums text-muted md:block">{c.vol}</span>
          <div className="flex justify-end">
            <Link href={`/trade?pair=${c.sym}`} className="border-2 border-ink px-3 py-1.5 text-sm font-semibold !text-ink hover:border-accent hover:bg-accent hover:!text-white">Handeln</Link>
          </div>
        </div>
      ))}
    </div>
  );
}

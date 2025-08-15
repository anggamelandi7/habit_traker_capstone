import { useEffect, useState } from 'react';
import { getLedgerSummary } from '../api/rewards';

export default function HeaderBalance() {
  const [balance, setBalance] = useState(0);
  const [next, setNext] = useState(null);
  const [claimable, setClaimable] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getLedgerSummary();
        if (!mounted) return;
        const sum = data?.summary || {};
        setBalance(sum.totalBalance ?? 0);
        setNext(sum.rewardProgress?.nextTarget || null);
        setClaimable(sum.rewardProgress?.bestClaimable || null);
      } catch (_) {}
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <div style={{display:'flex', gap:12, alignItems:'center'}}>
      <strong>Poin: {balance}</strong>
      {claimable && <span style={{padding:'2px 8px', borderRadius:8, background:'#e6ffed', border:'1px solid #b7eb8f'}}>Bisa diklaim: {claimable.name}</span>}
      {!claimable && next && (
        <span style={{padding:'2px 8px', borderRadius:8, background:'#f0f5ff', border:'1px solid #adc6ff'}}>
          Menuju {next.name}: {next.progressPercent}% ({next.remainingPoints} lagi)
        </span>
      )}
    </div>
  );
}

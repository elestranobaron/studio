'use client';

import { useCollection, useFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { LoaderCircle } from 'lucide-react';
import Link from 'next/link';

interface HallOfFameEntry {
  rank: number;
  displayName: string;
  uid: string;
}

export default function HallOfFamePage() {
  const { firestore } = useFirebase();
  const ogsCollection = collection(firestore, 'hallOfFame');
  const ogsQuery = query(ogsCollection, orderBy('rank', 'asc'));
  const { data: ogs, isLoading } = useCollection<HallOfFameEntry>(ogsQuery);

  const ogCount = ogs?.length ?? 0;

  return (
    <div className="font-sans bg-[#111] text-white text-center p-10 min-h-screen">
      <h1 className="text-5xl font-bold mb-5">🏆 WodBurner Hall of Fame 🏆</h1>
      <p className="text-xl">The First 300 OGs – FREE FOR LIFE</p>

      {isLoading ? (
        <div className="flex justify-center items-center my-10">
          <LoaderCircle className="h-16 w-16 animate-spin text-[#00ff00]" />
        </div>
      ) : (
        <>
          <div className="text-7xl font-bold text-[#00ff00] my-10">{ogCount} / 300</div>
          <p className="text-2xl text-[#ff3300]">(Spots moving fast – when 300/300 = closed forever)</p>
        </>
      )}

      <div className="mt-16 text-2xl leading-loose max-w-md mx-auto">
        {isLoading && !ogs ? (
            <div className="space-y-4">
                <div className="h-8 bg-gray-700 rounded w-3/4 mx-auto animate-pulse"></div>
                <div className="h-8 bg-gray-700 rounded w-2/3 mx-auto animate-pulse"></div>
                <div className="h-8 bg-gray-700 rounded w-3/4 mx-auto animate-pulse"></div>
            </div>
        ) : (
           ogs?.map(og => (
             <div key={og.uid} className="text-[#ffd700] font-bold">
               #{og.rank} @{og.displayName}
             </div>
           ))
        )}
        
        <br /><br />
        <p className="text-white">Tu seras ici pour toujours si tu fais partie des 300 premiers Premium annuels 🔥</p>
      </div>

      <p className="mt-10">
        <Link href="/premium" className="text-[#00ff00] text-2xl hover:underline">
          → Claim your spot now
        </Link>
      </p>
    </div>
  );
}

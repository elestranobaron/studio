
import type { WOD } from './types';

// A selection of famous CrossFit Hero WODs
export const heroWods: WOD[] = [
  {
    id: 'hero-murph',
    name: 'Murph',
    type: 'For Time',
    date: 'Memorial Day',
    description: [
      { title: 'In memory of Navy Lieutenant Michael Murphy, 29, of Patchogue, N.Y., who was killed in Afghanistan June 28th, 2005.', content: ''},
      { title: 'For Time', content: '1 mile Run\n100 Pull-ups\n200 Push-ups\n300 Squats\n1 mile Run' },
      { title: 'Notes', content: 'Partition the pull-ups, push-ups, and squats as needed. If you have a 20 lb vest, wear it.' }
    ],
    imageUrl: 'https://picsum.photos/seed/hero-murph/800/600',
    imageHint: 'soldier running',
    userId: 'system',
    userDisplayName: 'CrossFit HQ',
  },
  {
    id: 'hero-fran',
    name: 'Fran',
    type: 'For Time',
    date: 'Benchmark',
    description: [
        { title: 'One of the original "Girls" WODs, a benchmark to test progress.', content: ''},
        { title: '21-15-9 Reps For Time', content: 'Thrusters (95/65 lb)\nPull-ups' },
    ],
    imageUrl: 'https://picsum.photos/seed/hero-fran/800/600',
    imageHint: 'barbell thruster',
    userId: 'system',
    userDisplayName: 'CrossFit HQ',
  },
  {
    id: 'hero-cindy',
    name: 'Cindy',
    type: 'AMRAP',
    duration: 20,
    date: 'Benchmark',
    description: [
        { title: 'Another "Girls" WOD, a classic test of gymnastic endurance.', content: ''},
        { title: 'AMRAP in 20 Minutes', content: '5 Pull-ups\n10 Push-ups\n15 Squats' },
    ],
    imageUrl: 'https://picsum.photos/seed/hero-cindy/800/600',
    imageHint: 'pull-up bar',
    userId: 'system',
    userDisplayName: 'CrossFit HQ',
  },
  {
    id: 'hero-dt',
    name: 'DT',
    type: 'For Time',
    date: 'Hero WOD',
    description: [
        { title: 'In honor of USAF SSgt Timothy P. Davis, 28, who was killed on Feburary, 20 2009 supporting operations in OEF when his vehicle was struck by an IED.', content: ''},
        { title: '5 Rounds For Time', content: '12 Deadlifts (155/105 lb)\n9 Hang Power Cleans (155/105 lb)\n6 Push Jerks (155/105 lb)' },
    ],
    imageUrl: 'https://picsum.photos/seed/hero-dt/800/600',
    imageHint: 'barbell clean',
    userId: 'system',
    userDisplayName: 'CrossFit HQ',
  },
];

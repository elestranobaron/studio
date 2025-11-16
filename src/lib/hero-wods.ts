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
    imageUrl: 'system-letter', // Identifier for HeroLetter component
    userId: 'system',
    userDisplayName: 'CrossFit HQ',
    isPremium: false,
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
    imageUrl: 'system-letter',
    userId: 'system',
    userDisplayName: 'CrossFit HQ',
    isPremium: false,
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
    imageUrl: 'system-letter',
    userId: 'system',
    userDisplayName: 'CrossFit HQ',
    isPremium: false,
  },
  {
    id: 'hero-dt',
    name: 'DT',
    type: 'For Time',
    date: 'Hero WOD',
    description: [
        { title: 'In honor of USAF SSgt Timothy P. Davis, 28, who was killed on Feburary, 20 2009.', content: ''},
        { title: '5 Rounds For Time', content: '12 Deadlifts (155/105 lb)\n9 Hang Power Cleans (155/105 lb)\n6 Push Jerks (155/105 lb)' },
    ],
    imageUrl: 'system-letter',
    userId: 'system',
    userDisplayName: 'CrossFit HQ',
    isPremium: false,
  },
  {
    id: 'hero-ryan',
    name: 'Ryan',
    type: 'For Time',
    date: 'Hero WOD',
    description: [
      { title: 'In honor of firefighter Ryan Hummert, 22, of Maplewood, MO, who was killed by sniper fire July 21st, 2008.', content: '' },
      { title: '5 Rounds For Time', content: '7 Muscle-ups\n21 Burpees' }
    ],
    imageUrl: 'system-letter',
    userId: 'system',
    userDisplayName: 'CrossFit HQ',
    isPremium: true,
  },
  {
    id: 'hero-randy',
    name: 'Randy',
    type: 'For Time',
    date: 'Hero WOD',
    description: [
      { title: 'In honor of LAPD Officer Randy Simmons, 51, who was killed February 7, 2008, in the line of duty.', content: '' },
      { title: 'For Time', content: '75 Power Snatches (75/55 lb)' }
    ],
    imageUrl: 'system-letter',
    userId: 'system',
    userDisplayName: 'CrossFit HQ',
    isPremium: true,
  },
  {
    id: 'hero-jt',
    name: 'J.T.',
    type: 'For Time',
    date: 'Hero WOD',
    description: [
      { title: 'In honor of Petty Officer 1st Class Jeff Taylor, 30, of Little Creek, VA, who was killed in Afghanistan.', content: '' },
      { title: '21-15-9 Reps For Time', content: 'Handstand Push-ups\nRing Dips\nPush-ups' }
    ],
    imageUrl: 'system-letter',
    userId: 'system',
    userDisplayName: 'CrossFit HQ',
    isPremium: true,
  },
  {
    id: 'hero-hotshots-19',
    name: 'Hotshots 19',
    type: 'For Time',
    date: 'Hero WOD',
    description: [
      { title: 'In honor of the 19 members of the Granite Mountain Hotshots crew who gave their lives on June 30, 2013, while fighting a fire in Yarnell, Arizona.', content: '' },
      { title: '6 Rounds For Time', content: '30 Squats\n19 Power Cleans (135/95 lb)\n7 Strict Pull-ups\n400 meter Run' }
    ],
    imageUrl: 'system-letter',
    userId: 'system',
    userDisplayName: 'CrossFit HQ',
    isPremium: true,
  },
  {
    id: 'hero-the-seven',
    name: 'The Seven',
    type: 'For Time',
    date: 'Hero WOD',
    description: [
      { title: 'A tribute to seven CIA officers and one Jordanian officer killed by a suicide bomber in Afghanistan on December 30, 2009.', content: '' },
      { title: '7 Rounds For Time', content: '7 Handstand Push-ups\n7 Thrusters (135/95 lb)\n7 Knees-to-Elbows\n7 Deadlifts (245/165 lb)\n7 Burpees\n7 Kettlebell Swings (2/1.5 pood)\n7 Pull-ups' }
    ],
    imageUrl: 'system-letter',
    userId: 'system',
    userDisplayName: 'CrossFit HQ',
    isPremium: true,
  },
  {
    id: 'hero-kalsu',
    name: 'Kalsu',
    type: 'For Time',
    date: 'Hero WOD',
    description: [
      { title: 'In honor of Robert James "Bob" Kalsu, a former professional football player who left his career to serve in the U.S. Army in Vietnam.', content: '' },
      { title: 'For Time', content: '100 Thrusters (135/95 lb)\n*5 Burpees at the beginning of every minute (EMOM)' }
    ],
    imageUrl: 'system-letter',
    userId: 'system',
    userDisplayName: 'CrossFit HQ',
    isPremium: true,
  },
  {
    id: 'hero-arnie',
    name: 'Arnie',
    type: 'For Time',
    date: 'Hero WOD',
    description: [
      { title: 'In honor of Los Angeles County Firefighter Specialist Arnaldo "Arnie" Quinones, 34, who was killed in the line of duty on August 30, 2009.', content: '' },
      { title: 'For Time', content: 'With a single 2 pood kettlebell:\n21 Turkish Get-ups, Right arm\n50 Swings\n21 Overhead squats, Left arm\n50 Swings\n21 Overhead squats, Right arm\n50 Swings\n21 Turkish Get-ups, Left arm' }
    ],
    imageUrl: 'system-letter',
    userId: 'system',
    userDisplayName: 'CrossFit HQ',
    isPremium: true,
  },
  {
    id: 'hero-lumberjack-20',
    name: 'Lumberjack 20',
    type: 'For Time',
    date: 'Hero WOD',
    description: [
      { title: 'This workout is dedicated to the 20 servicemembers who died in the Fort Hood shooting on Nov. 5, 2009.', content: '' },
      { title: 'For Time', content: '20 Deadlifts (275/185 lb)\n400 meter Run\n20 Kettlebell Swings (2 pood)\n400 meter Run\n20 Overhead Squats (115/75 lb)\n400 meter Run\n20 Burpees\n400 meter Run\n20 Pull-ups (Chest-to-Bar)\n400 meter Run\n20 Box Jumps (24/20 in)\n400 meter Run\n20 Dumbbell Squat Cleans (45/35 lb)\n400 meter Run' }
    ],
    imageUrl: 'system-letter',
    userId: 'system',
    userDisplayName: 'CrossFit HQ',
    isPremium: true,
  },
  {
    id: 'hero-bull',
    name: 'Bull',
    type: 'For Time',
    date: 'Hero WOD',
    description: [
      { title: 'In honor of U.S. Marine Corps Captain Brandon "Bull" Barrett, 27, of Marion, Indiana, who was killed May 5, 2010.', content: '' },
      { title: '2 Rounds For Time', content: '200 Double-Unders\n50 Overhead Squats (135/95 lb)\n50 Pull-ups\n1 mile Run' }
    ],
    imageUrl: 'system-letter',
    userId: 'system',
    userDisplayName: 'CrossFit HQ',
    isPremium: true,
  },
  {
    id: 'hero-daniel',
    name: 'Daniel',
    type: 'For Time',
    date: 'Hero WOD',
    description: [
      { title: 'In honor of Sgt. 1st Class Daniel Crabtree who was killed in Al Kut, Iraq on Thursday, June 8th, 2006.', content: '' },
      { title: 'For Time', content: '50 Pull-ups\n400 meter Run\n21 Thrusters (95/65 lb)\n800 meter Run\n21 Thrusters (95/65 lb)\n400 meter Run\n50 Pull-ups' }
    ],
    imageUrl: 'system-letter',
    userId: 'system',
    userDisplayName: 'CrossFit HQ',
    isPremium: true,
  },
  {
    id: 'hero-tommy-v',
    name: 'Tommy V',
    type: 'For Time',
    date: 'Hero WOD',
    description: [
      { title: 'In honor of Senior Chief Petty Officer Thomas J. Valentine, 37, of Ham Lake, Minnesota, who died in a training accident in Arizona, on Feb. 13, 2008.', content: '' },
      { title: 'For Time', content: '21 Thrusters (115/75 lb)\n12 Rope Climbs (15 ft)\n15 Thrusters\n9 Rope Climbs\n9 Thrusters\n6 Rope Climbs' }
    ],
    imageUrl: 'system-letter',
    userId: 'system',
    userDisplayName: 'CrossFit HQ',
    isPremium: true,
  },
  {
    id: 'hero-the-chief',
    name: 'The Chief',
    type: 'AMRAP',
    date: 'Benchmark',
    description: [
      { title: 'A classic benchmark WOD.', content: '' },
      { title: 'Max rounds in 19 minutes', content: '5 rounds of:\n3 minute AMRAP:\n3 Power Cleans (135/95 lb)\n6 Push-ups\n9 Squats\nRest 1 minute between rounds.' }
    ],
    duration: 19,
    imageUrl: 'system-letter',
    userId: 'system',
    userDisplayName: 'CrossFit HQ',
    isPremium: true,
  },
  {
    id: 'hero-fight-gone-bad',
    name: 'Fight Gone Bad',
    type: 'For Time',
    date: 'Benchmark',
    description: [
      { title: 'Designed to simulate the time domain of a mixed-martial arts bout.', content: '' },
      { title: '3 Rounds For Total Reps', content: '1 minute of Wall Balls (20/14 lb)\n1 minute of Sumo Deadlift High-Pulls (75/55 lb)\n1 minute of Box Jumps (20 in)\n1 minute of Push Press (75/55 lb)\n1 minute of Rowing (for calories)\n1 minute of Rest' }
    ],
    imageUrl: 'system-letter',
    userId: 'system',
    userDisplayName: 'CrossFit HQ',
    isPremium: true,
  },
  {
    id: 'hero-helen',
    name: 'Helen',
    type: 'For Time',
    date: 'Benchmark',
    description: [
      { title: 'Another one of the original "Girls" benchmark WODs.', content: '' },
      { title: '3 Rounds For Time', content: '400 meter Run\n21 Kettlebell Swings (1.5/1 pood)\n12 Pull-ups' }
    ],
    imageUrl: 'system-letter',
    userId: 'system',
    userDisplayName: 'CrossFit HQ',
    isPremium: true,
  },
  {
    id: 'hero-karen',
    name: 'Karen',
    type: 'For Time',
    date: 'Benchmark',
    description: [
      { title: 'A deceptively simple benchmark WOD.', content: '' },
      { title: 'For Time', content: '150 Wall Balls (20/14 lb)' }
    ],
    imageUrl: 'system-letter',
    userId: 'system',
    userDisplayName: 'CrossFit HQ',
    isPremium: true,
  },
];

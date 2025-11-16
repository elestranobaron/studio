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
      { title: 'For Time', content: '1 mile Run\n100 Pull-ups\n200 Push-ups\n300 Squats\n1 mile Run', timerType: 'For Time' },
      { title: 'Notes', content: 'Partition the pull-ups, push-ups, and squats as needed. If you have a 20 lb vest, wear it.' }
    ],
    imageUrl: 'system-letter', // Identifier for HeroLetter component
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
        { title: '21-15-9 Reps For Time', content: 'Thrusters (95/65 lb)\nPull-ups', timerType: 'For Time' },
    ],
    imageUrl: 'system-letter',
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
        { title: 'AMRAP in 20 Minutes', content: '5 Pull-ups\n10 Push-ups\n15 Squats', timerType: 'AMRAP', timerDuration: 20 },
    ],
    imageUrl: 'system-letter',
    userId: 'system',
    userDisplayName: 'CrossFit HQ',
  },
  {
    id: 'hero-dt',
    name: 'DT',
    type: 'For Time',
    date: 'Hero WOD',
    description: [
        { title: 'In honor of USAF SSgt Timothy P. Davis, 28, who was killed on Feburary, 20 2009.', content: ''},
        { title: '5 Rounds For Time', content: '12 Deadlifts (155/105 lb)\n9 Hang Power Cleans (155/105 lb)\n6 Push Jerks (155/105 lb)', timerType: 'For Time' },
    ],
    imageUrl: 'system-letter',
    userId: 'system',
    userDisplayName: 'CrossFit HQ',
  },
  {
    id: 'hero-ryan',
    name: 'Ryan',
    type: 'For Time',
    date: 'Hero WOD',
    description: [
      { title: 'In honor of firefighter Ryan Hummert, 22, of Maplewood, MO, who was killed by sniper fire July 21st, 2008.', content: '' },
      { title: '5 Rounds For Time', content: '7 Muscle-ups\n21 Burpees', timerType: 'For Time' }
    ],
    imageUrl: 'system-letter',
    userId: 'system',
    userDisplayName: 'CrossFit HQ',
  },
  {
    id: 'hero-randy',
    name: 'Randy',
    type: 'For Time',
    date: 'Hero WOD',
    description: [
      { title: 'In honor of LAPD Officer Randy Simmons, 51, who was killed February 7, 2008, in the line of duty.', content: '' },
      { title: 'For Time', content: '75 Power Snatches (75/55 lb)', timerType: 'For Time' }
    ],
    imageUrl: 'system-letter',
    userId: 'system',
    userDisplayName: 'CrossFit HQ',
  },
  {
    id: 'hero-jt',
    name: 'J.T.',
    type: 'For Time',
    date: 'Hero WOD',
    description: [
      { title: 'In honor of Petty Officer 1st Class Jeff Taylor, 30, of Little Creek, VA, who was killed in Afghanistan.', content: '' },
      { title: '21-15-9 Reps For Time', content: 'Handstand Push-ups\nRing Dips\nPush-ups', timerType: 'For Time' }
    ],
    imageUrl: 'system-letter',
    userId: 'system',
    userDisplayName: 'CrossFit HQ',
  },
  {
    id: 'hero-hotshots-19',
    name: 'Hotshots 19',
    type: 'For Time',
    date: 'Hero WOD',
    description: [
      { title: 'In honor of the 19 members of the Granite Mountain Hotshots crew who gave their lives on June 30, 2013, while fighting a fire in Yarnell, Arizona.', content: '' },
      { title: '6 Rounds For Time', content: '30 Squats\n19 Power Cleans (135/95 lb)\n7 Strict Pull-ups\n400 meter Run', timerType: 'For Time' }
    ],
    imageUrl: 'system-letter',
    userId: 'system',
    userDisplayName: 'CrossFit HQ',
  },
  {
    id: 'hero-the-seven',
    name: 'The Seven',
    type: 'For Time',
    date: 'Hero WOD',
    description: [
      { title: 'A tribute to seven CIA officers and one Jordanian officer killed by a suicide bomber in Afghanistan on December 30, 2009.', content: '' },
      { title: '7 Rounds For Time', content: '7 Handstand Push-ups\n7 Thrusters (135/95 lb)\n7 Knees-to-Elbows\n7 Deadlifts (245/165 lb)\n7 Burpees\n7 Kettlebell Swings (2/1.5 pood)\n7 Pull-ups', timerType: 'For Time' }
    ],
    imageUrl: 'system-letter',
    userId: 'system',
    userDisplayName: 'CrossFit HQ',
  },
  {
    id: 'hero-kalsu',
    name: 'Kalsu',
    type: 'For Time',
    date: 'Hero WOD',
    description: [
      { title: 'In honor of Robert James "Bob" Kalsu, a former professional football player who left his career to serve in the U.S. Army in Vietnam.', content: '' },
      { title: 'For Time', content: '100 Thrusters (135/95 lb)\n*5 Burpees at the beginning of every minute (EMOM)', timerType: 'For Time' }
    ],
    imageUrl: 'system-letter',
    userId: 'system',
    userDisplayName: 'CrossFit HQ',
  },
  {
    id: 'hero-arnie',
    name: 'Arnie',
    type: 'For Time',
    date: 'Hero WOD',
    description: [
      { title: 'In honor of Los Angeles County Firefighter Specialist Arnaldo "Arnie" Quinones, 34, who was killed in the line of duty on August 30, 2009.', content: '' },
      { title: 'For Time', content: 'With a single 2 pood kettlebell:\n21 Turkish Get-ups, Right arm\n50 Swings\n21 Overhead squats, Left arm\n50 Swings\n21 Overhead squats, Right arm\n50 Swings\n21 Turkish Get-ups, Left arm', timerType: 'For Time' }
    ],
    imageUrl: 'system-letter',
    userId: 'system',
    userDisplayName: 'CrossFit HQ',
  },
  {
    id: 'hero-lumberjack-20',
    name: 'Lumberjack 20',
    type: 'For Time',
    date: 'Hero WOD',
    description: [
      { title: 'This workout is dedicated to the 20 servicemembers who died in the Fort Hood shooting on Nov. 5, 2009.', content: '' },
      { title: 'For Time', content: '20 Deadlifts (275/185 lb)\n400 meter Run\n20 Kettlebell Swings (2 pood)\n400 meter Run\n20 Overhead Squats (115/75 lb)\n400 meter Run\n20 Burpees\n400 meter Run\n20 Pull-ups (Chest-to-Bar)\n400 meter Run\n20 Box Jumps (24/20 in)\n400 meter Run\n20 Dumbbell Squat Cleans (45/35 lb)\n400 meter Run', timerType: 'For Time' }
    ],
    imageUrl: 'system-letter',
    userId: 'system',
    userDisplayName: 'CrossFit HQ',
  },
  {
    id: 'hero-bull',
    name: 'Bull',
    type: 'For Time',
    date: 'Hero WOD',
    description: [
      { title: 'In honor of U.S. Marine Corps Captain Brandon "Bull" Barrett, 27, of Marion, Indiana, who was killed May 5, 2010.', content: '' },
      { title: '2 Rounds For Time', content: '200 Double-Unders\n50 Overhead Squats (135/95 lb)\n50 Pull-ups\n1 mile Run', timerType: 'For Time' }
    ],
    imageUrl: 'system-letter',
    userId: 'system',
    userDisplayName: 'CrossFit HQ',
  },
  {
    id: 'hero-daniel',
    name: 'Daniel',
    type: 'For Time',
    date: 'Hero WOD',
    description: [
      { title: 'In honor of Sgt. 1st Class Daniel Crabtree who was killed in Al Kut, Iraq on Thursday, June 8th, 2006.', content: '' },
      { title: 'For Time', content: '50 Pull-ups\n400 meter Run\n21 Thrusters (95/65 lb)\n800 meter Run\n21 Thrusters (95/65 lb)\n400 meter Run\n50 Pull-ups', timerType: 'For Time' }
    ],
    imageUrl: 'system-letter',
    userId: 'system',
    userDisplayName: 'CrossFit HQ',
  },
  {
    id: 'hero-tommy-v',
    name: 'Tommy V',
    type: 'For Time',
    date: 'Hero WOD',
    description: [
      { title: 'In honor of Senior Chief Petty Officer Thomas J. Valentine, 37, of Ham Lake, Minnesota, who died in a training accident in Arizona, on Feb. 13, 2008.', content: '' },
      { title: 'For Time', content: '21 Thrusters (115/75 lb)\n12 Rope Climbs (15 ft)\n15 Thrusters\n9 Rope Climbs\n9 Thrusters\n6 Rope Climbs', timerType: 'For Time' }
    ],
    imageUrl: 'system-letter',
    userId: 'system',
    userDisplayName: 'CrossFit HQ',
  },
  {
    id: 'hero-the-chief',
    name: 'The Chief',
    type: 'AMRAP',
    date: 'Benchmark',
    description: [
      { title: 'A classic benchmark WOD.', content: '' },
      { title: 'Max rounds in 19 minutes', content: '5 rounds of:\n3 minute AMRAP:\n3 Power Cleans (135/95 lb)\n6 Push-ups\n9 Squats\nRest 1 minute between rounds.', timerType: 'AMRAP', timerDuration: 19 }
    ],
    duration: 19,
    imageUrl: 'system-letter',
    userId: 'system',
    userDisplayName: 'CrossFit HQ',
  },
  {
    id: 'hero-fight-gone-bad',
    name: 'Fight Gone Bad',
    type: 'Other',
    date: 'Benchmark',
    description: [
      { title: 'Designed to simulate the time domain of a mixed-martial arts bout.', content: '' },
      { title: '3 Rounds For Total Reps', content: '1 minute of Wall Balls (20/14 lb)\n1 minute of Sumo Deadlift High-Pulls (75/55 lb)\n1 minute of Box Jumps (20 in)\n1 minute of Push Press (75/55 lb)\n1 minute of Rowing (for calories)\n1 minute of Rest' }
    ],
    imageUrl: 'system-letter',
    userId: 'system',
    userDisplayName: 'CrossFit HQ',
  },
  {
    id: 'hero-helen',
    name: 'Helen',
    type: 'For Time',
    date: 'Benchmark',
    description: [
      { title: 'Another one of the original "Girls" benchmark WODs.', content: '' },
      { title: '3 Rounds For Time', content: '400 meter Run\n21 Kettlebell Swings (1.5/1 pood)\n12 Pull-ups', timerType: 'For Time' }
    ],
    imageUrl: 'system-letter',
    userId: 'system',
    userDisplayName: 'CrossFit HQ',
  },
  {
    id: 'hero-karen',
    name: 'Karen',
    type: 'For Time',
    date: 'Benchmark',
    description: [
      { title: 'A deceptively simple benchmark WOD.', content: '' },
      { title: 'For Time', content: '150 Wall Balls (20/14 lb)', timerType: 'For Time' }
    ],
    imageUrl: 'system-letter',
    userId: 'system',
    userDisplayName: 'CrossFit HQ',
  },
  // --- PREMIUM WODS ---
  {
    id: 'hero-grace',
    name: 'Grace',
    type: 'For Time',
    date: 'Benchmark',
    isPremium: true,
    description: [
      { title: 'A classic "Girl" WOD focused on Olympic lifting.', content: '' },
      { title: 'For Time', content: '30 Clean and Jerks (135/95 lb)', timerType: 'For Time' }
    ],
    imageUrl: 'system-letter',
    userId: 'system',
    userDisplayName: 'CrossFit HQ',
  },
  {
    id: 'hero-isabel',
    name: 'Isabel',
    type: 'For Time',
    date: 'Benchmark',
    isPremium: true,
    description: [
      { title: 'Grace\'s sister WOD, another Olympic lifting test.', content: '' },
      { title: 'For Time', content: '30 Snatches (135/95 lb)', timerType: 'For Time' }
    ],
    imageUrl: 'system-letter',
    userId: 'system',
    userDisplayName: 'CrossFit HQ',
  },
  {
    id: 'hero-mary',
    name: 'Mary',
    type: 'AMRAP',
    duration: 20,
    date: 'Benchmark',
    isPremium: true,
    description: [
      { title: 'A technically demanding gymnastics benchmark.', content: '' },
      { title: 'AMRAP in 20 Minutes', content: '5 Handstand Push-ups\n10 Pistols (alternating legs)\n15 Pull-ups', timerType: 'AMRAP', timerDuration: 20 }
    ],
    imageUrl: 'system-letter',
    userId: 'system',
    userDisplayName: 'CrossFit HQ',
  },
  {
    id: 'hero-michael',
    name: 'Michael',
    type: 'For Time',
    date: 'Hero WOD',
    isPremium: true,
    description: [
      { title: 'In honor of Navy Lieutenant Michael McGreevy, 30, of Portville, NY, who was killed in Afghanistan on June 28, 2005.', content: '' },
      { title: '3 Rounds For Time', content: '800 meter Run\n50 Back Extensions\n50 Sit-ups', timerType: 'For Time' }
    ],
    imageUrl: 'system-letter',
    userId: 'system',
    userDisplayName: 'CrossFit HQ',
  },
  {
    id: 'hero-badger',
    name: 'Badger',
    type: 'For Time',
    date: 'Hero WOD',
    isPremium: true,
    description: [
      { title: 'In honor of Navy Chief Petty Officer Mark Carter, 27, of Virginia Beach, VA, who was killed in Iraq on December 11, 2007.', content: '' },
      { title: '3 Rounds For Time', content: '30 Squat Cleans (95/65 lb)\n30 Pull-ups\n800 meter Run', timerType: 'For Time' }
    ],
    imageUrl: 'system-letter',
    userId: 'system',
    userDisplayName: 'CrossFit HQ',
  },
  {
    id: 'hero-griff',
    name: 'Griff',
    type: 'For Time',
    date: 'Hero WOD',
    isPremium: true,
    description: [
      { title: 'In honor of USAF SSgt Travis L. Griffin, 28, who was killed in the line of duty on April 3, 2008, in the Baghdad area of Iraq.', content: '' },
      { title: 'For Time', content: '800 meter Run\n400 meter Run (backwards)\n800 meter Run\n400 meter Run (backwards)', timerType: 'For Time' }
    ],
    imageUrl: 'system-letter',
    userId: 'system',
    userDisplayName: 'CrossFit HQ',
  },
  {
    id: 'hero-nate',
    name: 'Nate',
    type: 'AMRAP',
    duration: 20,
    date: 'Hero WOD',
    isPremium: true,
    description: [
      { title: 'In honor of Chief Petty Officer Nate Hardy, who was killed Sunday February 4th, 2008 during combat operations in Iraq.', content: '' },
      { title: 'AMRAP in 20 Minutes', content: '2 Muscle-ups\n4 Handstand Push-ups\n8 Kettlebell Swings (2 pood)', timerType: 'AMRAP', timerDuration: 20 }
    ],
    imageUrl: 'system-letter',
    userId: 'system',
    userDisplayName: 'CrossFit HQ',
  },
  {
    id: 'hero-chelsea',
    name: 'Chelsea',
    type: 'EMOM',
    duration: 30,
    date: 'Benchmark',
    isPremium: true,
    description: [
      { title: 'A classic "Girl" EMOM workout.', content: '' },
      { title: 'EMOM for 30 Minutes', content: '5 Pull-ups\n10 Push-ups\n15 Squats', timerType: 'EMOM', timerDuration: 30, timerRounds: 30, timerInterval: 60 }
    ],
    imageUrl: 'system-letter',
    userId: 'system',
    userDisplayName: 'CrossFit HQ',
  },
   {
    id: 'hero-elizabeth',
    name: 'Elizabeth',
    type: 'For Time',
    date: 'Benchmark',
    isPremium: true,
    description: [
      { title: 'A challenging "Girl" benchmark with heavy squat cleans.', content: '' },
      { title: '21-15-9 Reps For Time', content: 'Squat Cleans (135/95 lb)\nRing Dips', timerType: 'For Time' }
    ],
    imageUrl: 'system-letter',
    userId: 'system',
    userDisplayName: 'CrossFit HQ',
  },
  {
    id: 'hero-diane',
    name: 'Diane',
    type: 'For Time',
    date: 'Benchmark',
    isPremium: true,
    description: [
      { title: 'A classic test of upper body strength and power.', content: '' },
      { title: '21-15-9 Reps For Time', content: 'Deadlifts (225/155 lb)\nHandstand Push-ups', timerType: 'For Time' }
    ],
    imageUrl: 'system-letter',
    userId: 'system',
    userDisplayName: 'CrossFit HQ',
  },
  {
    id: 'hero-nancy',
    name: 'Nancy',
    type: 'For Time',
    date: 'Benchmark',
    isPremium: true,
    description: [
      { title: 'A benchmark that combines running with a classic olympic lift.', content: '' },
      { title: '5 Rounds For Time', content: '400 meter Run\n15 Overhead Squats (95/65 lb)', timerType: 'For Time' }
    ],
    imageUrl: 'system-letter',
    userId: 'system',
    userDisplayName: 'CrossFit HQ',
  },
  {
    id: 'hero-holleyman',
    name: 'Holleyman',
    type: 'For Time',
    date: 'Hero WOD',
    isPremium: true,
    description: [
      { title: 'In honor of U.S. Army Staff Sergeant Aaron N. Holleyman, 27, of Glasgow, Montana, who was killed on August 30, 2004.', content: '' },
      { title: '30 Rounds For Time', content: '5 Wall Balls (20/14 lb)\n3 Handstand Push-ups\n1 Power Clean (225/155 lb)', timerType: 'For Time' }
    ],
    imageUrl: 'system-letter',
    userId: 'system',
    userDisplayName: 'CrossFit HQ',
  },
  {
    id: 'hero-josh',
    name: 'Josh',
    type: 'For Time',
    date: 'Hero WOD',
    isPremium: true,
    description: [
      { title: 'In honor of SSG Joshua Hager, 29, who was killed Thursday, February 22, 2007 in Ramadi, Iraq.', content: '' },
      { title: 'For Time', content: '21 Overhead Squats (95/65 lb)\n42 Pull-ups\n15 Overhead Squats\n30 Pull-ups\n9 Overhead Squats\n18 Pull-ups', timerType: 'For Time' }
    ],
    imageUrl: 'system-letter',
    userId: 'system',
    userDisplayName: 'CrossFit HQ',
  },
  {
    id: 'hero-jason',
    name: 'Jason',
    type: 'For Time',
    date: 'Hero WOD',
    isPremium: true,
    description: [
      { title: 'In honor of S01 (SEAL) Jason Dale Lewis, 30, of Brookfield, Connecticut, who was killed by an IED on July 6, 2007, in Southern Baghdad, Iraq.', content: '' },
      { title: 'For Time', content: '100 Squats\n5 Muscle-ups\n75 Squats\n10 Muscle-ups\n50 Squats\n15 Muscle-ups\n25 Squats\n20 Muscle-ups', timerType: 'For Time' }
    ],
    imageUrl: 'system-letter',
    userId: 'system',
    userDisplayName: 'CrossFit HQ',
  },
  {
    id: 'hero-garrett',
    name: 'Garrett',
    type: 'For Time',
    date: 'Hero WOD',
    isPremium: true,
    description: [
      { title: 'In honor of Marine Capt. Garrett "Tubes" Lawton, 31, of Charleston, West Virginia, who was killed on August 4, 2008.', content: '' },
      { title: '3 Rounds For Time', content: '75 Squats\n25 Ring Handstand Push-ups\n25 L-Pull-ups', timerType: 'For Time' }
    ],
    imageUrl: 'system-letter',
    userId: 'system',
    userDisplayName: 'CrossFit HQ',
  },
];

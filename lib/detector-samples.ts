/*
  The homepage and /ai-detector demo samples: the same short story told three
  ways (written by a person, part-rewritten by a model, fully model-written).

  Each is pre-scored against the real Winston API once and reused verbatim, so
  clicking a sample never spends a live API call or one of the visitor's daily
  rate-limit slots on a result we already know.
*/

export type SampleId = "ai" | "mixed" | "human";

export interface SampleSentence {
  text: string;
  score: number;
}

export interface DetectorSample {
  label: string;
  text: string;
  winston: { score: number; sentences: SampleSentence[] };
}

export const DETECTOR_SAMPLES: Record<SampleId, DetectorSample> = {
  ai: {
    label: "AI",
    text: `I was thirteen the first time I saw Las Vegas, though in a sense I had been waiting to see it since I was eight. That was the year I watched a television special about the city and became quietly obsessed with it — the lights, the noise, the sense that it existed somewhere just past the edge of ordinary life. We lived in central Utah, close enough that it always felt within reach, and yet for years it remained a place I had only imagined.

The chance finally came when my parents announced a family trip to Disneyland. It should have been the highlight of my year on its own, but all I could think about was the fact that our route would take us straight through Las Vegas. I pleaded with them to stop for a night, and after enough persistence, they agreed.

We arrived after dark, and the city rose out of the desert exactly as I had imagined it, if not more. The Stratosphere, the Luxor's pyramid, and a skyline of competing lights stretched out ahead of us. I was captivated instantly.

We checked into Circus Circus, and the moment we stepped inside I was surrounded by the sound of slot machines and coins spilling into trays. I was far too young to play, of course, but I studied every machine as we crossed the floor toward our room, half-convinced I understood the appeal already. I remember thinking, with total conviction, that this was where I would live one day. I watched people collecting their winnings and wished I could stay up long after my parents had gone to sleep, just to keep watching.

Eight years later, on my twenty-first birthday, I finally returned with real money and real intentions. I sat down at the flashiest slot machine I could find, certain the night belonged to me. It did not. I lost quickly, and moved to a blackjack table hoping for better luck. The other players, four strangers, turned out to be patient and encouraging, and for a while I actually started winning. I let myself believe this was the game I had been waiting for. Forty-five minutes later, the momentum reversed, and I left the table with barely enough money to make it home.

Whatever fantasy I had built as a thirteen-year-old dissolved somewhere on that drive back through the desert. I was going to have to work for my money like everyone else.`,
    winston: {
      score: 0.39,
      sentences: [
        { text: "I was thirteen the first time I saw Las Vegas, though in a sense I had been waiting to see it since I was eight.", score: 32.04 },
        { text: "That was the year I watched a television special about the city and became quietly obsessed with it — the lights, the noise, the sense that it existed somewhere just past the edge of ordinary life.", score: 28.4 },
        { text: "We lived in central Utah, close enough that it always felt within reach, and yet for years it remained a place I had only imagined.", score: 27.89 },
        { text: "\n\nThe chance finally came when my parents announced a family trip to Disneyland.", score: 28.25 },
        { text: "It should have been the highlight of my year on its own, but all I could think about was the fact that our route would take us straight through Las Vegas.", score: 28.05 },
        { text: "I pleaded with them to stop for a night, and after enough persistence, they agreed.", score: 30.91 },
        { text: "\n\nWe arrived after dark, and the city rose out of the desert exactly as I had imagined it, if not more.", score: 30.3 },
        { text: "The Stratosphere, the Luxor's pyramid, and a skyline of competing lights stretched out ahead of us.", score: 30.3 },
        { text: "I was captivated instantly.\n\nWe checked into Circus Circus, and the moment we stepped inside I was surrounded by the sound of slot machines and coins spilling into trays.", score: 29.4 },
        { text: "I was far too young to play, of course, but I studied every machine as we crossed the floor toward our room, half-convinced I understood the appeal already.", score: 31.99 },
        { text: "I remember thinking, with total conviction, that this was where I would live one day.", score: 30.69 },
        { text: "I watched people collecting their winnings and wished I could stay up long after my parents had gone to sleep, just to keep watching.", score: 28.89 },
        { text: "\n\nEight years later, on my twenty-first birthday, I finally returned with real money and real intentions.", score: 31.45 },
        { text: "I sat down at the flashiest slot machine I could find, certain the night belonged to me.", score: 31.78 },
        { text: "It did not. I lost quickly, and moved to a blackjack table hoping for better luck.", score: 37.65 },
        { text: "The other players, four strangers, turned out to be patient and encouraging, and for a while I actually started winning.", score: 37.44 },
        { text: "I let myself believe this was the game I had been waiting for.", score: 31.82 },
        { text: "Forty-five minutes later, the momentum reversed, and I left the table with barely enough money to make it home.", score: 32.23 },
        { text: "\n\nWhatever fantasy I had built as a thirteen-year-old dissolved somewhere on that drive back through the desert.", score: 28.5 },
        { text: "I was going to have to work for my money like everyone else.", score: 24.7 },
      ],
    },
  },
  mixed: {
    label: "Mixed",
    text: `I was around 13yrs old the first time I visited Las Vegas. We lived in Central Utah, so we were only about 3hrs away or so. Years later, my parents surprised me and my siblings with a trip to Disney Land. While that sounded really great, I immediately thought of Las Vegas and the fact that we would need to drive through it to get there. I cannot remember being more excited about anything in my life, I was finally going to be able to see Vegas! I begged and pleaded for us to stay there, at least for one night, they gave in finally. We arrived at night, I remember the view of the city was breathtaking, I could see the Stratosphere, the Pyramid, and all the other amazing casino's in the city. I fell in love immediately.

Stepping into Circus Circus for the first time was an experience unlike anything I had encountered before. The building was alive with sound and motion: rows of slot machines stretching in every direction, coins spilling into metal trays, and a constant hum of activity that seemed to have no beginning or end. Although I was far too young to participate, I found myself completely absorbed in observing everything around me. As we walked through the casino floor to get to our room, I thought to myself "this is where I am going to live when I am older". I scoped out all the machines, watched all the people scooping up their winnings, heard the beautiful sound of coins dropping, I couldn't get enough.. I watched the other guests with fascination, particularly those who seemed to be winning, and I found myself wishing I could stay awake long enough to witness more of it before the night ended.

By the time I turned twenty-one, the anticipation I had carried for eight years finally came to a head. I chose a slot machine that looked especially promising and settled in, fully expecting the night to go in my favor. Instead, the results were almost immediately disappointing, and a significant portion of what I had brought with me was lost within minutes. Determined to recover some of my losses, I decided to try blackjack instead. Joining a table with four other players made me anxious, since I worried about making a mistake that might affect the group, but the other players were welcoming and offered guidance along the way. For a stretch of time, luck seemed to be on my side, and my confidence grew with every hand. That confidence, however, proved short-lived, and within about forty-five minutes I had lost nearly everything I had left.

My dream of being a rich gambler was crushed, what was I going to do now? I drove home with my tail tucked and realized I was going to actually need to work for my money.`,
    winston: {
      score: 64.84,
      sentences: [
        { text: "I was around 13yrs old the first time I visited Las Vegas.", score: 98.62 },
        { text: "We lived in Central Utah, so we were only about 3hrs away or so.", score: 98.64 },
        { text: "Years later, my parents surprised me and my siblings with a trip to Disney Land.", score: 98.6 },
        { text: "While that sounded really great, I immediately thought of Las Vegas and the fact that we would need to drive through it to get there.", score: 98.29 },
        { text: "I cannot remember being more excited about anything in my life, I was finally going to be able to see Vegas!", score: 98.23 },
        { text: "I begged and pleaded for us to stay there, at least for one night, they gave in finally.", score: 96.12 },
        { text: "We arrived at night, I remember the view of the city was breathtaking, I could see the Stratosphere, the Pyramid, and all the other amazing casino's in the city.", score: 90.8 },
        { text: "I fell in love immediately.\n\nStepping into Circus Circus for the first time was an experience unlike anything I had encountered before.", score: 73.68 },
        { text: "The building was alive with sound and motion: rows of slot machines stretching in every direction, coins spilling into metal trays, and a constant hum of activity that seemed to have no beginning or end.", score: 61.29 },
        { text: "Although I was far too young to participate, I found myself completely absorbed in observing everything around me.", score: 70.43 },
        { text: "As we walked through the casino floor to get to our room, I thought to myself \"this is where I am going to live when I am older\".", score: 85.32 },
        { text: "I scoped out all the machines, watched all the people scooping up their winnings, heard the beautiful sound of coins dropping, I couldn't get enough..", score: 87.2 },
        { text: "I watched the other guests with fascination, particularly those who seemed to be winning, and I found myself wishing I could stay awake long enough to witness more of it before the night ended.", score: 65.36 },
        { text: "\n\nBy the time I turned twenty-one, the anticipation I had carried for eight years finally came to a head.", score: 47.35 },
        { text: "I chose a slot machine that looked especially promising and settled in, fully expecting the night to go in my favor.", score: 38.99 },
        { text: "Instead, the results were almost immediately disappointing, and a significant portion of what I had brought with me was lost within minutes.", score: 39.89 },
        { text: "Determined to recover some of my losses, I decided to try blackjack instead.", score: 44.43 },
        { text: "Joining a table with four other players made me anxious, since I worried about making a mistake that might affect the group, but the other players were welcoming and offered guidance along the way.", score: 53.49 },
        { text: "For a stretch of time, luck seemed to be on my side, and my confidence grew with every hand.", score: 48.57 },
        { text: "That confidence, however, proved short-lived, and within about forty-five minutes I had lost nearly everything I had left.", score: 53.23 },
        { text: "\n\nMy dream of being a rich gambler was crushed, what was I going to do now?", score: 67.78 },
        { text: "I drove home with my tail tucked and realized I was going to actually need to work for my money.", score: 65.46 },
      ],
    },
  },
  human: {
    label: "Human",
    text: `I was around 13yrs old the first time I visited Las Vegas. We lived in Central Utah, so we were only about 3hrs away or so. When I was around 8yrs old I watched a show on tv about Vegas and it amazed me, I remember wanting to go there and see it all in person more than anything. Years later, my parents surprised me and my siblings with a trip to Disney Land. While that sounded really great, I immediately thought of Las Vegas and the fact that we would need to drive through it to get there. I cannot remember being more excited about anything in my life, I was finally going to be able to see Vegas! I begged and pleaded for us to stay there, at least for one night, they gave in finally. We arrived at night, I remember the view of the city was breathtaking, I could see the Stratosphere, the Pyramid, and all the other amazing casino's in the city. I fell in love immediately.

We stayed at Circus Circus, I remember entering the building and seeing all the slot machines and people and hearing the sound of coins dropping all around me. The gambler in me wanted to jump on the coolest looking one and start pushing buttons and pulling levers. Luckily I remembered I was only 13yrs old and that would be very bad. As we walked through the casino floor to get to our room, I thought to myself "this is where I am going to live when I am older". I scoped out all the machines, watched all the people scooping up their winnings, heard the beautiful sound of coins dropping, I couldn't get enough. I wanted to sneak back down when my parent fell asleep. It was so enticing.

Eight years later, on my 21st birthday I made the highly anticipated trip down there. I found the coolest looking slot machine, sat down, started pushing buttons and pulling levers... To my surprise, it did not go my way, at all. I lost almost everything. I decided I would try my luck with Blackjack. I sat down, there were 4 other players, I remember being so scared I was going to do the wrong thing or mess them up somehow. I quickly found they were nice and helpful, I started winning and my hopes started raising, I thought "this is my game", I can do this. About 45 minutes later, I was broke with barely enough money to get home.

My dream of being a rich gambler was crushed, what was I going to do now? I drove home with my tail tucked and realized I was going to actually need to work for my money.`,
    winston: {
      score: 100,
      sentences: [
        { text: "I was around 13yrs old the first time I visited Las Vegas.", score: 99.99 },
        { text: "We lived in Central Utah, so we were only about 3hrs away or so.", score: 99.98 },
        { text: "When I was around 8yrs old I watched a show on tv about Vegas and it amazed me, I remember wanting to go there and see it all in person more than anything.", score: 99.99 },
        { text: "Years later, my parents surprised me and my siblings with a trip to Disney Land.", score: 99.99 },
        { text: "While that sounded really great, I immediately thought of Las Vegas and the fact that we would need to drive through it to get there.", score: 99.99 },
        { text: "I cannot remember being more excited about anything in my life, I was finally going to be able to see Vegas!", score: 99.99 },
        { text: "I begged and pleaded for us to stay there, at least for one night, they gave in finally.", score: 99.98 },
        { text: "We arrived at night, I remember the view of the city was breathtaking, I could see the Stratosphere, the Pyramid, and all the other amazing casino's in the city.", score: 99.98 },
        { text: "I fell in love immediately.\n\nWe stayed at Circus Circus, I remember entering the building and seeing all the slot machines and people and hearing the sound of coins dropping all around me.", score: 99.99 },
        { text: "The gambler in me wanted to jump on the coolest looking one and start pushing buttons and pulling levers.", score: 99.99 },
        { text: "Luckily I remembered I was only 13yrs old and that would be very bad.", score: 99.99 },
        { text: "As we walked through the casino floor to get to our room, I thought to myself \"this is where I am going to live when I am older\".", score: 99.99 },
        { text: "I scoped out all the machines, watched all the people scooping up their winnings, heard the beautiful sound of coins dropping, I couldn't get enough.", score: 99.99 },
        { text: "I wanted to sneak back down when my parent fell asleep.", score: 99.98 },
        { text: "It was so enticing.\n\nEight years later, on my 21st birthday I made the highly anticipated trip down there.", score: 99.99 },
        { text: "I found the coolest looking slot machine, sat down, started pushing buttons and pulling levers... To my surprise, it did not go my way, at all.", score: 99.99 },
        { text: "I lost almost everything. I decided I would try my luck with Blackjack.", score: 99.99 },
        { text: "I sat down, there were 4 other players, I remember being so scared I was going to do the wrong thing or mess them up somehow.", score: 99.98 },
        { text: "I quickly found they were nice and helpful, I started winning and my hopes started raising, I thought \"this is my game\", I can do this.", score: 99.98 },
        { text: "About 45 minutes later, I was broke with barely enough money to get home.", score: 99.98 },
        { text: "\n\nMy dream of being a rich gambler was crushed, what was I going to do now?", score: 99.98 },
        { text: "I drove home with my tail tucked and realized I was going to actually need to work for my money.", score: 99.98 },
      ],
    },
  },
};

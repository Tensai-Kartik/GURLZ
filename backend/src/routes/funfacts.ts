import { FastifyInstance } from 'fastify';

const myths = [
  {
    myth: "You can't exercise during your period",
    fact: "Exercise can actually help reduce cramps and improve mood! Light to moderate exercise is perfectly safe and beneficial.",
  },
  {
    myth: "Period blood is dirty",
    fact: "Period blood is just like any other blood - it's not dirty or impure. It's a natural part of the menstrual cycle.",
  },
  {
    myth: "You can't get pregnant during your period",
    fact: "While less likely, it's still possible to get pregnant during your period, especially if you have shorter cycles.",
  },
  {
    myth: "You shouldn't wash your hair during your period",
    fact: "There's no medical reason to avoid washing your hair during your period. This is a cultural myth with no scientific basis.",
  },
  {
    myth: "Periods sync when women live together",
    fact: "Research shows this is mostly coincidental. Menstrual cycles naturally vary, so overlap is common by chance.",
  },
];

export async function funfactRoutes(fastify: FastifyInstance) {
  fastify.get('/funfacts', async (request, reply) => {
    try {
      // Return a different fact each day
      const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
      const fact = myths[dayOfYear % myths.length];
      
      return {
        ...fact,
        date: new Date().toISOString().split('T')[0],
      };
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to fetch fun fact' });
    }
  });
}


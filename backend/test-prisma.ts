import prisma from './src/db.js';

async function test() {
  try {
    const voters = await prisma.voter.findMany();
    console.log("SUCCESS:", voters.length);
  } catch(e) {
    console.error("ERROR:", e);
  }
}
test();

import prisma from '../config/database.js';

async function seed() {
  console.log('🌱 Seeding database...');

  // Create demo user
  const user = await prisma.user.upsert({
    where: { email: 'demo@gurlz.ai' },
    update: {},
    create: {
      name: 'Demo User',
      email: 'demo@gurlz.ai',
      settings: JSON.stringify({ theme: 'baby-pink' }),
    },
  });

  console.log('✅ Created demo user:', user.email);

  // Create sample cycle
  const cycle = await prisma.cycle.create({
    data: {
      userId: user.id,
      startDate: new Date(),
      flowLevel: 'medium',
      notes: 'Sample cycle entry',
    },
  });

  console.log('✅ Created sample cycle');

  // Create sample reminder
  const reminder = await prisma.reminder.create({
    data: {
      userId: user.id,
      type: 'medication',
      message: 'Take pain relief medication',
      scheduleCron: '0 9 * * *',
      enabled: true,
    },
  });

  console.log('✅ Created sample reminder');

  // Create emergency contact
  const contact = await prisma.emergencyContact.create({
    data: {
      userId: user.id,
      name: 'Emergency Contact',
      phone: '+1234567890',
      relationship: 'Family',
      priority: 10,
    },
  });

  console.log('✅ Created emergency contact');

  console.log('🎉 Seeding complete!');
  process.exit(0);
}

seed().catch((e) => {
  console.error('❌ Seeding failed:', e);
  process.exit(1);
});


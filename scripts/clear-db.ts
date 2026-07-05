import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Cleansing SQLite database of all mock leads and outreach records...");

  try {
    // Delete in sequence to satisfy foreign key cascades
    const deletedListLeads = await prisma.listLead.deleteMany({});
    console.log(`Deleted list-lead links: ${deletedListLeads.count}`);

    const deletedEmails = await prisma.leadEmail.deleteMany({});
    console.log(`Deleted email drafts: ${deletedEmails.count}`);

    const deletedReplies = await prisma.reply.deleteMany({});
    console.log(`Deleted lead replies: ${deletedReplies.count}`);

    const deletedCalls = await prisma.callLog.deleteMany({});
    console.log(`Deleted phone call logs: ${deletedCalls.count}`);

    const deletedTasks = await prisma.task.deleteMany({});
    console.log(`Deleted outreach checklist tasks: ${deletedTasks.count}`);

    const deletedDeals = await prisma.deal.deleteMany({});
    console.log(`Deleted opportunity pipeline deals: ${deletedDeals.count}`);

    const deletedMeetings = await prisma.meeting.deleteMany({});
    console.log(`Deleted booked calendar meetings: ${deletedMeetings.count}`);

    const deletedSequenceStates = await prisma.leadSequenceState.deleteMany({});
    console.log(`Deleted lead sequence progression states: ${deletedSequenceStates.count}`);

    const deletedSequenceSteps = await prisma.sequenceStep.deleteMany({});
    console.log(`Deleted sequencer steps: ${deletedSequenceSteps.count}`);

    const deletedSavedSearches = await prisma.savedSearch.deleteMany({});
    console.log(`Deleted saved search configurations: ${deletedSavedSearches.count}`);

    const deletedCustomLists = await prisma.customList.deleteMany({});
    console.log(`Deleted custom folder lists: ${deletedCustomLists.count}`);

    const deletedLeads = await prisma.lead.deleteMany({});
    console.log(`Deleted base contacts leads: ${deletedLeads.count}`);

    const deletedSessions = await prisma.session.deleteMany({});
    console.log(`Deleted sequence campaigns: ${deletedSessions.count}`);

    console.log("✨ Database successfully cleared! Start adding real outbound campaigns.");
  } catch (error) {
    console.error("❌ Cleansing process encountered an error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

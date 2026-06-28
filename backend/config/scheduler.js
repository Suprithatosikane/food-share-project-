const cron = require('node-cron');
const User = require('../models/User');
const DailyRequest = require('../models/DailyRequest');

/**
 * Initializes the Daily Food Requirement Scheduler.
 * Checks every minute for receivers who have enabled daily requirements
 * and whose preferred time matches the current local time.
 */
const initScheduler = () => {
  console.log('⏰ Daily Food Requirement Scheduler initialized.');

  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      
      // Get current local HH:MM
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${hours}:${minutes}`;

      // Get current local YYYY-MM-DD
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const currentDateStr = `${year}-${month}-${day}`;

      // Find receivers whose preferred time matches current time and hasn't triggered today yet
      const eligibleUsers = await User.find({
        role: 'receiver',
        'dailyRequirement.enabled': true,
        'dailyRequirement.preferredTime': currentTimeStr,
        'dailyRequirement.lastTriggeredDate': { $ne: currentDateStr }
      });

      if (eligibleUsers.length > 0) {
        console.log(`[Scheduler] Found ${eligibleUsers.length} receivers with pending requirements at ${currentTimeStr}`);
      }

      for (const user of eligibleUsers) {
        try {
          // Create the DailyRequest
          await DailyRequest.create({
            receiverId: user._id,
            quantity: user.dailyRequirement.quantity,
            mealType: user.dailyRequirement.mealType || 'Meals',
            status: 'pending',
            location: {
              address: user.location?.address || '',
              lat: user.location?.lat || 0,
              lng: user.location?.lng || 0,
            }
          });

          // Update user's lastTriggeredDate
          user.dailyRequirement.lastTriggeredDate = currentDateStr;
          await user.save();

          console.log(`[Scheduler] Automatically created daily food request for receiver: ${user.name} (${user.dailyRequirement.quantity} meals)`);
        } catch (err) {
          console.error(`[Scheduler] Error creating daily request for user ${user._id}:`, err);
        }
      }
    } catch (error) {
      console.error('[Scheduler] Error running daily requirement scheduler task:', error);
    }
  });
};

module.exports = { initScheduler };

const cron = require("node-cron");
const pool = require("./config/db");
const { Expo } = require("expo-server-sdk");
const expo = new Expo();
const titles = [
  "🏡 Just for You! A Property You'll Like",
  "🔔 New Property Recommendation",
  "📍 Hot Pick Near You!",
  "✨ Your Dream Property Awaits!",
  "🏠 Handpicked for You!",
  "🌟 Exclusive Property Alert!",
  "💥 Don't Miss This Property!",
  "🔑 Unlock Your Next Home!",
  "🎯 Perfect Match Found!",
  "📢 Check This Out!",
  "🏘️ Your Ideal Property is Here!",
  "🚀 Trending Property Suggestion!",
  "🎉 New Listing You’ll Love!",
  "💡 Bright Idea: New Property!",
  "🏠 Your Next Home Awaits!",
  "🔥 Hot Deal on a Property!",
  "📌 Mark This Property!",
  "💎 Premium Property Alert!",
  "🚪 Step Inside Your Future Home!",
  "✨ Fresh Property Just For You!",
];
const messages = [
  (p) =>
    `✨ Discover a ${p.sub_type} - "${p.property_name}" in your nearby area! Tap to explore now. 📍🔍`,
  (p) =>
    `🏡 Looking for a ${p.sub_type}? "${p.property_name}" might be perfect for you! 🔑`,
  (p) =>
    `📣 Check out this top-rated ${p.sub_type}: "${p.property_name}". Don't miss out! 💥`,
  (p) =>
    `💡 "${p.property_name}" is a ${p.sub_type} you might love. Take a look! 🔍`,
  (p) => `🔥 New ${p.sub_type} suggestion: "${p.property_name}". Act fast! ⚡`,
  (p) =>
    `🏠 Explore the ${p.sub_type} "${p.property_name}"—your future home could be here! 🏡`,
  (p) =>
    `🎯 This ${p.sub_type} named "${p.property_name}" fits your search perfectly. Check it out! 🎉`,
  (p) =>
    `🚪 Step inside "${p.property_name}", a beautiful ${p.sub_type} waiting for you! ✨`,
  (p) =>
    `💎 Don't miss the chance to own "${p.property_name}", a premium ${p.sub_type}! 💎`,
  (p) =>
    `📌 Featured ${p.sub_type}: "${p.property_name}". See what makes it special! 🌟`,
  (p) =>
    `🔑 Unlock the door to "${p.property_name}", your perfect ${p.sub_type}! 🏠`,
  (p) =>
    `🚀 Trending now: "${p.property_name}", a fantastic ${p.sub_type} in your area! 🔥`,
  (p) =>
    `🎉 Hot new listing: "${p.property_name}"—a ${p.sub_type} tailored for you! 🎊`,
  (p) =>
    `💡 Brighten your day with "${p.property_name}", a lovely ${p.sub_type}! ☀️`,
  (p) =>
    `🏘️ Discover "${p.property_name}"—a ${p.sub_type} that matches your taste! 🏘️`,
  (p) =>
    `📢 Attention! "${p.property_name}" is a ${p.sub_type} worth checking out! 📢`,
  (p) =>
    `✨ Fresh on the market: "${p.property_name}", your next ${p.sub_type}! 🌈`,
  (p) => `🔥 Grab this ${p.sub_type} "${p.property_name}" before it’s gone! ⏳`,
  (p) =>
    `🏠 Your dream ${p.sub_type} "${p.property_name}" is just a tap away! 💫`,
  (p) =>
    `🎯 A perfect match: "${p.property_name}"—a ${p.sub_type} that stands out! 🏆`,
];
cron.schedule("*/10 * * * *", () => {
  const query = `
    UPDATE user_sessions
    SET is_online = 0
    WHERE last_active < DATE_SUB(NOW(), INTERVAL 10 MINUTE)
  `;
  pool.query(query, (err, results) => {
    if (err) {
      console.error("Error marking inactive users:", err);
    }
  });
});
cron.schedule("0 */6 * * *", () => {
  console.log(
    " Running property recommendation notification job every 6 hours..."
  );
  const getActivityQuery = `
      SELECT ua.user_id, ua.sub_type, ua.searched_city, ua.searched_location, ua.property_in
      FROM usersActivity ua
      INNER JOIN (
        SELECT user_id, MAX(id) AS max_id
        FROM usersActivity
        WHERE user_id IS NOT NULL
        GROUP BY user_id
      ) latest ON ua.user_id = latest.user_id AND ua.id = latest.max_id
    `;
  pool.query(getActivityQuery, async (err, result) => {
    if (err) {
      console.error("Error fetching user activities:", err);
      return;
    }
    const activities = result.rows || result;
    for (const activity of activities) {
      const {
        user_id,
        sub_type,
        searched_city,
        searched_location,
        property_in,
      } = activity;
      if (!sub_type || sub_type === "N/A") continue;
      let conditions = `sub_type = ?`;
      let values = [sub_type];
      if (searched_location && searched_location !== "N/A") {
        conditions += ` AND property_name LIKE ?`;
        values.push(`%${searched_location}%`);
      }
      if (searched_city && searched_city !== "N/A") {
        conditions += ` AND city_id LIKE ?`;
        values.push(`%${searched_city}%`);
      }
      if (property_in && property_in !== "N/A") {
        conditions += ` AND property_in = ?`;
        values.push(property_in);
      }
      const propertyQuery = `
          SELECT id, property_name, city_id, sub_type
          FROM properties
          WHERE ${conditions}
          ORDER BY RAND()
          LIMIT 1
        `;
      pool.query(propertyQuery, values, async (err, propertiesResult) => {
        if (err) {
          console.error(`Error fetching property for user ${user_id}:`, err);
          return;
        }
        const properties = propertiesResult.rows || propertiesResult;
        if (properties.length > 0) {
          const property = properties[0];
          const title = titles[Math.floor(Math.random() * titles.length)];
          const message =
            messages[Math.floor(Math.random() * messages.length)](property);
          pool.query(
            "SELECT push_token FROM tokens WHERE user_id = ?",
            [user_id],
            async (err, rows) => {
              if (err) {
                console.error("DB error:", err);
                return;
              }
              if (!rows.length || !Expo.isExpoPushToken(rows[0].push_token)) {
                console.log(`⚠️ No valid push token for user ${user_id}`);
                return;
              }
              const pushToken = rows[0].push_token;
              const messagesToSend = [
                {
                  to: pushToken,
                  sound: "default",
                  title,
                  body: message,
                  data: { property_id: property.id },
                },
              ];
              try {
                const chunks = expo.chunkPushNotifications(messagesToSend);
                let tickets = [];
                for (const chunk of chunks) {
                  const ticketChunk = await expo.sendPushNotificationsAsync(
                    chunk
                  );
                  tickets.push(...ticketChunk);
                }
                pool.query(
                  "INSERT INTO notification_history (user_id, title, message) VALUES (?, ?, ?)",
                  [user_id, title, message],
                  (err) => {
                    if (err) {
                      console.error("Error saving notification history:", err);
                    }
                  }
                );
              } catch (error) {
                console.error("Push error", error);
              }
            }
          );
        } else {
          console.log(`⚠️ No matching properties found for user ${user_id}.`);
        }
      });
    }
  });
});

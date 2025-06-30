const cron = require("node-cron");
const pool = require("./config/db");
const { Expo } = require("expo-server-sdk");
const expo = new Expo();
const titles = [
  "🏡 Your Perfect Home is Here!",
  "🌟 Discover a Hidden Gem Today!",
  "📍 Prime Property in Your Area!",
  "🔑 Unlock Your Dream Home Now!",
  "💥 Exclusive Deal Just Dropped!",
  "🎉 New Listing You Can’t Miss!",
  "🏠 Handpicked Property for You!",
  "✨ Stunning Home Awaits You!",
  "🚀 Hot Property Alert!",
  "💎 Luxury Living at Its Best!",
  "📢 Fresh Listing Just for You!",
  "🏘️ Move-In Ready Home Found!",
  "🔥 Don’t Miss This Hot Deal!",
  "🎯 Your Ideal Property Awaits!",
  "🔔 New Property Recommendation!",
  "🏡 Step Into Your Future Home!",
  "🌈 Vibrant Property Just Listed!",
  "💫 A Home Tailored for You!",
  "📌 Must-See Property Alert!",
  "🚪 Open the Door to Your Dream!",
  "🏠 Perfect Match for Your Style!",
  "✨ Exclusive Property Spotlight!",
  "🔑 Your Next Home is Calling!",
  "🎉 Grab This Property Before It’s Gone!",
  "💡 Bright New Listing for You!",
  "🏡 Explore a Home That Fits You!",
  "🔥 Sizzling Property Deal Awaits!",
  "📍 Top Pick in Your Neighborhood!",
  "💎 Premium Property Just Listed!",
  "🚀 Trending Home You’ll Love!",
];
const messages = [
  (p) =>
    `🏡 Discover "${p.property_name}", a stunning ${p.sub_type} in ${p.location}! Priced at ${p.price}, it’s a must-see! 🔍`,
  (p) =>
    `🌟 Check out "${p.property_name}", a ${p.sub_type} with ${p.features}. Your dream home in ${p.location} awaits! 🏠`,
  (p) =>
    `📍 Found in ${p.location}: "${p.property_name}", a ${p.sub_type} perfect for you! Tap to explore now! 🚪`,
  (p) =>
    `🔑 Unlock "${p.property_name}", a beautiful ${p.sub_type} with ${p.size} sq.ft. in ${p.location}. Don’t wait! ⚡`,
  (p) =>
    `💥 Hot deal! "${p.property_name}" is a ${p.sub_type} in ${p.location} for only ${p.price}. See it now! 🔥`,
  (p) =>
    `🎉 New listing alert: "${p.property_name}", a ${p.sub_type} with ${p.features} in ${p.location}. Act fast! 🏡`,
  (p) =>
    `🏠 Handpicked for you: "${p.property_name}", a ${p.sub_type} in ${p.location} with ${p.size} sq.ft. Explore now! ✨`,
  (p) =>
    `✨ Step into "${p.property_name}", a gorgeous ${p.sub_type} in ${p.location}. Priced at ${p.price}! 🔑`,
  (p) =>
    `🚀 Trending now: "${p.property_name}", a ${p.sub_type} with ${p.features} in ${p.location}. Don’t miss out! 💫`,
  (p) =>
    `💎 Luxury awaits with "${p.property_name}", a premium ${p.sub_type} in ${p.location} for ${p.price}. Tap to view! 🏘️`,
  (p) =>
    `📢 Fresh on the market: "${p.property_name}", a ${p.sub_type} in ${p.location} with ${p.size} sq.ft. Check it out! 🌟`,
  (p) =>
    `🏡 Your perfect ${p.sub_type}, "${p.property_name}", is in ${p.location}. Priced at ${p.price}, it’s a steal! 🔍`,
  (p) =>
    `🔥 Hot property alert: "${p.property_name}", a ${p.sub_type} in ${p.location} with ${p.features}. Act now! ⚡`,
  (p) =>
    `🎯 Found your match: "${p.property_name}", a ${p.sub_type} in ${p.location} for ${p.price}. Explore today! 🏠`,
  (p) =>
    `🔔 New recommendation: "${p.property_name}", a ${p.sub_type} with ${p.size} sq.ft. in ${p.location}. Don’t miss it! 🚪`,
  (p) =>
    `🏘️ Move-in ready: "${p.property_name}", a ${p.sub_type} in ${p.location} with ${p.features}. Tap to see! ✨`,
  (p) =>
    `🌈 Vibrant new listing: "${p.property_name}", a ${p.sub_type} in ${p.location} for ${p.price}. Check it out! 💡`,
  (p) =>
    `💫 Your dream ${p.sub_type}, "${p.property_name}", is in ${p.location} with ${p.size} sq.ft. See it now! 🏡`,
  (p) =>
    `📌 Must-see: "${p.property_name}", a ${p.sub_type} in ${p.location} with ${p.features}. Priced at ${p.price}! 🔑`,
  (p) =>
    `🚪 Open the door to "${p.property_name}", a ${p.sub_type} in ${p.location}. Don’t wait—explore now! 🔥`,
  (p) =>
    `🏠 Tailored for you: "${p.property_name}", a ${p.sub_type} in ${p.location} with ${p.size} sq.ft. Tap to view! 🎉`,
  (p) =>
    `✨ Spotlight on "${p.property_name}", a ${p.sub_type} in ${p.location} for ${p.price}. See the details! 🌟`,
  (p) =>
    `🔑 Your next home? "${p.property_name}", a ${p.sub_type} with ${p.features} in ${p.location}. Check it out! 🏘️`,
  (p) =>
    `🎉 Don’t miss "${p.property_name}", a ${p.sub_type} in ${p.location} priced at ${p.price}. Act fast! ⚡`,
  (p) =>
    `💡 Bright idea: Explore "${p.property_name}", a ${p.sub_type} with ${p.size} sq.ft. in ${p.location}! 🏡`,
  (p) =>
    `🏡 Found in ${p.location}: "${p.property_name}", a ${p.sub_type} with ${p.features}. Tap to explore! 🔍`,
  (p) =>
    `🔥 Sizzling deal: "${p.property_name}", a ${p.sub_type} in ${p.location} for ${p.price}. Don’t wait! 🚪`,
  (p) =>
    `📍 Top pick: "${p.property_name}", a ${p.sub_type} with ${p.size} sq.ft. in ${p.location}. See it now! ✨`,
  (p) =>
    `💎 Premium find: "${p.property_name}", a ${p.sub_type} in ${p.location} with ${p.features}. Priced at ${p.price}! 🏠`,
  (p) =>
    `🚀 Hot new listing: "${p.property_name}", a ${p.sub_type} in ${p.location}. Tap to discover! 🎯`,
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
cron.schedule("*/5 * * * * *", () => {
  console.log("Running subscription expiry job at midnight...");
  const expiryQuery = `
    SELECT user_id, id, city
    FROM payment_details
    WHERE subscription_expiry_date < NOW()
    AND subscription_status IN ('active', 'processing')
  `;
  pool.query(expiryQuery, async (err, results) => {
    if (err) {
      console.error("Error fetching expired subscriptions:", err);
      return;
    }
    const expiredSubscriptions = results.rows || results;
    if (!expiredSubscriptions.length) {
      console.log("No expired subscriptions found.");
      return;
    }
    for (const subscription of expiredSubscriptions) {
      const { user_id, id, city } = subscription;
      try {
        const updatePaymentDetailsQuery = `
          UPDATE payment_details
          SET subscription_status = 'expired'
          WHERE id = ?
        `;
        await pool.promise().query(updatePaymentDetailsQuery, [id]);
        const activeSubscriptionQuery = `
          SELECT COUNT(*) AS active_count
          FROM payment_details
          WHERE user_id = ? 
          AND subscription_status IN ('active', 'processing')
          AND id != ?
        `;
        const [activeResult] = await pool
          .promise()
          .query(activeSubscriptionQuery, [user_id, id]);
        const activeCount = activeResult[0].active_count;
        if (activeCount === 0) {
          const updateUsersQuery = `
            UPDATE users
            SET subscription_status = 'expired'
            WHERE id = ?
          `;
          await pool.promise().query(updateUsersQuery, [user_id]);
          console.log(
            `Marked user ${user_id} subscription_status as expired in users table.`
          );
        }
        console.log(
          `Marked subscription ${id} for user ${user_id} in city ${city} as expired.`
        );
      } catch (error) {
        console.error(
          `Error updating subscription ${id} for user ${user_id}:`,
          error
        );
      }
    }
  });
});

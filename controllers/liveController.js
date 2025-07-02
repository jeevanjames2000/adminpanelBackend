const pool = require("../config/db");
const moment = require("moment");
let io;
const init = (socketIo) => {
  io = socketIo;
  if (!pool) {
    console.error("Database pool is not initialized. Check config/db.js");
    return;
  }
  monitorDatabaseChanges();
};
const contactQuery = `
  SELECT 
    cs.*, 
    u.id AS user_id, u.name AS user_name, u.email AS user_email, u.mobile AS user_mobile,
    u.photo AS user_photo,
    p.property_name, p.sub_type, p.property_for, p.property_type,
    p.property_in, p.state_id, p.city_id, p.location_id,
    p.property_cost, p.bedrooms, p.bathroom,
    p.facing, p.car_parking, p.bike_parking, p.description,
    p.image, p.google_address
  FROM contact_seller cs
  LEFT JOIN users u ON cs.user_id = u.id
  LEFT JOIN properties p ON cs.unique_property_id = p.unique_property_id
  WHERE DATE(cs.created_date) = ?
    AND cs.sent_status = 0
  ORDER BY cs.id DESC
`;
const updateContactSentStatusQuery = `
  UPDATE contact_seller
  SET sent_status = 1
  WHERE id IN (?)
`;
const insertNotificationQuery = `
  INSERT INTO live_notifications (lead_type, lead_id, notification_data, sent_date, sent_time)
  VALUES (?, ?, ?, ?, ?)
`;
const getAllNotificationsQuery = `
  SELECT 
    ln.id,
    ln.lead_type,
    ln.lead_id,
    ln.notification_data,
    ln.sent_date,
    ln.sent_time,
    ln.created_at,
    u.photo AS user_photo
  FROM live_notifications ln
  LEFT JOIN users u ON JSON_EXTRACT(ln.notification_data, '$.user_id') = u.id
  WHERE ln.sent_date = CURDATE()
    AND ln.lead_type = 'contacted'
  ORDER BY ln.created_at DESC
`;
function monitorDatabaseChanges() {
  if (!pool) {
    console.error("Database pool is not initialized. Retrying in 5 seconds...");
    setTimeout(monitorDatabaseChanges, 5000);
    return;
  }
  const today = moment().format("YYYY-MM-DD");
  const currentTime = moment().format("HH:mm:ss");
  const now = moment().format("YYYY-MM-DD HH:mm:ss");
  pool.query("SELECT NOW() AS mysql_time", (err, result) => {
    if (err) {
      console.error("Error fetching MySQL time:", err.message);
    } else {
    }
  });
  pool.query(contactQuery, [today], (contactErr, contactResults) => {
    if (contactErr) {
      console.error(
        "Error querying contacted leads:",
        contactErr.message,
        contactErr.stack
      );
      setTimeout(monitorDatabaseChanges, 5000);
      return;
    }
    const formattedContactResults = contactResults.map((row) => ({
      ...row,
      userDetails: {
        id: row.user_id,
        name: row.user_name,
        email: row.user_email,
        mobile: row.user_mobile,
        photo: row.user_photo,
      },
    }));
    if (formattedContactResults.length > 0) {
      io.emit("freshContactedLeads", formattedContactResults);
      const contactIds = contactResults.map((row) => row.id);
      pool.query(updateContactSentStatusQuery, [contactIds], (updateErr) => {
        if (updateErr) {
          console.error(
            "Error updating contacted leads sent_status:",
            updateErr.message,
            updateErr.stack
          );
        } else {
        }
      });
      formattedContactResults.forEach((lead) => {
        pool.query(
          insertNotificationQuery,
          ["contacted", lead.id, JSON.stringify(lead), today, currentTime],
          (insertErr) => {
            if (insertErr) {
              console.error(
                "Error inserting contacted lead notification:",
                insertErr.message,
                insertErr.stack
              );
            } else {
            }
          }
        );
      });
    }

    setTimeout(monitorDatabaseChanges, 10000);
  });
}
module.exports = {
  init,
  getFreshContactedLeads: (req, res) => {
    if (!pool) {
      console.error("Database pool is not initialized");
      return res
        .status(500)
        .json({ message: "Internal Server Error: Database not initialized" });
    }
    const today = moment().format("YYYY-MM-DD");
    const currentTime = moment().format("HH:mm:ss");
    pool.query(contactQuery, [today], (err, results) => {
      if (err) {
        console.error(
          "Error fetching contacted leads:",
          err.message,
          err.stack
        );
        return res
          .status(500)
          .json({ message: "Internal Server Error", error: err.message });
      }
      const formattedResults = results.map((row) => ({
        ...row,
        userDetails: {
          id: row.user_id,
          name: row.user_name,
          email: row.user_email,
          mobile: row.user_mobile,
          photo: row.user_photo,
        },
      }));
      if (results.length > 0) {
        const contactIds = results.map((row) => row.id);
        pool.query(updateContactSentStatusQuery, [contactIds], (updateErr) => {
          if (updateErr) {
            console.error(
              "Error updating contacted leads sent_status:",
              updateErr.message,
              updateErr.stack
            );
          }
        });
        formattedResults.forEach((lead) => {
          pool.query(
            insertNotificationQuery,
            ["contacted", lead.id, JSON.stringify(lead), today, currentTime],
            (insertErr) => {
              if (insertErr) {
                console.error(
                  "Error inserting contacted lead notification:",
                  insertErr.message,
                  insertErr.stack
                );
              }
            }
          );
        });
      }
      res.status(200).json({
        message: "Today's contact_seller leads fetched",
        count: formattedResults.length,
        data: formattedResults,
      });
    });
  },
  getAllLiveNotificationsSent: (req, res) => {
    if (!pool) {
      console.error("Database pool is not initialized");
      return res
        .status(500)
        .json({ message: "Internal Server Error: Database not initialized" });
    }
    pool.query(getAllNotificationsQuery, (err, results) => {
      if (err) {
        console.error(
          "Error fetching live notifications:",
          err.message,
          err.stack
        );
        return res
          .status(500)
          .json({ message: "Internal Server Error", error: err.message });
      }
      const formattedResults = results.map((row) => ({
        id: row.id,
        lead_type: row.lead_type,
        lead_id: row.lead_id,
        notification_data: row.notification_data,
        sent_date: row.sent_date,
        sent_time: row.sent_time,
        created_at: row.created_at,
        user_photo: row.user_photo,
      }));
      res.status(200).json({
        message: "Today's sent contact_seller notifications fetched",
        count: formattedResults.length,
        data: formattedResults,
      });
    });
  },
};

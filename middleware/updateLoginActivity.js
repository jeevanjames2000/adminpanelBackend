const moment = require("moment");
const pool = require("../config/db");
const updateLoginActivity = (req, res, next) => {
  let user_id = req.body.user_id || req.query.user_id || null;
  let mobile = req.body.mobile || null;
  const last_active = moment()
    .utcOffset("+05:30")
    .format("YYYY-MM-DD HH:mm:ss");
  const device_type = req.useragent?.isMobile
    ? "mobile"
    : req.useragent?.isTablet
    ? "tablet"
    : "laptop";
  const ip_address = req.ip || req.connection?.remoteAddress || null;
  const user_agent = req.headers["user-agent"] || null;
  const insertOrUpdateSession = (resolvedUserId, resolvedMobile) => {
    const query = `
      INSERT INTO user_sessions (
        user_id, last_active, is_online, device_type, ip_address, user_agent, mobile
      ) VALUES (?, ?, TRUE, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        last_active = VALUES(last_active),
        is_online = TRUE,
        device_type = VALUES(device_type),
        ip_address = VALUES(ip_address),
        user_agent = VALUES(user_agent),
        mobile = VALUES(mobile)
    `;
    const values = [
      resolvedUserId,
      last_active,
      device_type,
      ip_address,
      user_agent,
      resolvedMobile || null,
    ];
    pool.query(query, values, (err) => {
      if (err) {
        console.error("Error updating session activity:", err);
      }
      next();
    });
  };
  if (user_id && !mobile) {
    pool.query(
      "SELECT mobile FROM users WHERE id = ? LIMIT 1",
      [user_id],
      (err, results) => {
        if (err) {
          console.error("Error finding mobile by user_id:", err);
          return next();
        }
        const resolvedMobile = results.length > 0 ? results[0].mobile : null;
        insertOrUpdateSession(user_id, resolvedMobile);
      }
    );
  } else if (!user_id && mobile) {
    pool.query(
      "SELECT id FROM users WHERE mobile = ? LIMIT 1",
      [mobile],
      (err, results) => {
        if (err) {
          console.error("Error finding user by mobile:", err);
          return next();
        }
        if (results.length > 0) {
          insertOrUpdateSession(results[0].id, mobile);
        } else {
          console.warn("Mobile provided but no user found");
          next();
        }
      }
    );
  } else if (user_id && mobile) {
    insertOrUpdateSession(user_id, mobile);
  } else {
    next();
  }
};
module.exports = updateLoginActivity;

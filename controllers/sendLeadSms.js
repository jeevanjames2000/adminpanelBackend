const axios = require("axios");

async function sendLeadTextMessage({
  mobile,
  name,
  sub_type,
  location,
  property_cost,
}) {
  if (!mobile) {
    return {
      status: "error",
      message: "Mobile number is required",
    };
  }

  const user_id = "meetowner2023";
  const pwd = "Meet@123";
  const sender_id = "METOWR";
  const peid = "1101542890000073814";
  const tpid = "1107173821300933878";
  const message = `Dear partner, ${name} ${mobile} is Interested in your ${sub_type} at ${property_cost} in ${location} -MEET OWNER`;

  const api_url = "http://tra.bulksmshyderabad.co.in/websms/sendsms.aspx";

  try {
    const response = await axios.get(api_url, {
      params: {
        userid: user_id,
        password: pwd,
        sender: sender_id,
        mobileno: mobile,
        msg: message,
        peid: peid,
        tpid: tpid,
      },
    });

    return {
      status: "success",
      message: "Lead SMS sent successfully!",
      apiResponse: response.data,
    };
  } catch (error) {
    console.error("SMS API Error:", error.message);
    return {
      status: "error",
      message: "Error sending SMS",
      error: error.message,
    };
  }
}

module.exports = sendLeadTextMessage;

const razorpayInstance = require("./Razorpay");
const crypto = require("crypto");
const pool = require("../config/db");
const moment = require("moment");
const { default: axios } = require("axios");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const logger = require("../logger");
const sendWhatsappLeads = async (name, mobile) => {
  const payload = {
    channelId: "67a9e14542596631a8cfc87b",
    channelType: "whatsapp",
    recipient: {
      phone: `91${mobile}`,
    },
    whatsapp: {
      type: "template",
      template: {
        templateName: "account_activation_status",
        bodyValues: {
          name,
        },
      },
    },
  };
  const headers = {
    apiKey: "67e3a37bfa6fbc8b1aa2edcf",
    apiSecret: "a9fe1160c20f491eb00389683b29ec6b",
    "Content-Type": "application/json",
  };
  try {
    const response = await axios.post(
      "https://server.gallabox.com/devapi/messages/whatsapp",
      payload,
      { headers }
    );
    response.status === 202;
  } catch (error) {}
};
const sendInvoice = async (name, mobile, amount, invoiceUrl) => {
  const payload = {
    channelId: "67a9e14542596631a8cfc87b",
    channelType: "whatsapp",
    recipient: {
      name: name,
      phone: `91${mobile}`,
    },
    whatsapp: {
      type: "template",
      template: {
        templateName: "invoice_sending_to_client",
        headerValues: {
          mediaUrl: invoiceUrl,
          mediaName: "invoice.pdf",
        },
        bodyValues: {
          name: name,
          variable_2: amount,
        },
        buttonValues: [],
      },
    },
  };
  const headers = {
    apiKey: "67e3a37bfa6fbc8b1aa2edcf",
    apiSecret: "a9fe1160c20f491eb00389683b29ec6b",
    "Content-Type": "application/json",
  };
  try {
    const response = await axios.post(
      "https://server.gallabox.com/devapi/messages/whatsapp",
      payload,
      { headers }
    );
    return response.status === 202;
  } catch (error) {
    console.error(
      "Failed to send WhatsApp invoice message:",
      error.response?.data || error.message
    );
    return false;
  }
};
const numberToWords = (num) => {
  num = Math.floor(num);
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];
  const teens = [
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  if (num === 0) return "Zero";
  const convertLessThanThousand = (n) => {
    if (n === 0) return "";
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) {
      return (
        tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + ones[n % 10] : "")
      );
    }
    return (
      ones[Math.floor(n / 100)] +
      " Hundred" +
      (n % 100 !== 0 ? " " + convertLessThanThousand(n % 100) : "")
    );
  };
  const convert = (n) => {
    if (n === 0) return "";
    if (n >= 10000000) {
      return (
        convertLessThanThousand(Math.floor(n / 10000000)) +
        " Crore" +
        (n % 10000000 !== 0 ? " " + convert(n % 10000000) : "")
      );
    }
    if (n >= 100000) {
      return (
        convertLessThanThousand(Math.floor(n / 100000)) +
        " Lakh" +
        (n % 100000 !== 0 ? " " + convert(n % 100000) : "")
      );
    }
    if (n >= 1000) {
      return (
        convertLessThanThousand(Math.floor(n / 1000)) +
        " Thousand" +
        (n % 1000 !== 0 ? " " + convertLessThanThousand(n % 1000) : "")
      );
    }
    return convertLessThanThousand(n);
  };
  return convert(num).trim() + " Rupees Only";
};
const generateInvoicePDF = (subscription) => {
  return new Promise((resolve, reject) => {
    try {
      const invoiceData = {
        number: subscription.invoice_number || `INV-${subscription.id}`,
        date: subscription.created_at.split("T")[0],
        company: {
          name: "MEET OWNER",
          address:
            "401, 8-3-6-5/1/1/4, Astral Hasini Residency, J.P. Nagar, Yella Reddy Guda",
          city: "Hyderabad",
          state: "Telangana",
          zip: "500073",
          gstin: "36AASCM6453A1ZC",
          email: "team@meetowner.in",
          phone: "+91 9701888071",
        },
        client: {
          name: subscription.name,
          mobile: subscription.mobile,
          gstin: subscription.gst_number || "N/A",
          rerain: subscription.rera_number || "N/A",
          city: subscription.city,
        },
        items: [
          {
            description: subscription.subscription_package,
            city: subscription.city,
            status: subscription.payment_status,
            gst: subscription.gst_percentage,
            mode: subscription.payment_mode,
            amount: subscription.payment_amount,
          },
        ],
        gstDetails: {
          actualAmount: subscription.actual_amount,
          gstAmount: subscription.gst,
          sgstAmount: subscription.sgst,
          TotalAmount: subscription.payment_amount,
        },
        bankDetails: {
          paymentDate: subscription.transaction_time.split("T")[0],
          paymentPlatform: subscription.payment_gateway,
          startDate: subscription.subscription_start_date.split("T")[0],
          endDate: subscription.subscription_expiry_date.split("T")[0],
        },
        terms: [
          "This invoice is valid only upon successful payment confirmation.",
          "Payments are non-refundable once completed.",
          "All amounts are in Indian Rupees (INR).",
          "All disputes are subject to jurisdiction only.",
          "This invoice is system-generated and does not require a signature.",
          "Please retain this invoice for future reference and support queries.",
        ],
      };
      const invoicesDir = path.join(__dirname, "../uploads/invoices");
      if (!fs.existsSync(invoicesDir)) {
        fs.mkdirSync(invoicesDir, { recursive: true });
      }
      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 30, bottom: 30, left: 30, right: 30 },
      });
      const outputPath = path.join(
        invoicesDir,
        `invoice-${invoiceData.number}.pdf`
      );
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);
      const drawLine = (y, thickness = 1) => {
        doc
          .lineWidth(thickness)
          .moveTo(30, y)
          .lineTo(565, y)
          .strokeColor("#e5e7eb")
          .stroke();
      };
      const formatCurrency = (amount) => {
        const num = parseFloat(amount);
        if (isNaN(num)) return "\u20B9 0.00";
        return `\u20B9 ${num.toLocaleString("en-IN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
      };
      const colors = {
        primary: "#1D3A76",
        secondary: "#4b5563",
        heading: "#1f2937",
        background: "#f3f4f6",
      };
      const fonts = {
        regular: "NotoSans-Regular",
        bold: "NotoSans-Bold",
      };
      doc.registerFont(
        "NotoSans-Regular",
        path.join(__dirname, "../assets/fonts/static/NotoSans-Regular.ttf")
      );
      doc.registerFont(
        "NotoSans-Bold",
        path.join(__dirname, "../assets/fonts/static/NotoSans-Bold.ttf")
      );
      const sizes = {
        title: 24,
        sectionTitle: 14,
        subtitle: 10,
        tableText: 10,
        total: 12,
        footer: 10,
      };
      doc
        .font(fonts.bold)
        .fontSize(sizes.title)
        .fillColor(colors.primary)
        .text("TAX INVOICE", 30, 30);
      const logoPath = path.join(__dirname, "../assets/logo.png");
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 30, 60, { width: 90, height: 40 });
      } else {
        console.warn("Logo image not found at:", logoPath);
      }
      doc
        .font(fonts.regular)
        .fontSize(sizes.subtitle)
        .fillColor(colors.secondary);
      doc.text(invoiceData.company.name, 30, 110);
      doc.text(invoiceData.company.address, 30, 124);
      doc.text(
        `${invoiceData.company.city}, ${invoiceData.company.state} ${invoiceData.company.zip}`,
        30,
        138
      );
      doc.text(`GSTIN: ${invoiceData.company.gstin}`, 30, 152);
      doc.text(`Email: ${invoiceData.company.email}`, 30, 166);
      doc.text(`Phone: ${invoiceData.company.phone}`, 30, 180);
      const invoiceInfoX = 400;
      doc
        .font(fonts.regular)
        .fontSize(sizes.subtitle)
        .fillColor(colors.primary);
      doc.text(`Invoice: ${invoiceData.number}`, invoiceInfoX, 50, {
        align: "right",
      });
      doc.text(`Date: ${invoiceData.date}`, invoiceInfoX, 64, {
        align: "right",
      });
      drawLine(200);
      doc
        .font(fonts.bold)
        .fontSize(sizes.sectionTitle)
        .fillColor(colors.heading)
        .text("Bill To:", 30, 210);
      const startX = 30;
      const startY = 230;
      const lineHeight = 14;
      doc
        .font(fonts.regular)
        .fontSize(sizes.subtitle)
        .fillColor(colors.secondary);
      doc.text(invoiceData.client.name, startX, startY);
      doc.text(
        `Mobile: ${invoiceData.client.mobile}`,
        startX,
        startY + lineHeight * 1
      );
      doc.text(
        `City: ${invoiceData.client.city}`,
        startX,
        startY + lineHeight * 2
      );
      doc.text(
        `GSTIN: ${invoiceData.client.gstin}`,
        startX,
        startY + lineHeight * 3
      );
      doc.text(
        `RERA Number: ${invoiceData.client.rerain}`,
        startX,
        startY + lineHeight * 4
      );
      const tableTop = 310;
      const colWidths = [100, 100, 100, 100, 100, 100];
      const tableX = [30, 130, 230, 330, 430, 510];
      doc.rect(30, tableTop, 580, 20).fill(colors.background);
      doc.font(fonts.bold).fontSize(sizes.tableText).fillColor(colors.heading);
      doc.text("Subscription", tableX[0], tableTop + 6);
      doc.text("City", tableX[1], tableTop + 6);
      doc.text("Status", tableX[2], tableTop + 6);
      doc.text("GST", tableX[3], tableTop + 6);
      doc.text("Mode", tableX[4], tableTop + 6);
      doc.text("Amount", tableX[5], tableTop + 6);
      drawLine(tableTop + 20);
      const rowTop = tableTop + 20;
      doc
        .font(fonts.regular)
        .fontSize(sizes.tableText)
        .fillColor(colors.secondary);
      invoiceData.items.forEach((item, index) => {
        const y = rowTop + index * 20;
        doc.text(item.description, tableX[0], y + 6);
        doc.text(item.city, tableX[1], y + 6);
        doc.text(item.status, tableX[2], y + 6);
        doc.text(`${item.gst}%`, tableX[3], y + 6);
        doc.text(item.mode, tableX[4], y + 6);
        doc.text(formatCurrency(item.amount), tableX[5], y + 6);
        drawLine(y + 20);
      });
      const totalTop = rowTop + invoiceData.items.length * 20 + 10;
      const labelX = 400;
      const amountX = 465;
      doc
        .font(fonts.regular)
        .fontSize(sizes.subtitle)
        .fillColor(colors.secondary);
      doc.text("Actual Amount:", labelX, totalTop);
      doc.text(
        formatCurrency(invoiceData.gstDetails.actualAmount),
        amountX,
        totalTop,
        { align: "right" }
      );
      doc.text("GST Amount:", labelX, totalTop + 14);
      doc.text(
        formatCurrency(invoiceData.gstDetails.gstAmount),
        amountX,
        totalTop + 14,
        { align: "right" }
      );
      doc.text("SGST Amount:", labelX, totalTop + 28);
      doc.text(
        formatCurrency(invoiceData.gstDetails.sgstAmount),
        amountX,
        totalTop + 28,
        { align: "right" }
      );
      doc.font(fonts.bold).fontSize(sizes.total).fillColor(colors.heading);
      drawLine(totalTop + 42);
      doc.text("Total:", labelX, totalTop + 50);
      doc.text(
        formatCurrency(invoiceData.gstDetails.TotalAmount),
        amountX,
        totalTop + 50,
        { align: "right" }
      );
      doc
        .font(fonts.regular)
        .fontSize(sizes.subtitle)
        .fillColor(colors.secondary);
      doc.text(
        `Amount in words: ${numberToWords(invoiceData.gstDetails.TotalAmount)}`,
        30,
        totalTop + 70
      );
      const paymentTop = totalTop + 100;
      drawLine(paymentTop);
      doc
        .font(fonts.bold)
        .fontSize(sizes.sectionTitle)
        .fillColor(colors.heading)
        .text("Payment Details:", 30, paymentTop + 10);
      doc
        .font(fonts.regular)
        .fontSize(sizes.subtitle)
        .fillColor(colors.secondary);
      doc.text(
        `Payment Date: ${invoiceData.bankDetails.paymentDate}`,
        30,
        paymentTop + 28
      );
      doc.text(
        `Platform: ${invoiceData.bankDetails.paymentPlatform}`,
        30,
        paymentTop + 42
      );
      doc.text(
        `Subscription Start Date: ${invoiceData.bankDetails.startDate}`,
        30,
        paymentTop + 56
      );
      doc.text(
        `Subscription End Date: ${invoiceData.bankDetails.endDate}`,
        30,
        paymentTop + 70
      );
      const termsTop = paymentTop + 100;
      drawLine(termsTop);
      doc
        .font(fonts.bold)
        .fontSize(sizes.sectionTitle)
        .fillColor(colors.heading)
        .text("Terms and Conditions:", 30, termsTop + 10);
      doc
        .font(fonts.regular)
        .fontSize(sizes.subtitle)
        .fillColor(colors.secondary);
      invoiceData.terms.forEach((term, index) => {
        doc.text(`• ${term}`, 30, termsTop + 28 + index * 14);
      });
      const footerTop = 750;
      doc
        .font(fonts.regular)
        .fontSize(sizes.footer)
        .fillColor(colors.secondary)
        .text("Thank you for your business!", 30, footerTop, {
          align: "center",
        });
      doc.text(
        `For any queries, please contact us at ${invoiceData.company.email}`,
        30,
        footerTop + 14,
        { align: "center" }
      );
      doc.end();
      stream.on("finish", () => {
        resolve(outputPath);
      });
      stream.on("error", (err) => {
        reject(new Error(`Error generating PDF: ${err.message}`));
      });
    } catch (error) {
      reject(new Error(`Error in generateInvoicePDF: ${error.message}`));
    }
  });
};
module.exports = {
  createOrder: (req, res) => {
    const { amount, currency, user_id, city } = req.body;
    if (!user_id) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required" });
    }
    pool.execute(
      `SELECT id FROM users WHERE id = ?`,
      [user_id],
      (err, userResults) => {
        if (err) {
          console.error("DB Query Error:", err);
          return res.status(500).json({
            success: false,
            message: "Failed to check user",
          });
        }
        if (!userResults || userResults.length === 0) {
          return res
            .status(400)
            .json({ success: false, message: "User not found" });
        }
        pool.execute(
          `SELECT subscription_expiry_date, subscription_status 
           FROM payment_details 
           WHERE user_id = ? AND city = ? AND payment_status = 'success' AND subscription_status = 'active' 
           ORDER BY subscription_expiry_date DESC LIMIT 1`,
          [user_id, city],
          (err, subResults) => {
            if (err) {
              console.error("DB Query Error:", err);
              return res.status(500).json({
                success: false,
                message: "Failed to check subscription status",
              });
            }
            if (subResults && subResults.length > 0) {
              const { subscription_expiry_date, subscription_status } =
                subResults[0];
              const currentDate = moment();
              const expiryDate = moment(subscription_expiry_date);
              if (
                subscription_status === "active" &&
                expiryDate.isAfter(currentDate)
              ) {
                return res.status(400).json({
                  success: false,
                  message: "Active subscription already exists",
                  expiry_date: subscription_expiry_date,
                });
              }
            }
            const options = {
              amount: amount * 100,
              currency: currency || "INR",
              receipt: `receipt_${Date.now()}`,
              payment_capture: 1,
            };
            razorpayInstance.orders.create(options, (err, order) => {
              if (err) {
                console.error("Razorpay Error:", err);
                return res
                  .status(500)
                  .json({ success: false, message: err.message });
              }
              res.json(order);
            });
          }
        );
      }
    );
  },
  verifyPayment: async (req, res) => {
    const {
      user_id,
      user_type,
      city,
      name,
      mobile,
      email,
      subscription_package,
      listingsLimit,
      price,
      payment_amount,
      payment_reference,
      payment_mode,
      payment_gateway,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      payment_status,
    } = req.body;
    if (!user_id || !subscription_package || !payment_status) {
      logger.logError({
        message: "Missing userId or package",
        requestBody: req.body,
      });
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: user_id, subscription_package, or payment_status",
      });
    }
    const userTypeMap = {
      1: "admin",
      2: "user",
      3: "builder",
      4: "agent",
      5: "owner",
      6: "channel_partner",
      7: "manager",
      8: "telecaller",
      9: "marketing_executive",
      10: "customer_support",
      11: "customer_service",
    };
    const packageEnumMap = {
      "Free Listing": "free",
      Basic: "basic",
      Prime: "prime",
      "Prime Plus": "prime_plus",
      Custom: "custom",
    };
    const mappedPackageName = packageEnumMap[subscription_package];
    if (!mappedPackageName) {
      return res.status(400).json({
        success: false,
        message: "Invalid subscription package format",
      });
    }
    let subscription_start_date = moment().format("YYYY-MM-DD HH:mm:ss");
    let subscription_expiry_date = subscription_start_date;
    let subscription_status = "processing";
    let finalPaymentStatus = payment_status;
    const finalPaymentReference =
      finalPaymentStatus === "processing" ? payment_reference : null;
    const finalRazorpayPaymentId =
      finalPaymentStatus === "processing" ? razorpay_payment_id : null;
    const finalRazorpaySignature =
      finalPaymentStatus === "processing" ? razorpay_signature : null;
    try {
      if (finalPaymentStatus === "cancelled") {
        finalPaymentStatus = "cancelled";
        subscription_status = "inactive";
        logger.logCancelled({
          message: "User Cancelled Payment",
          error: "User Cancelled Payment",
          user_id,
          mappedPackageName,
        });
      } else if (finalPaymentStatus === "failed") {
        finalPaymentStatus = "failed";
        subscription_status = "inactive";
        logger.logFailed({
          message: "Payment Failed",
          error: "Payment Failed",
          user_id,
          mappedPackageName,
        });
      } else if (finalPaymentStatus === "processing") {
        const secret = process.env.RAZORPAY_SECRET;
        if (!secret) {
          console.error("Razorpay secret not configured");
          return res.status(500).json({
            success: false,
            message: "Server configuration error",
          });
        }
        if (razorpay_order_id && razorpay_payment_id && razorpay_signature) {
          const generated_signature = crypto
            .createHmac("sha256", secret)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest("hex");
          if (generated_signature !== razorpay_signature) {
            console.error("Signature verification failed", {
              generated_signature,
              provided_signature: razorpay_signature,
            });
            finalPaymentStatus = "failed";
            subscription_status = "inactive";
          } else {
            finalPaymentStatus = "processing";
            subscription_status = "processing";
          }
        } else {
          console.error("Missing Razorpay verification details", {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
          });
          finalPaymentStatus = "failed";
          subscription_status = "inactive";
        }
      } else {
        return res.status(400).json({
          success: false,
          message: "Invalid payment_status value",
        });
      }
      const [packageResults] = await pool.promise().execute(
        `SELECT duration_days, actual_amount, gst, sgst, gst_percentage, gst_number, rera_number 
         FROM packageNames 
         WHERE name = ? LIMIT 1`,
        [subscription_package]
      );
      if (!packageResults || packageResults.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid subscription package",
        });
      }
      const { duration_days, actual_amount, gst, sgst, gst_percentage } =
        packageResults[0];
      const [userDetailsRows] = await pool
        .promise()
        .execute(
          `SELECT gst_number, rera_number FROM users WHERE id = ? LIMIT 1`,
          [user_id]
        );
      let gst_number = null;
      let rera_number = null;
      if (userDetailsRows.length > 0) {
        gst_number = userDetailsRows[0].gst_number || "N/A";
        rera_number = userDetailsRows[0].rera_number || "N/A";
      }
      if (finalPaymentStatus === "processing") {
        subscription_expiry_date = moment()
          .add(duration_days, "days")
          .format("YYYY-MM-DD HH:mm:ss");
      }
      let invoice_number = null;
      let invoice_url = null;
      await pool.promise().query("START TRANSACTION");
      try {
        if (finalPaymentStatus === "processing") {
          const [rows] = await pool
            .promise()
            .execute(
              `SELECT invoice_number FROM invoices ORDER BY id DESC LIMIT 1 FOR UPDATE`
            );
          let nextNumber = 1;
          if (rows.length > 0 && rows[0].invoice_number) {
            const last = rows[0].invoice_number;
            nextNumber = parseInt(last.split("-")[1]) + 1;
          }
          invoice_number = `INV-${String(nextNumber).padStart(5, "0")}`;
        }
        await pool.promise().execute(
          `UPDATE users 
           SET subscription_package = ?, 
               subscription_start_date = ?, 
               subscription_expiry_date = ?, 
               subscription_status = ?
           WHERE id = ?`,
          [
            mappedPackageName,
            subscription_start_date,
            subscription_expiry_date,
            subscription_status,
            user_id,
          ]
        );
        if (
          finalPaymentStatus === "processing" &&
          subscription_package === "Custom"
        ) {
          const package_for = userTypeMap[user_type] || "unknown";
          if (!listingsLimit || isNaN(listingsLimit)) {
            throw new Error(
              "Invalid or missing listingsLimit for Custom package"
            );
          }
          if (!price || isNaN(price)) {
            throw new Error("Invalid or missing price for Custom package");
          }
          await pool.promise().execute(
            `INSERT INTO package_listing_limits
             (package_for, package_name, number_of_listings, price, user_id) 
             VALUES (?, ?, ?, ?, ?)`,
            [package_for, subscription_package, listingsLimit, price, user_id]
          );
        }
        if (finalPaymentStatus === "processing" && invoice_number) {
          const subscriptionData = {
            id: user_id,
            invoice_number,
            created_at: moment().toISOString(),
            name,
            city,
            mobile,
            gst_number: gst_number || "N/A",
            rera_number: rera_number || "N/A",
            subscription_package,
            payment_status: "success",
            gst_percentage,
            payment_mode,
            payment_amount,
            actual_amount,
            gst,
            sgst,
            transaction_time: moment().toISOString(),
            payment_gateway,
            subscription_start_date,
            subscription_expiry_date,
          };
          const pdfPath = await generateInvoicePDF(subscriptionData);
          invoice_url = `https://api.meetowner.in/uploads/invoices/invoice-${invoice_number}.pdf`;
          await pool.promise().execute(
            `INSERT INTO invoices (invoice_number, user_id, payment_status, subscription_status, invoice_url) 
             VALUES (?, ?, ?, ?, ?)`,
            [
              invoice_number,
              user_id,
              finalPaymentStatus,
              subscription_status,
              invoice_url,
            ]
          );
        }
        await pool.promise().execute(
          `INSERT INTO payment_details (
            user_id, user_type, city, name, mobile, email,
            subscription_package, subscription_start_date, subscription_expiry_date,
            subscription_status, payment_status, payment_amount,
            payment_reference, payment_mode, payment_gateway,
            razorpay_order_id, razorpay_payment_id, razorpay_signature,
            actual_amount, gst, sgst, gst_percentage, gst_number, rera_number,
            invoice_number, invoice_url
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            user_id,
            user_type || null,
            city || null,
            name || null,
            mobile || null,
            email || null,
            mappedPackageName,
            subscription_start_date,
            subscription_expiry_date,
            subscription_status,
            finalPaymentStatus,
            payment_amount || 0,
            finalPaymentReference || null,
            payment_mode || null,
            payment_gateway || null,
            razorpay_order_id || null,
            finalRazorpayPaymentId || null,
            finalRazorpaySignature || null,
            actual_amount || 0,
            gst || 0,
            sgst || 0,
            gst_percentage || 18.0,
            gst_number || null,
            rera_number || null,
            invoice_number || null,
            invoice_url || null,
          ]
        );
        await pool.promise().query("COMMIT");
        if (invoice_url) {
          await sendInvoice(name, mobile, payment_amount, invoice_url);
        }
        logger.logSuccess({
          message: "Subscription and payment recorded successfully",
          user_id,
          user_type,
          mappedPackageName,
          status: payment_status,
          amount: payment_amount,
          payment_reference,
          payment_mode,
          payment_gateway,
        });
        res.json({
          success: finalPaymentStatus === "processing",
          message:
            finalPaymentStatus === "processing"
              ? "Payment verified, invoice generated"
              : `Payment ${finalPaymentStatus}`,
          invoice_number,
          invoice_url,
        });
      } catch (err) {
        await pool.promise().query("ROLLBACK");
        console.error("Error in verifyPayment:", err);
        logger.logError({
          message: "Server error during payment verification",
          error: err,
          user_id,
          mappedPackageName,
        });
        res.status(500).json({
          success: false,
          message: "Server error during payment verification",
        });
      }
    } catch (err) {
      console.error("Error in verifyPayment:", err);
      res.status(500).json({
        success: false,
        message: "Server error during payment verification",
      });
    }
  },
  checkSubscription: (req, res) => {
    const { user_id, city } = req.body;
    if (!user_id || !city) {
      return res.status(400).json({
        success: false,
        message: "User ID and City are required",
      });
    }
    pool.execute(
      `SELECT 
        subscription_expiry_date, 
        payment_status,
        subscription_package,
        subscription_status 
       FROM payment_details 
       WHERE user_id = ? AND city = ? 
         AND payment_status = 'success' 
         AND subscription_status = 'active' 
       ORDER BY subscription_expiry_date DESC 
       LIMIT 1`,
      [user_id, city],
      (err, results) => {
        if (err) {
          console.error("DB Query Error:", err);
          return res.status(500).json({
            success: false,
            message: "Failed to check subscription status",
          });
        }
        if (!results || results.length === 0) {
          return res.status(200).json({
            success: true,
            message: "No active subscription found",
          });
        }
        const {
          subscription_expiry_date,
          subscription_status,
          payment_status,
          subscription_package,
        } = results[0];
        const currentDate = moment();
        const expiryDate = moment(subscription_expiry_date);
        const isSubscriptionActive =
          subscription_status === "active" && expiryDate.isAfter(currentDate);
        res.json({
          success: true,
          isSubscriptionActive,
          payment_status,
          subscription_package,
          expiry_date: subscription_expiry_date,
        });
      }
    );
  },
  razorpayWebhook: async (req, res) => {
    try {
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
      const signature = req.headers["x-razorpay-signature"];
      const eventId = req.headers["x-razorpay-event-id"];
      let body = req.body;
      if (typeof req.body === "string") {
        try {
          body = JSON.parse(Buffer.from(req.body, "base64").toString("utf-8"));
        } catch (err) {
          console.error("Base64 decode error:", err.message);
        }
      }
      const rawBody = Buffer.isBuffer(req.rawBody)
        ? req.rawBody
        : JSON.stringify(body);
      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(rawBody)
        .digest("hex");
      if (expectedSignature !== signature) {
        console.error("Invalid webhook signature", {
          eventId,
          signature,
          expectedSignature,
        });
        return res
          .status(400)
          .json({ success: false, message: "Invalid webhook signature" });
      }
      const event = body.event;
      if (event === "payment_link.paid") {
        const linkEntity = body.payload?.payment_link?.entity;
        const paymentEntity = body.payload?.payment?.entity;
        if (!linkEntity || !paymentEntity) {
          console.error("Missing payment_link or payment entity", {
            eventId,
            body,
          });
          return res
            .status(400)
            .json({ success: false, message: "Invalid webhook payload" });
        }
        const paymentData = {
          user_id: linkEntity.notes?.user_id || "",
          user_type: linkEntity.notes?.user_type || "",
          name: linkEntity.notes?.name || "",
          mobile: linkEntity.notes?.mobile || "",
          email: linkEntity.notes?.email || "",
          subscription_package: linkEntity.notes?.subscription_package || "",
          listingsLimit:
            linkEntity.notes?.subscription_package.listingsLimit || "",
          price: linkEntity.notes?.subscription_package.price || "",
          payment_amount: linkEntity.amount / 100,
          payment_reference: linkEntity.id,
          payment_mode: "razorpay_link",
          payment_gateway: "razorpay",
          razorpay_payment_link_id: linkEntity.id,
          razorpay_payment_id: paymentEntity.id || "",
          razorpay_order_id: paymentEntity.order_id || "",
          razorpay_signature:
            paymentEntity.razorpay_signature ||
            linkEntity.razorpay_signature ||
            "",
          payment_status:
            paymentEntity.status === "captured" ? "captured" : "processing",
          city: linkEntity.notes.city,
        };
        try {
          await axios.post(
            "https://api.meetowner.in/payments/verifyPaymentLink",
            paymentData,
            { timeout: 10000 }
          );
          return res
            .status(200)
            .json({ success: true, message: "Webhook handled" });
        } catch (err) {
          console.error("verifyPaymentLink API error:", {
            eventId,
            user_id: paymentData.user_id,
            error: err.response?.data || err.message,
            status: err.response?.status,
          });
          return res
            .status(500)
            .json({ success: false, message: "Failed to process payment" });
        }
      }
      return res.status(200).json({ success: true, message: "Event ignored" });
    } catch (error) {
      console.error("Webhook error:", {
        error: error.message,
        eventId: req.headers["x-razorpay-event-id"],
      });
      return res.status(500).json({ success: false, message: "Server error" });
    }
  },
  updateSubscription: async (req, res) => {
    const user_id = req.body.user_id || req.query.user_id;
    const subscription_status = req.body.subscription_status;
    const payment_status = req.body.payment_status;
    if (!user_id || !subscription_status || !payment_status) {
      return res.status(400).json({
        success: false,
        message:
          "User ID, subscription status, and payment status are required",
      });
    }
    try {
      const [subscriptions] = await pool.promise().execute(
        `SELECT id, name, mobile,payment_amount,invoice_url,invoice_number  FROM payment_details 
         WHERE user_id = ? 
         ORDER BY created_at DESC LIMIT 1`,
        [user_id]
      );
      if (!subscriptions || subscriptions.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No subscriptions found",
        });
      }
      const {
        id: paymentId,
        name,
        mobile,
        payment_amount,
        invoice_url,
        invoice_number,
      } = subscriptions[0];
      await pool.promise().execute(
        `UPDATE payment_details 
         SET payment_status = ?, subscription_status = ? 
         WHERE id = ?`,
        [payment_status, subscription_status, paymentId]
      );
      await pool.promise().execute(
        `UPDATE invoices 
         SET payment_status = ?, subscription_status = ? 
         WHERE invoice_number = ?`,
        [payment_status, subscription_status, invoice_number]
      );
      await pool
        .promise()
        .execute(`UPDATE users SET subscription_status = ? WHERE id = ?`, [
          subscription_status,
          user_id,
        ]);
      if (name && mobile && invoice_url) {
        await sendInvoice(name, mobile, payment_amount, invoice_url);
        await sendWhatsappLeads(name, mobile);
      }
      return res.status(200).json({
        success: true,
        message: `Subscription and payment updated.`,
      });
    } catch (err) {
      console.error("Error updating subscription:", err);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  },
  createPaymentLink: (req, res) => {
    const {
      amount,
      currency = "INR",
      user_id,
      user_type,
      name,
      mobile,
      email,
      city,
      subscription_package,
    } = req.body;
    if (
      !user_id ||
      !email ||
      !mobile ||
      !amount ||
      !subscription_package ||
      !city
    ) {
      return res.status(400).json({
        success: false,
        message:
          "user_id, email, mobile, amount, subscription_package, and city are required",
      });
    }
    const validPackages = [
      "Free Listing",
      "Basic",
      "Prime",
      "Prime Plus",
      "Custom",
    ];
    if (subscription_package === "Custom" && amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Custom package must have a valid amount",
      });
    }
    if (!validPackages.includes(subscription_package)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subscription_package",
      });
    }
    pool.execute(
      `SELECT id FROM users WHERE id = ?`,
      [user_id],
      (err, userResults) => {
        if (err) {
          console.error("DB Query Error:", err);
          return res.status(500).json({
            success: false,
            message: "Failed to check user existence",
          });
        }
        if (!userResults || userResults.length === 0) {
          return res
            .status(404)
            .json({ success: false, message: "User not found" });
        }
        pool.execute(
          `SELECT subscription_expiry_date, subscription_status 
           FROM payment_details 
           WHERE user_id = ? AND city = ? AND payment_status = 'success' AND subscription_status = 'active'
           ORDER BY subscription_expiry_date DESC LIMIT 1`,
          [user_id, city],
          (err, paymentResults) => {
            if (err) {
              console.error("DB Query Error - payment_details:", err);
              return res.status(500).json({
                success: false,
                message: "Failed to check existing subscriptions",
              });
            }
            if (paymentResults && paymentResults.length > 0) {
              const { subscription_expiry_date, subscription_status } =
                paymentResults[0];
              const currentDate = moment();
              const expiryDate = moment(subscription_expiry_date);
              if (
                subscription_status === "active" &&
                expiryDate.isAfter(currentDate)
              ) {
                return res.status(400).json({
                  success: false,
                  message: "Active subscription already exists",
                  expiry_date: subscription_expiry_date,
                });
              }
            }
            const options = {
              amount: Math.round(amount * 100),
              currency,
              accept_partial: false,
              description: `Subscription Payment - ${subscription_package}`,
              customer: {
                name: name,
                email: email,
                contact: mobile,
              },
              notify: {
                sms: true,
                email: true,
              },
              reminder_enable: true,
              callback_url: "https://meetowner.in/",
              callback_method: "get",
              notes: {
                user_id,
                user_type,
                name,
                mobile,
                email,
                city,
                subscription_package,
                payment_amount: amount,
              },
              expire_by: moment().add(7, "days").unix(),
            };
            razorpayInstance.paymentLink.create(options, (err, link) => {
              if (err) {
                console.error("Razorpay Payment Link Error:", err);
                return res.status(500).json({
                  success: false,
                  message:
                    err.error?.description || "Failed to create payment link",
                });
              }
              return res.status(200).json({
                success: true,
                payment_link: link.short_url,
                link_details: link,
              });
            });
          }
        );
      }
    );
  },
  verifyPaymentLink: async (req, res) => {
    const {
      user_id,
      user_type,
      name,
      mobile,
      email,
      city,
      subscription_package,
      listingsLimit,
      price,
      payment_amount,
      payment_reference,
      payment_mode,
      payment_gateway,
      razorpay_payment_link_id,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      payment_status,
    } = req.body;
    if (
      !user_id ||
      !subscription_package ||
      !payment_status ||
      !razorpay_payment_id
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: user_id, subscription_package, payment_status, or razorpay_payment_id",
      });
    }
    const userTypeMap = {
      1: "admin",
      2: "user",
      3: "builder",
      4: "agent",
      5: "owner",
      6: "channel_partner",
      7: "manager",
      8: "telecaller",
      9: "marketing_executive",
      10: "customer_support",
      11: "customer_service",
    };
    const packageEnumMap = {
      "Free Listing": "free",
      Basic: "basic",
      Prime: "prime",
      "Prime Plus": "prime_plus",
      Custom: "custom",
    };
    const mappedPackageName = packageEnumMap[subscription_package];
    if (!mappedPackageName) {
      return res.status(400).json({
        success: false,
        message: "Invalid subscription package format",
      });
    }
    try {
      const [existingPayments] = await pool
        .promise()
        .execute(
          `SELECT id FROM payment_details WHERE razorpay_payment_id = ? OR payment_reference = ?`,
          [razorpay_payment_id, payment_reference || razorpay_payment_link_id]
        );
      if (existingPayments.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Payment already processed",
        });
      }
      const [packageResults] = await pool.promise().execute(
        `SELECT duration_days, actual_amount, gst, sgst, gst_percentage
         FROM packageNames 
         WHERE name = ? LIMIT 1`,
        [subscription_package]
      );
      if (!packageResults || packageResults.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid subscription package",
        });
      }
      const { duration_days, actual_amount, gst, sgst, gst_percentage } =
        packageResults[0];
      const [userDetailsRows] = await pool
        .promise()
        .execute(
          `SELECT gst_number, rera_number FROM users WHERE id = ? LIMIT 1`,
          [user_id]
        );
      let gst_number = null;
      let rera_number = null;
      if (userDetailsRows.length > 0) {
        gst_number = userDetailsRows[0].gst_number || "N/A";
        rera_number = userDetailsRows[0].rera_number || "N/A";
      }
      let subscription_start_date = moment().format("YYYY-MM-DD HH:mm:ss");
      let subscription_expiry_date = subscription_start_date;
      let subscription_status = "processing";
      let finalPaymentStatus = payment_status;
      if (payment_status === "cancelled" || payment_status === "failed") {
        finalPaymentStatus = payment_status;
        subscription_status = "inactive";
      } else if (payment_status === "captured") {
        subscription_status = "active";
        subscription_expiry_date = moment()
          .add(duration_days, "days")
          .format("YYYY-MM-DD HH:mm:ss");
        finalPaymentStatus = "processing";
      }
      let invoice_number = null;
      let invoice_url = null;
      await pool.promise().query("START TRANSACTION");
      try {
        if (finalPaymentStatus === "processing") {
          const [rows] = await pool
            .promise()
            .execute(
              `SELECT invoice_number FROM invoices ORDER BY id DESC LIMIT 1 FOR UPDATE`
            );
          let nextNumber = 1;
          if (rows.length > 0 && rows[0].invoice_number) {
            const last = rows[0].invoice_number;
            nextNumber = parseInt(last.split("-")[1]) + 1;
          }
          invoice_number = `INV-${String(nextNumber).padStart(5, "0")}`;
        }
        await pool.promise().execute(
          `UPDATE users 
           SET subscription_package = ?, 
               subscription_start_date = ?, 
               subscription_expiry_date = ?, 
               subscription_status = ?
           WHERE id = ?`,
          [
            mappedPackageName,
            subscription_start_date,
            subscription_expiry_date,
            subscription_status,
            user_id,
          ]
        );
        if (
          finalPaymentStatus === "processing" &&
          subscription_package === "Custom"
        ) {
          const package_for = user_type || "unknown";
          if (!listingsLimit || isNaN(listingsLimit)) {
            throw new Error(
              "Invalid or missing listingsLimit for Custom package"
            );
          }
          if (!price || isNaN(price)) {
            throw new Error("Invalid or missing price for Custom package");
          }
          await pool.promise().execute(
            `INSERT INTO package_listing_limits
             (package_for, package_name, number_of_listings, price, user_id) 
             VALUES (?, ?, ?, ?, ?)`,
            [package_for, subscription_package, listingsLimit, price, user_id]
          );
        }
        if (finalPaymentStatus === "processing" && invoice_number) {
          const subscriptionData = {
            id: user_id,
            invoice_number,
            user_type: user_type,
            created_at: moment().toISOString(),
            name,
            mobile,
            city,
            gst_number: gst_number || "N/A",
            rera_number: rera_number || "N/A",
            subscription_package,
            payment_status: "success",
            gst_percentage,
            payment_mode,
            payment_amount,
            actual_amount,
            gst,
            sgst,
            transaction_time: moment().toISOString(),
            payment_gateway,
            subscription_start_date,
            subscription_expiry_date,
          };
          const pdfPath = await generateInvoicePDF(subscriptionData);
          invoice_url = `https://api.meetowner.in/uploads/invoices/invoice-${invoice_number}.pdf`;
          await pool.promise().execute(
            `INSERT INTO invoices (invoice_number, user_id, payment_status, subscription_status, invoice_url) 
             VALUES (?, ?, ?, ?, ?)`,
            [
              invoice_number,
              user_id,
              finalPaymentStatus,
              subscription_status,
              invoice_url,
            ]
          );
        }
        await pool.promise().execute(
          `INSERT INTO payment_details (
            user_id, user_type, city, name, mobile, email,
            subscription_package, subscription_start_date, subscription_expiry_date,
            subscription_status, payment_status, payment_amount,
            payment_reference, payment_mode, payment_gateway,
            razorpay_order_id, razorpay_payment_id, razorpay_signature,
            actual_amount, gst, sgst, gst_percentage, gst_number, rera_number,
            invoice_number, invoice_url
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            user_id,
            user_type || null,
            city || null,
            name || null,
            mobile || null,
            email || null,
            mappedPackageName,
            subscription_start_date,
            subscription_expiry_date,
            subscription_status,
            finalPaymentStatus,
            payment_amount || 0,
            payment_reference || razorpay_payment_link_id,
            payment_mode || "razorpay_link",
            payment_gateway || "razorpay",
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            actual_amount || 0,
            gst || 0,
            sgst || 0,
            gst_percentage || 18.0,
            gst_number || null,
            rera_number || null,
            invoice_number || null,
            invoice_url || null,
          ]
        );
        await pool.promise().query("COMMIT");
        if (invoice_url) {
          await sendInvoice(name, mobile, payment_amount, invoice_url);
        }
        return res.json({
          success: finalPaymentStatus === "processing",
          message:
            finalPaymentStatus === "processing"
              ? "Payment verified, invoice generated"
              : `Payment ${finalPaymentStatus}`,
          invoice_number,
          invoice_url,
        });
      } catch (err) {
        await pool.promise().query("ROLLBACK");
        console.error("Error in verifyPaymentLink:", err);
        return res.status(500).json({
          success: false,
          message: "Server error during payment processing",
        });
      }
    } catch (err) {
      console.error("Error in verifyPaymentLink:", err);
      return res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  },
  getPaymentDetailsByID: (req, res) => {
    const { invoice_number } = req.query;
    if (!invoice_number) {
      return res.status(400).json({ error: "invoice_number is required" });
    }
    const query = `
      SELECT * 
      FROM payment_details 
      WHERE invoice_number = ?
      ORDER BY created_at DESC
    `;
    pool.query(query, [invoice_number], (err, results) => {
      if (err) {
        console.error("Error fetching invoice data:", err);
        return res.status(500).json({ error: "Database error" });
      }
      res.status(200).json(results);
    });
  },
  getInvoiceByID: (req, res) => {
    const { invoice_number } = req.query;
    if (!invoice_number) {
      return res.status(400).json({ error: "invoice_number is required" });
    }
    const query = `
      SELECT * 
      FROM invoices 
      WHERE invoice_number = ?
      ORDER BY created_at DESC
    `;
    pool.query(query, [invoice_number], (err, results) => {
      if (err) {
        console.error("Error fetching invoice data:", err);
        return res.status(500).json({ error: "Database error" });
      }
      res.status(200).json(results);
    });
  },
  getAllInvoicesByID: (req, res) => {
    const { user_id } = req.query;
    if (!user_id) {
      return res.status(400).json({ error: "user_id is required" });
    }
    const query = `
      SELECT 
        i.*, 
        (
          SELECT pd.subscription_start_date 
          FROM payment_details pd 
          WHERE pd.user_id = i.user_id 
            AND pd.subscription_start_date <= i.created_at
          ORDER BY pd.subscription_start_date DESC 
          LIMIT 1
        ) AS subscription_start_date,
        (
          SELECT pd.subscription_expiry_date 
          FROM payment_details pd 
          WHERE pd.user_id = i.user_id 
            AND pd.subscription_start_date <= i.created_at
          ORDER BY pd.subscription_start_date DESC 
          LIMIT 1
        ) AS subscription_expiry_date,
        (
          SELECT pd.payment_amount 
          FROM payment_details pd 
          WHERE pd.user_id = i.user_id 
            AND pd.subscription_start_date <= i.created_at
          ORDER BY pd.subscription_start_date DESC 
          LIMIT 1
        ) AS payment_amount,
        (
          SELECT pd.subscription_package 
          FROM payment_details pd 
          WHERE pd.user_id = i.user_id 
            AND pd.subscription_start_date <= i.created_at
          ORDER BY pd.subscription_start_date DESC 
          LIMIT 1
        ) AS subscription_package
      FROM invoices i
      WHERE i.user_id = ?
      ORDER BY i.created_at DESC
    `;
    pool.query(query, [user_id], (err, results) => {
      if (err) {
        console.error("Error fetching merged data:", err);
        return res.status(500).json({ error: "Database error" });
      }
      res.status(200).json({ invoices: results });
    });
  },
  expiringSoonPackage: (req, res) => {
    const { user_id } = req.query;
    if (!user_id) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required" });
    }
    pool.execute(
      `SELECT subscription_expiry_date, subscription_status FROM users WHERE id = ?`,
      [user_id],
      (err, results) => {
        if (err) {
          console.error("DB Query Error:", err);
          return res.status(500).json({
            success: false,
            message: "Failed to check subscription expiry",
          });
        }
        if (!results || results.length === 0) {
          return res
            .status(400)
            .json({ success: false, message: "User not found" });
        }
        const { subscription_expiry_date, subscription_status } = results[0];
        const currentDate = moment();
        const expiryDate = moment(subscription_expiry_date);
        if (
          subscription_status === "active" &&
          expiryDate.isAfter(currentDate)
        ) {
          const daysLeft = expiryDate.diff(currentDate, "days");
          if (daysLeft <= 7) {
            const formattedDate = expiryDate.format(
              "DD MMMM YYYY [at] hh:mm A"
            );
            return res.status(200).json({
              success: true,
              expiringSoon: true,
              message: `Your subscription will expire on ${formattedDate}`,
              expiry_date: subscription_expiry_date,
            });
          }
          return res.status(200).json({
            success: true,
            expiringSoon: false,
            message: "Your subscription is active and not expiring soon.",
            expiry_date: subscription_expiry_date,
          });
        }
        return res.status(200).json({
          success: false,
          expiringSoon: false,
          message: "Subscription is inactive or already expired.",
          expiry_date: subscription_expiry_date,
        });
      }
    );
  },
  getAllExpiringSoon: (req, res) => {
    const query = `
      SELECT 
        u.id AS user_id, 
        u.name, 
        u.email,
        u.mobile,
        u.user_type,
        u.subscription_package,
        u.subscription_expiry_date,
        p.id AS payment_id,
        p.payment_amount,
        p.payment_status,
        p.city,
        p.created_at AS payment_date
      FROM users u
      LEFT JOIN (
        SELECT pd.*
        FROM payment_details pd
        JOIN (
          SELECT user_id, MAX(created_at) AS latest_payment
          FROM payment_details
          GROUP BY user_id
        ) latest ON pd.user_id = latest.user_id AND pd.created_at = latest.latest_payment
      ) p ON u.id = p.user_id
      WHERE u.subscription_status = 'active'
        AND u.subscription_expiry_date > NOW()
        AND u.subscription_expiry_date <= DATE_ADD(NOW(), INTERVAL 7 DAY)
    `;
    pool.query(query, (err, results) => {
      if (err) {
        console.error("DB Query Error:", err);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch expiring subscriptions",
        });
      }
      if (!results || results.length === 0) {
        return res.status(200).json({
          success: true,
          expiringSoon: false,
          message: "No subscriptions are expiring within 7 days.",
          users: [],
        });
      }
      const users = results.map((user) => {
        const expiryFormatted = moment(user.subscription_expiry_date).format(
          "DD MMMM YYYY [at] hh:mm A"
        );
        return {
          ...user,
          message: `Subscription will expire on ${expiryFormatted}`,
        };
      });
      return res.status(200).json({
        success: true,
        expiringSoon: true,
        total: users.length,
        users,
      });
    });
  },
  getAllSubscriptionDetails: async (req, res) => {
    const { user_id } = req.query;
    if (!user_id) {
      return res.status(400).json({ error: "Missing user_id parameter" });
    }
    try {
      const query = `
        SELECT * FROM payment_details 
        WHERE user_id = ? 
        AND subscription_status IN ('active', 'processing')
        ORDER BY id DESC
      `;
      const [results] = await pool.promise().query(query, [user_id]);
      return res.status(200).json({ subscriptions: results });
    } catch (error) {
      console.error("Error fetching subscription details:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  },
  getAllSubscriptionsHistory: async (req, res) => {
    const { user_id, city } = req.query;
    if (!user_id) {
      return res.status(400).json({ error: "Missing user_id parameter" });
    }
    const userTypeMap = {
      1: "admin",
      2: "user",
      3: "builder",
      4: "agent",
      5: "owner",
      6: "channel_partner",
      7: "manager",
      8: "telecaller",
      9: "marketing_executive",
      10: "customer_support",
      11: "customer_service",
    };
    try {
      const userQuery = `SELECT user_type, name, email, mobile, city FROM users WHERE id = ?`;
      const [userResult] = await pool.promise().query(userQuery, [user_id]);
      if (!userResult.length) {
        return res.status(404).json({ error: "User not found" });
      }
      const { user_type, name, email, mobile, city: userCity } = userResult[0];
      const userTypeKey = userTypeMap[user_type] || "unknown";
      let subscriptionQuery = `
        SELECT 
          id,
          name,
          user_id,
          user_type,
          mobile,
          email,
          subscription_package,
          subscription_start_date,
          subscription_expiry_date,
          subscription_status,
          payment_status,
          payment_amount,
          payment_mode,
          payment_gateway,
          transaction_time,
          city,
          invoice_number,
          invoice_url,
          actual_amount,
          gst,
          sgst,
          gst_percentage,
          gst_number,
          rera_number
        FROM payment_details 
        WHERE user_id = ?
      `;
      const queryParams = [user_id];
      if (city) {
        subscriptionQuery += ` AND city = ?`;
        queryParams.push(city);
      }
      subscriptionQuery += ` ORDER BY created_at DESC`;
      const [subscriptions] = await pool
        .promise()
        .query(subscriptionQuery, queryParams);
      let leadsCountQuery = `
        SELECT COUNT(*) AS leadsCount
        FROM contact_seller cs
        LEFT JOIN properties p ON cs.unique_property_id = p.unique_property_id
        WHERE p.user_id = ?
      `;
      const leadsCountParams = [user_id];
      if (city) {
        leadsCountQuery += ` AND p.city_id = ?`;
        leadsCountParams.push(city);
      }
      if (!subscriptions.length) {
        let uploadedCount = 0;
        if (city) {
          const propertyCountQuery = `SELECT COUNT(*) AS count FROM properties WHERE user_id = ? AND city_id = ?`;
          const [propertyCountResult] = await pool
            .promise()
            .query(propertyCountQuery, [user_id, city]);
          uploadedCount = propertyCountResult[0].count;
        } else {
          const propertyCountQuery = `SELECT COUNT(*) AS count FROM properties WHERE user_id = ?`;
          const [propertyCountResult] = await pool
            .promise()
            .query(propertyCountQuery, [user_id]);
          uploadedCount = propertyCountResult[0].count;
        }
        const [limitResult] = await pool
          .promise()
          .query(
            `SELECT number_of_listings FROM package_listing_limits WHERE package_name = ? AND package_for = ?`,
            ["Free Listing", userTypeKey]
          );
        const allowedListings = limitResult.length
          ? limitResult[0].number_of_listings
          : 0;
        const remaining = Math.max(0, allowedListings - uploadedCount);
        const [leadsCountResult] = await pool
          .promise()
          .query(leadsCountQuery, leadsCountParams);
        const leadsCount = leadsCountResult[0].leadsCount;
        return res.status(200).json({
          subscriptions: [
            {
              id: null,
              name: name || null,
              user_id,
              user_type,
              mobile: mobile || null,
              email: email || null,
              subscription_package: "Free Listing",
              subscription_start_date: null,
              subscription_expiry_date: null,
              subscription_status: "inactive",
              payment_status: null,
              payment_amount: null,
              payment_mode: null,
              payment_gateway: null,
              transaction_time: null,
              city: userCity || city || null,
              invoice_number: null,
              invoice_url: null,
              actual_amount: null,
              gst: null,
              sgst: null,
              gst_percentage: null,
              gst_number: null,
              rera_number: null,
              allowedListings,
              uploadedCount,
              remaining,
              leadsCount,
              userType: userTypeKey,
            },
          ],
        });
      }
      const enhancedSubscriptions = await Promise.all(
        subscriptions.map(async (subscription) => {
          const effective_package =
            subscription.subscription_package || "Free Listing";
          const normalizedPackage = effective_package
            .trim()
            .toLowerCase()
            .replace(/ /g, "_");
          const displayPackageMap = {
            free: "Free Listing",
            free_listing: "Free Listing",
            basic: "Basic",
            prime: "Prime",
            prime_plus: "Prime Plus",
            custom: "Custom",
          };
          const displayPackage =
            displayPackageMap[normalizedPackage] || effective_package;
          let propertyCountQuery;
          let propertyCountParams;
          if (effective_package === "Free Listing" || !subscription.city) {
            propertyCountQuery = `SELECT COUNT(*) AS count FROM properties WHERE user_id = ?`;
            propertyCountParams = [user_id];
          } else {
            propertyCountQuery = `SELECT COUNT(*) AS count FROM properties WHERE user_id = ? AND city_id = ?`;
            propertyCountParams = [user_id, subscription.city];
          }
          const [propertyCountResult] = await pool
            .promise()
            .query(propertyCountQuery, propertyCountParams);
          const uploadedCount = propertyCountResult[0].count;
          const [limitResult] = await pool
            .promise()
            .query(
              `SELECT number_of_listings FROM package_listing_limits WHERE package_name = ? AND package_for = ?`,
              [displayPackage, userTypeKey]
            );
          const allowedListings = limitResult.length
            ? limitResult[0].number_of_listings
            : 0;
          const remaining = Math.max(0, allowedListings - uploadedCount);
          const [leadsCountResult] = await pool
            .promise()
            .query(leadsCountQuery, leadsCountParams);
          const leadsCount = leadsCountResult[0].leadsCount;
          return {
            ...subscription,
            subscription_package: displayPackage,
            allowedListings,
            uploadedCount,
            remaining,
            leadsCount,
            userType: userTypeKey,
          };
        })
      );
      return res.status(200).json({ subscriptions: enhancedSubscriptions });
    } catch (error) {
      console.error("Error fetching subscription details:", error);
      return res.status(500).json({
        message: "Internal Server Error",
        data: {
          subscriptions: [],
          allowedListings: 0,
          uploadedCount: 0,
          remaining: 0,
          leadsCount: 0,
        },
      });
    }
  },
};

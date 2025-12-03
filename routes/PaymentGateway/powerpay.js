const express = require("express");
const router = express.Router();
const axios = require("axios");
const crypto = require("crypto");
const CryptoJS = require("crypto-js");

const { authenticateToken } = require("../../auth/auth");
const { authenticateAdminToken } = require("../../auth/adminAuth");
const {
  User,
  adminUserWalletLog,
  GameDataLog,
} = require("../../models/users.model");
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");
const moment = require("moment");
const Decimal = require("decimal.js");
const querystring = require("querystring");
const powerpayModal = require("../../models/paymentgateway_powerpay.model");
const UserWalletLog = require("../../models/userwalletlog.model");
const Bonus = require("../../models/bonus.model");
const Promotion = require("../../models/promotion.model");
const Deposit = require("../../models/deposit.model");
const Withdraw = require("../../models/withdraw.model");
const paymentgateway = require("../../models/paymentgateway.model");
const { checkAndUpdateVIPLevel, updateUserGameLocks } = require("../users");
const PaymentGatewayTransactionLog = require("../../models/paymentgatewayTransactionLog.model");
const kioskbalance = require("../../models/kioskbalance.model");
const { updateKioskBalance } = require("../../services/kioskBalanceService");
const BankTransactionLog = require("../../models/banktransactionlog.model");
const BankList = require("../../models/banklist.model");
const LiveTransaction = require("../../models/transaction.model");

require("dotenv").config();

const powerpayMerchantCode = "dgpay_1771";
const powerpaySecret = process.env.DGPAY_SECRET;
const webURL = "https://www.bm8sg.vip/";
const powerpayAPIURL = "https://dgpayapi.pwpgbo.com";
const callbackUrl = "https://api.egm8sg.vip/api/powerpay/receivedcalled168";

function roundToTwoDecimals(num) {
  return Math.round(num * 100) / 100;
}

function generateSecurityToken(fields) {
  const concatenatedString = fields.join("");
  const hash = crypto
    .createHash("md5")
    .update(concatenatedString, "utf8")
    .digest("hex");
  return hash;
}

function generateTransactionId(prefix = "") {
  const uuid = uuidv4().replace(/-/g, "").substring(0, 16);
  return prefix ? `${prefix}${uuid}` : uuid;
}

router.post(
  "/api/powerpay/getpaymentlink",
  authenticateToken,
  async (req, res) => {
    try {
      const { trfAmt, bankCode, promotionId } = req.body;

      const userId = req.user?.userId;

      if (!trfAmt || !bankCode) {
        return res.status(200).json({
          success: false,
          message: {
            en: !trfAmt
              ? "Transfer amount is required"
              : "Please select a payment method",
            zh: !trfAmt ? "请输入转账金额" : "请选择转账方式",
            zh_hk: !trfAmt ? "麻煩輸入轉賬金額" : "麻煩老闆揀選轉帳方式",
            ms: !trfAmt
              ? "Jumlah pemindahan diperlukan"
              : "Sila pilih kaedah pembayaran",
            id: !trfAmt
              ? "Jumlah transfer diperlukan"
              : "Silakan pilih metode pembayaran",
          },
        });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(200).json({
          success: false,
          message: {
            en: "User not found. Please try again or contact customer service for assistance.",
            zh: "用户未找到，请重试或联系客服以获取帮助。",
            ms: "Pengguna tidak ditemui, sila cuba lagi atau hubungi khidmat pelanggan untuk bantuan.",
            zh_hk: "用戶未找到，請重試或聯絡客服以獲取幫助。",
            id: "Pengguna tidak ditemukan. Silakan coba lagi atau hubungi layanan pelanggan untuk bantuan.",
          },
        });
      }

      if (promotionId) {
        const promotion = await Promotion.findById(promotionId);
        if (!promotion) {
          return res.status(200).json({
            success: false,
            message: {
              en: "Promotion not found, Please try again or contact customer service for assistance.",
              zh: "找不到该优惠活动，请重试或联系客服以获取帮助。",
              zh_hk: "搵唔到呢個優惠活動，請重試或聯絡客服以獲取幫助。",
              ms: "Promosi tidak dijumpai, sila cuba lagi atau hubungi khidmat pelanggan untuk bantuan.",
              id: "Promosi tidak ditemukan, Silakan coba lagi atau hubungi layanan pelanggan untuk bantuan.",
            },
          });
        }
      }
      let refno;
      let attempts = 0;
      const maxAttempts = 5;

      do {
        refno = generateTransactionId("bm8sg");

        const existing = await powerpayModal
          .findOne({ ourRefNo: refno })
          .lean();
        if (!existing) break;
        attempts++;
      } while (attempts < maxAttempts);

      if (attempts >= maxAttempts) {
        return res.status(200).json({
          success: false,
          message: {
            en: "System busy, Please try again or contact customer service for assistance.",
            zh: "系统繁忙，请重试或联系客服以获取帮助。",
            zh_hk: "系統繁忙，請重試或聯絡客服以獲取幫助。",
            ms: "Sistem sibuk, sila cuba lagi atau hubungi khidmat pelanggan untuk bantuan.",
            id: "Sistem sibuk, Silakan coba lagi atau hubungi layanan pelanggan untuk bantuan.",
          },
        });
      }

      const reqDateTime = moment.utc().format("YYYY-MM-DD HH:mm:ss");

      const senderData = JSON.stringify({
        senderFirstName: user.fullname?.split(" ")[0] || user.username,
        senderLastName: user.fullname?.split(" ").slice(1).join(" ") || "",
        senderNo: user.phonenumber || "",
        username: user.username,
        phone: user.phonenumber || "",
        bankCode: bankCode,
      });

      const securityToken = generateSecurityToken([
        powerpayMerchantCode,
        refno,
        "P2P",
        "SGD",
        trfAmt,
        callbackUrl,
        webURL,
        reqDateTime,
        senderData,
        powerpaySecret,
      ]);

      const data = {
        opCode: powerpayMerchantCode,
        paymentType: "P2P",
        orderId: refno,
        currency: "SGD",
        amount: trfAmt,
        callbackUrl,
        redirectUrl: webURL,
        reqDateTime,
        sender: senderData,
        securityToken,
      };

      console.log(data);
      console.log(`${powerpayAPIURL}/ajax/api/v2/deposit`);

      const response = await axios.post(
        `${powerpayAPIURL}/ajax/api/v2/deposit`,
        querystring.stringify({
          opCode: powerpayMerchantCode,
          paymentType: "P2P",
          orderId: refno,
          currency: "SGD",
          amount: trfAmt,
          callbackUrl,
          redirectUrl: webURL,
          reqDateTime,
          sender: senderData,
          securityToken,
        }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );

      console.log(response.data);
      return;
      // Log only important information
      if (responseData.code !== "0") {
        console.log(`DGPay API Error: ${JSON.stringify(responseData)}`);

        return res.status(200).json({
          success: false,
          message: {
            en: "Failed to generate payment link",
            zh: "生成支付链接失败",
            ms: "Gagal menjana pautan pembayaran",
          },
        });
      }

      await Promise.all([
        // Create DGPay record
        dgPayModal.create({
          ourRefNo: refno,
          username: user.username,
          amount: trfAmt,
          bankCode,
          status: "Pending",
          platformCharge: responseData.agentFee || 0,
          remark: "-",
          promotionId: promotionId,
        }),
      ]);

      return res.status(200).json({
        success: true,
        message: {
          en: "Payment link generated successfully",
          zh: "支付链接生成成功",
          ms: "Pautan pembayaran berjaya dijana",
        },
        url: responseData.paymentUrl,
      });
    } catch (error) {
      console.error(
        `Error in DGPay API - User: ${req.user?.userId}, Amount: ${req.body?.trfAmt}:`,
        error.response?.data || error.message
      );

      return res.status(200).json({
        success: false,
        message: {
          en: "Failed to generate payment link",
          zh: "生成支付链接失败",
          ms: "Gagal menjana pautan pembayaran",
        },
      });
    }
  }
);

function getOrderIdBeforeAt(orderId) {
  if (!orderId) return "";
  return orderId.split("@")[0];
}

router.post("/api/dgpay/receivedcalled168", async (req, res) => {
  try {
    const { orderId, amount, status } = req.body;

    if (!orderId || amount === undefined || status === undefined) {
      console.log("Missing required parameters:", { orderId, amount, status });
      return res.status(200).json({
        code: "100",
        description: "Missing required parameters",
      });
    }

    const statusMapping = {
      "-20": "Expired",
      "-10": "Reject",
      0: "Pending",
      5: "Pending Verification",
      10: "Processing",
      20: "Success",
    };

    const statusCode = String(status);
    const statusText = statusMapping[statusCode] || "Unknown";

    const cleanOrderId = getOrderIdBeforeAt(orderId);

    const existingTrx = await dgPayModal.findOne({ ourRefNo: cleanOrderId });

    if (!existingTrx) {
      console.log(`Transaction not found: ${orderId}, creating record`);
      await dgPayModal.create({
        username: "N/A",
        ourRefNo: cleanOrderId,
        amount: Number(amount),
        status: statusText,
        remark: `No transaction found with reference: ${orderId}. Created from callback.`,
        createdAt: new Date(),
      });

      return res.status(200).json({
        code: "0",
        description: "Created new transaction record",
      });
    }

    if (status === "20" && existingTrx.status === "Success") {
      console.log("Transaction already processed successfully, skipping");
      return res.status(200).json({
        status: true,
        message: "Transaction already processed successfully",
      });
    }

    if (status === "20" && existingTrx.status !== "Success") {
      const user = await User.findOne({ username: existingTrx.username });

      const setObject = {
        lastdepositdate: new Date(),
        ...(user &&
          !user.firstDepositDate && {
            firstDepositDate: existingTrx.createdAt,
          }),
      };

      const updatedUser = await User.findOneAndUpdate(
        { _id: user._id },
        {
          $inc: {
            wallet: roundToTwoDecimals(Number(amount)),
            totaldeposit: roundToTwoDecimals(Number(amount)),
          },
          $set: setObject,
        },
        { new: true }
      );

      const isNewDeposit =
        !updatedUser.firstDepositDate ||
        updatedUser.firstDepositDate.getTime() ===
          existingTrx.createdAt.getTime();

      const [newDeposit, updatedTrx, newWalletLog] = await Promise.all([
        Deposit.create({
          userId: user._id,
          username: user.username || "unknown",
          fullname: user.fullname || "unknown",
          bankname: "DGPAY",
          ownername: "Payment Gateway",
          transfernumber: uuidv4(),
          walletType: "Main",
          transactionType: "deposit",
          method: "auto",
          processBy: "admin",
          amount: Number(amount),
          remark: "-",
          transactionId: cleanOrderId,
          status: "approved",
          processtime: "00:00:00",
          newDeposit: isNewDeposit,
        }),

        // Update transaction status
        dgPayModal.findByIdAndUpdate(
          existingTrx._id,
          { $set: { status: statusText } },
          { new: true }
        ),

        UserWalletLog.create({
          userId: user._id,
          transactionid: cleanOrderId,
          transactiontime: new Date(),
          transactiontype: "deposit",
          amount: Number(amount),
          status: "approved",
        }),
      ]);

      global.sendNotificationToUser(
        user._id,
        {
          en: `Deposit MYR ${roundToTwoDecimals(Number(amount))} approved`,
          ms: `Deposit MYR ${roundToTwoDecimals(
            Number(amount)
          )} telah diluluskan`,
          zh: `存款 MYR ${roundToTwoDecimals(Number(amount))} 已批准`,
        },
        {
          en: "Deposit Approved",
          ms: "Deposit Diluluskan",
          zh: "存款已批准",
        }
      );

      setImmediate(() => {
        try {
          checkAndUpdateVIPLevel(user._id).catch((error) => {
            console.error(
              `Error checking/updating VIP level for user ${user._id}:`,
              error
            );
          });
        } catch (vipError) {
          console.error(
            `Error in VIP level check for user ${user._id}:`,
            vipError
          );
        }
      });

      if (
        parseFloat(amount) === 30 &&
        updatedUser.luckySpinAmount > 0 &&
        updatedUser.luckySpinClaim === false
      ) {
        submitLuckySpin(
          updatedUser._id,
          newDeposit._id,
          "pending",
          "manual",
          "PENDING",
          "manual"
        ).catch((error) => {
          console.error("Error submitting lucky spin:", error);
        });
      }

      // Handle promotion if applicable
      if (existingTrx.promotionId) {
        try {
          const promotion = await Promotion.findById(existingTrx.promotionId);

          if (!promotion) {
            console.log("DGPAY, couldn't find promotion");
            // Don't return here, continue processing the rest of the callback
          } else {
            // Calculate bonus amount
            let bonusAmount = 0;
            if (promotion.claimtype === "Percentage") {
              bonusAmount =
                (Number(amount) * parseFloat(promotion.bonuspercentage)) / 100;
              if (promotion.maxbonus > 0 && bonusAmount > promotion.maxbonus) {
                bonusAmount = promotion.maxbonus;
              }
            } else if (promotion.claimtype === "Exact") {
              bonusAmount = parseFloat(promotion.bonusexact);
              if (promotion.maxbonus > 0 && bonusAmount > promotion.maxbonus) {
                bonusAmount = promotion.maxbonus;
              }
            }

            if (bonusAmount > 0) {
              const [
                GW99Result,
                AlipayResult,
                LionKingResult,
                Mega888Result,
                Pussy888Result,
              ] = await Promise.all([
                checkGW99Balance(user.username).catch((error) => ({
                  success: false,
                  error: error.message || "Connection failed",
                  balance: 0,
                })),
                checkAlipayBalance(user.username).catch((error) => ({
                  success: false,
                  error: error.message || "Connection failed",
                  balance: 0,
                })),
                checkLionKingBalance(user.username).catch((error) => ({
                  success: false,
                  error: error.message || "Connection failed",
                  balance: 0,
                })),
                checkMEGA888Balance(user.username).catch((error) => ({
                  success: false,
                  error: error.message || "Connection failed",
                  balance: 0,
                })),
                checkPussy888Balance(user.username).catch((error) => ({
                  success: false,
                  error: error.message || "Connection failed",
                  balance: 0,
                })),
              ]);

              const balanceFetchErrors = {};

              let totalGameBalance = 0;

              if (GW99Result.success && GW99Result.balance != null) {
                totalGameBalance += Number(GW99Result.balance) || 0;
              } else {
                console.error("GW99 balance check error:", GW99Result);
                balanceFetchErrors.gw99 = {
                  error: GW99Result.error || "Failed to fetch balance",
                  // timestamp: new Date().toISOString(),
                };
              }

              if (AlipayResult.success && AlipayResult.balance != null) {
                totalGameBalance += Number(AlipayResult.balance) || 0;
              } else {
                console.error("Alipay balance check error:", AlipayResult);
                balanceFetchErrors.alipay = {
                  error: AlipayResult.error || "Failed to fetch balance",
                  // timestamp: new Date().toISOString(),
                };
              }

              if (LionKingResult.success && LionKingResult.balance != null) {
                totalGameBalance += Number(LionKingResult.balance) || 0;
              } else {
                console.error("LionKing balance check error:", LionKingResult);
                balanceFetchErrors.lionking = {
                  error: LionKingResult.error || "Failed to fetch balance",
                  // timestamp: new Date().toISOString(),
                };
              }

              if (Mega888Result.success && Mega888Result.balance != null) {
                totalGameBalance += Number(Mega888Result.balance) || 0;
              } else {
                console.error("MEGA888 balance check error:", Mega888Result);
                balanceFetchErrors.mega888 = {
                  error: Mega888Result.error || "Failed to fetch balance",
                  // timestamp: new Date().toISOString(),
                };
              }

              if (Pussy888Result.success && Pussy888Result.balance != null) {
                totalGameBalance += Number(Pussy888Result.balance) || 0;
              } else {
                console.error("PUSSY888 balance check error:", Pussy888Result);
                balanceFetchErrors.pussy888 = {
                  error: Pussy888Result.error || "Failed to fetch balance",
                  // timestamp: new Date().toISOString(),
                };
              }

              const totalWalletAmount =
                Number(user.wallet || 0) + totalGameBalance;

              // Create bonus transaction
              const bonusTransactionId = uuidv4();

              // Process bonus in parallel
              await Promise.all([
                Bonus.create({
                  transactionId: bonusTransactionId,
                  userId: user._id,
                  username: user.username,
                  fullname: user.fullname,
                  transactionType: "bonus",
                  processBy: "admin",
                  amount: bonusAmount,
                  walletamount: totalWalletAmount,
                  status: "pending",
                  method: "manual",
                  remark: "-",
                  promotionname: promotion.maintitle,
                  promotionnameEN: promotion.maintitleEN,
                  promotionId: existingTrx.promotionId,
                  depositId: newDeposit._id,
                  duplicateIP: user.duplicateIP,
                }),

                UserWalletLog.create({
                  userId: user._id,
                  transactionid: bonusTransactionId,
                  transactiontime: new Date(),
                  transactiontype: "bonus",
                  amount: Number(bonusAmount),
                  status: "pending",
                  promotionnameCN: promotion.maintitle,
                  promotionnameEN: promotion.maintitleEN,
                }),
              ]);
            }
          }
        } catch (promotionError) {
          console.error("Error processing promotion:", promotionError);
          // Continue processing to ensure callback success
        }
      }
    } else if (status !== "20") {
      await dgPayModal.findByIdAndUpdate(existingTrx._id, {
        $set: { status: statusText },
      });
    }

    return res.status(200).json({
      code: "0",
      description: "Success",
    });
  } catch (error) {
    console.error("Payment callback processing error:", {
      error: error.message,
      body: req.body,
      timestamp: moment().utc().format(),
      stack: error.stack,
    });
    return res.status(200).json({
      code: "100",
      description: "Error",
    });
  }
});

router.get("/admin/api/dgpaydata", authenticateAdminToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let dateFilter = {};

    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: moment(new Date(startDate)).utc().toDate(),
        $lte: moment(new Date(endDate)).utc().toDate(),
      };
    }

    const dgData = await dgPayModal
      .find(dateFilter)
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json({
      success: true,
      message: "DGPay retrieved successfully",
      data: dgData,
    });
  } catch (error) {
    console.error("Error retrieving user bonus DGPay:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve bonus DGPay",
      error: error.message,
    });
  }
});
module.exports = router;

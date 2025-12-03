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
const paymentCallbackUrl =
  "https://api.egm8sg.vip/api/powerpay/receivedtransferoutcalled168";
const pgBankListID = "6929c7724d6d42211caf1cf4";

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

function verifyCallbackToken(params, secretKey) {
  const expectedToken = generateSecurityToken([
    powerpayMerchantCode,
    params.orderId,
    params.amount,
    params.status,
    secretKey,
  ]);

  return expectedToken === params.securityToken;
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
        username: user.fullname,
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

      if (response.data.code !== "0") {
        console.log(`POWEREPAY API Error: ${JSON.stringify(response.data)}`);

        return res.status(200).json({
          success: false,
          message: {
            en: "Failed to generate payment link. Please try again or contact customer service for assistance.",
            zh: "生成支付链接失败，请重试或联系客服以获取帮助。",
            zh_hk: "生成支付連結失敗，麻煩老闆再試多次或者聯絡客服幫手。",
            ms: "Gagal menjana pautan pembayaran. Sila cuba lagi atau hubungi khidmat pelanggan untuk bantuan.",
            id: "Gagal membuat tautan pembayaran. Silakan coba lagi atau hubungi layanan pelanggan untuk bantuan.",
          },
        });
      }

      const BANK_CODE_DISPLAY_NAMES = {
        DBS: "DBS",
        OCBC: "OCBC",
      };

      await Promise.all([
        powerpayModal.create({
          ourRefNo: refno,
          paymentGatewayRefNo: response.data.providerRefId,
          transfername: user.fullname,
          username: user.username,
          amount: Number(trfAmt),
          transferType: BANK_CODE_DISPLAY_NAMES[bankCode] || bankCode,
          transactiontype: "deposit",
          status: "Pending",
          platformCharge: response.data.adminFee,
          remark: "-",
          promotionId: promotionId || null,
        }),
      ]);

      return res.status(200).json({
        success: true,
        message: {
          en: "Redirecting to payment page...",
          zh: "正在跳转至支付页面...",
          zh_hk: "正在跳緊去支付頁面...",
          ms: "Mengalihkan ke halaman pembayaran...",
          id: "Mengarahkan ke halaman pembayaran...",
        },
        url: response.data.paymentUrl,
      });
    } catch (error) {
      console.error(
        `Error in POWERPAY API - User: ${req.user?.userId}, Amount: ${req.body?.trfAmt}:`,
        error.response?.data || error.message
      );

      return res.status(200).json({
        success: false,
        message: {
          en: "Failed to generate payment link. Please try again or contact customer service for assistance.",
          zh: "生成支付链接失败，请重试或联系客服以获取帮助。",
          zh_hk: "生成支付連結失敗，麻煩老闆再試多次或者聯絡客服幫手。",
          ms: "Gagal menjana pautan pembayaran. Sila cuba lagi atau hubungi khidmat pelanggan untuk bantuan.",
          id: "Gagal membuat tautan pembayaran. Silakan coba lagi atau hubungi layanan pelanggan untuk bantuan.",
        },
      });
    }
  }
);

function getOrderIdBeforeAt(orderId) {
  if (!orderId) return "";
  return orderId.split("@")[0];
}

router.post("/api/powerpay/receivedcalled168", async (req, res) => {
  try {
    const { orderId, amount, status } = req.body;

    const isValidToken = verifyCallbackToken(req.body, powerpaySecret);

    if (!isValidToken) {
      console.error("POWERPAY: Invalid security token");
      return res.status(200).json({
        code: "-100",
        description: "System parameter validation error",
      });
    }

    if (!orderId || amount === undefined || status === undefined) {
      console.log("Missing required parameters:", {
        orderId,
        amount,
        status,
      });
      return res.status(200).json({
        code: "-100",
        description: "System parameter validation error",
      });
    }

    const statusMapping = {
      "-20": "Reject",
      "-10": "Reject",
      0: "Pending",
      5: "Pending",
      10: "Pending",
      20: "Success",
    };

    const statusCode = String(status);
    const statusText = statusMapping[statusCode] || "Unknown";
    const roundedAmount = roundToTwoDecimals(amount);
    const cleanOrderId = getOrderIdBeforeAt(orderId);

    const existingTrx = await powerpayModal
      .findOne(
        { paymentGatewayRefNo: orderId },
        { _id: 1, username: 1, status: 1, createdAt: 1, promotionId: 1 }
      )
      .lean();

    if (!existingTrx) {
      console.log(`Transaction not found: ${orderId}, creating record`);
      await powerpayModal.create({
        username: "N/A",
        transfername: "N/A",
        ourRefNo: orderId,
        paymentGatewayRefNo: orderId,
        amount: roundedAmount,
        transactiontype: "deposit",
        status: statusText,
        platformCharge: 0,
        remark: `No transaction found with reference: ${orderId}. Created from callback.`,
      });

      return res.status(200).json({
        code: "-100",
        description: "No transaction found",
      });
    }

    if (status === "20" && existingTrx.status === "Success") {
      console.log("Transaction already processed successfully, skipping");
      return res.status(200).json({
        code: "0",
        description: "Success",
      });
    }

    if (status === "20" && existingTrx.status !== "Success") {
      const [user, gateway, kioskSettings, bank] = await Promise.all([
        User.findOne(
          { username: existingTrx.username },
          {
            _id: 1,
            username: 1,
            fullname: 1,
            wallet: 1,
            totaldeposit: 1,
            firstDepositDate: 1,
            duplicateIP: 1,
            duplicateBank: 1,
          }
        ).lean(),

        paymentgateway
          .findOne(
            { name: { $regex: /^powerpay$/i } },
            { _id: 1, name: 1, balance: 1 }
          )
          .lean(),

        kioskbalance.findOne({}, { status: 1 }).lean(),

        BankList.findById(pgBankListID, {
          _id: 1,
          bankname: 1,
          ownername: 1,
          bankaccount: 1,
          qrimage: 1,
          currentbalance: 1,
        }).lean(),
      ]);

      if (!user) {
        console.error(`User not found: ${existingTrx.username}`);
        return res.status(200).json({
          code: "-100",
          description: "User not found",
        });
      }

      if (!bank) {
        console.error(`Bank not found: ${pgBankListID}`);
        return res.status(200).json({
          code: "-100",
          description: "Bank not found",
        });
      }

      const isNewDeposit = !user.firstDepositDate;
      const oldGatewayBalance = gateway?.balance || 0;
      const oldBankBalance = bank.currentbalance || 0;

      const [
        updatedUser,
        newDeposit,
        ,
        walletLog,
        updatedGateway,
        updatedBank,
      ] = await Promise.all([
        User.findByIdAndUpdate(
          user._id,
          {
            $inc: {
              wallet: roundedAmount,
              totaldeposit: roundedAmount,
            },
            $set: {
              lastdepositdate: new Date(),
              ...(isNewDeposit && {
                firstDepositDate: existingTrx.createdAt,
              }),
            },
          },
          { new: true, projection: { wallet: 1 } }
        ).lean(),

        Deposit.create({
          userId: user._id,
          username: user.username,
          fullname: user.fullname || "unknown",
          bankname: "POWERPAY",
          ownername: "Payment Gateway",
          transfernumber: orderId,
          walletType: "Main",
          transactionType: "deposit",
          method: "auto",
          processBy: "admin",
          amount: roundedAmount,
          walletamount: user.wallet,
          remark: "-",
          status: "approved",
          processtime: "00:00:00",
          newDeposit: isNewDeposit,
          transactionId: cleanOrderId,
          duplicateIP: user.duplicateIP,
          duplicateBank: user.duplicateBank,
        }),

        powerpayModal.findByIdAndUpdate(existingTrx._id, {
          $set: { status: statusText },
        }),

        UserWalletLog.create({
          userId: user._id,
          transactionid: cleanOrderId,
          transactiontime: new Date(),
          transactiontype: "deposit",
          amount: roundedAmount,
          status: "approved",
        }),

        paymentgateway.findOneAndUpdate(
          { name: { $regex: /^powerpay$/i } },
          { $inc: { balance: roundedAmount } },
          { new: true, projection: { _id: 1, name: 1, balance: 1 } }
        ),

        BankList.findByIdAndUpdate(
          pgBankListID,
          [
            {
              $set: {
                totalDeposits: { $add: ["$totalDeposits", roundedAmount] },
                currentbalance: {
                  $subtract: [
                    {
                      $add: [
                        "$startingbalance",
                        { $add: ["$totalDeposits", roundedAmount] },
                        "$totalCashIn",
                      ],
                    },
                    {
                      $add: ["$totalWithdrawals", "$totalCashOut"],
                    },
                  ],
                },
              },
            },
          ],
          { new: true, projection: { currentbalance: 1 } }
        ).lean(),
      ]);

      await BankTransactionLog.create({
        bankName: bank.bankname,
        ownername: bank.ownername,
        bankAccount: bank.bankaccount,
        remark: "-",
        lastBalance: oldBankBalance,
        currentBalance:
          updatedBank?.currentbalance || oldBankBalance + roundedAmount,
        processby: "admin",
        qrimage: bank.qrimage,
        playerusername: user.username,
        playerfullname: user.fullname,
        transactiontype: "deposit",
        amount: roundedAmount,
      });

      const depositCount = await LiveTransaction.countDocuments({
        type: "deposit",
      });

      if (depositCount >= 5) {
        await LiveTransaction.findOneAndUpdate(
          { type: "deposit" },
          {
            $set: {
              username: user.username,
              amount: roundedAmount,
              time: new Date(),
            },
          },
          { sort: { time: 1 } }
        );
      } else {
        await LiveTransaction.create({
          type: "deposit",
          username: user.username,
          amount: roundedAmount,
          time: new Date(),
          status: "completed",
        });
      }

      if (kioskSettings?.status) {
        const kioskResult = await updateKioskBalance(
          "subtract",
          roundedAmount,
          {
            username: user.username,
            transactionType: "deposit approval",
            remark: `Deposit ID: ${newDeposit._id}`,
            processBy: "admin",
          }
        );
        if (!kioskResult.success) {
          console.error("Failed to update kiosk balance for deposit");
        }
      }

      setImmediate(() => {
        checkAndUpdateVIPLevel(user._id).catch((error) => {
          console.error(
            `VIP level update error for user ${user._id}:`,
            error.message
          );
        });
        updateUserGameLocks(user._id);
      });

      await PaymentGatewayTransactionLog.create({
        gatewayId: gateway?._id,
        gatewayName: gateway?.name || "POWERPAY",
        transactiontype: "deposit",
        amount: roundedAmount,
        lastBalance: oldGatewayBalance,
        currentBalance:
          updatedGateway?.balance || oldGatewayBalance + roundedAmount,
        remark: `Deposit from ${user.username}`,
        playerusername: user.username,
        processby: "system",
        depositId: newDeposit._id,
      });

      if (existingTrx.promotionId) {
        try {
          const promotion = await Promotion.findById(existingTrx.promotionId, {
            claimtype: 1,
            bonuspercentage: 1,
            bonusexact: 1,
            maxbonus: 1,
            maintitle: 1,
            maintitleEN: 1,
          }).lean();

          if (!promotion) {
            console.log("POWERPAY, couldn't find promotion");
          } else {
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
              bonusAmount = roundToTwoDecimals(bonusAmount);
              const bonusTransactionId = uuidv4();

              const [, newBonus] = await Promise.all([
                User.findByIdAndUpdate(user._id, {
                  $inc: { wallet: bonusAmount },
                }),

                Bonus.create({
                  transactionId: bonusTransactionId,
                  userId: user._id,
                  username: user.username,
                  fullname: user.fullname || "unknown",
                  transactionType: "bonus",
                  processBy: "admin",
                  amount: bonusAmount,
                  walletamount: updatedUser?.wallet || user.wallet,
                  status: "approved",
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
                  amount: bonusAmount,
                  status: "approved",
                  promotionnameCN: promotion.maintitle,
                  promotionnameEN: promotion.maintitleEN,
                }),
              ]);

              if (kioskSettings?.status) {
                const kioskResult = await updateKioskBalance(
                  "subtract",
                  bonusAmount,
                  {
                    username: user.username,
                    transactionType: "bonus approval",
                    remark: `Bonus ID: ${newBonus._id}`,
                    processBy: "admin",
                  }
                );
                if (!kioskResult.success) {
                  console.error("Failed to update kiosk balance for bonus");
                }
              }
            }
          }
        } catch (promotionError) {
          console.error("Error processing promotion:", promotionError);
        }
      }
    } else {
      await powerpayModal.findByIdAndUpdate(existingTrx._id, {
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

router.post("/admin/api/powerpay/requesttransfer/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
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

    const {
      amount,
      bankCode,
      accountHolder,
      accountNumber,
      bankName,
      transactionId,
    } = req.body;

    if (!amount || !bankCode || !accountHolder || !accountNumber) {
      return res.status(200).json({
        success: false,
        message: {
          en: "Please complete all required fields",
          zh: "请完成所有必填项",
          zh_hk: "麻煩完成所有必填項目",
          ms: "Sila lengkapkan semua medan yang diperlukan",
          id: "Silakan lengkapi semua kolom yang diperlukan",
        },
      });
    }

    const formattedAmount = Number(amount).toFixed(2);

    const reqDateTime = moment.utc().format("YYYY-MM-DD HH:mm:ss");

    const receiverData = JSON.stringify({
      receiverFirstName: accountHolder?.split(" ")[0] || accountHolder,
      receiverLastName: accountHolder?.split(" ").slice(1).join(" ") || "",
      receiverNo: accountNumber || "",
      username: accountHolder,
      bankCode: bankCode,
    });

    const securityToken = generateSecurityToken([
      powerpayMerchantCode,
      transactionId,
      "SGD",
      amount.toFixed(2),
      paymentCallbackUrl,
      reqDateTime,
      receiverData,
      powerpaySecret,
    ]);

    const response = await axios.post(
      `${powerpayAPIURL}/ajax/api/v2/withdraw`,
      querystring.stringify({
        opCode: powerpayMerchantCode,
        orderId: transactionId,
        currency: "SGD",
        amount: amount.toFixed(2),
        callbackUrl: paymentCallbackUrl,
        reqDateTime,
        recipientInfo: receiverData,
        securityToken,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );
    console.log(response.data);
    return;
    if (response.data.code !== "0") {
      console.log(`POWERPAY API Error: ${response.data}`);

      return res.status(200).json({
        success: false,
        message: {
          en: "Payout request failed",
          zh: "申请代付失败",
          zh_hk: "申請代付失敗",
          ms: "Permintaan pembayaran gagal",
          id: "Permintaan pembayaran gagal",
        },
      });
    }

    await Promise.all([
      powerpayModal.create({
        ourRefNo: transactionId,
        paymentGatewayRefNo: response.data.data.vendor_id,
        transfername: "N/A",
        username: user.username,
        amount: Number(formattedAmount),
        transferType: bankName || bankCode,
        transactiontype: "withdraw",
        status: "Pending",
        platformCharge: 0,
        remark: "-",
        promotionId: null,
      }),
    ]);

    return res.status(200).json({
      success: true,
      message: {
        en: "Payout request submitted successfully",
        zh: "提交申请代付成功",
        zh_hk: "提交申請代付成功",
        ms: "Permintaan pembayaran berjaya diserahkan",
        id: "Permintaan pembayaran berhasil diajukan",
      },
    });
  } catch (error) {
    console.error(
      `Error in SKL99 API - User: ${req.user?.userId}, Amount: ${req.body?.amount}:`,
      error.response?.data || error.message
    );

    return res.status(200).json({
      success: false,
      message: {
        en: "Payout request failed",
        zh: "申请代付失败",
        zh_hk: "申請代付失敗",
        ms: "Permintaan pembayaran gagal",
        id: "Permintaan pembayaran gagal",
      },
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

    const dgData = await powerpayModal
      .find(dateFilter)
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json({
      success: true,
      message: "POWERPAY retrieved successfully",
      data: dgData,
    });
  } catch (error) {
    console.error("Error retrieving user bonus POWERPAY:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve bonus POWERPAY",
      error: error.message,
    });
  }
});
module.exports = router;

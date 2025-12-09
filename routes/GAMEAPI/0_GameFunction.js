const express = require("express");
const router = express.Router();
const axios = require("axios");
const crypto = require("crypto");
const { authenticateToken } = require("../../auth/auth");
const { authenticateAdminToken } = require("../../auth/adminAuth");
const {
  User,
  adminUserWalletLog,
  GameDataLog,
} = require("../../models/users.model");
const { v4: uuidv4 } = require("uuid");
const querystring = require("querystring");
const moment = require("moment");
const UserWalletLog = require("../../models/userwalletlog.model");
const Bonus = require("../../models/bonus.model");
const Promotion = require("../../models/promotion.model");
const Deposit = require("../../models/deposit.model");
const Withdraw = require("../../models/withdraw.model");
const vip = require("../../models/vip.model");
const { RebateLog } = require("../../models/rebate.model");
const { updateKioskBalance } = require("../../services/kioskBalanceService");
const kioskbalance = require("../../models/kioskbalance.model");
const GameWalletLog = require("../../models/gamewalletlog.model");
const { updateUserGameLocks } = require("../users");

const SlotEpicWinModal = require("../../models/slot_epicwin.model");
const SlotBTGamingModal = require("../../models/slot_btgaming.model");
const SlotAceWinModal = require("../../models/slot_acewin.model");
const SlotYGRModal = require("../../models/slot_yesgetrich.model");
const SlotVPowerModal = require("../../models/slot_vpower.model");
const EsportTfGamingModal = require("../../models/esport_tfgaming.model");
const SlotBNGModal = require("../../models/slot_bng.model");
const LiveSaGamingModal = require("../../models/live_sagaming.model");
const LiveYeebetModal = require("../../models/live_yeebet.model");
const SportM9BetModal = require("../../models/sport_m9bet.model");
const LiveWeCasinoModal = require("../../models/live_wecasino.model");
const SlotSpadeGamingModal = require("../../models/slot_spadegaming.model");
const SlotNextSpinModal = require("../../models/slot_nextspin.model");
const LiveWMCasinoRebateModal = require("../../models/live_wmcasinorebate.model");
const SlotPlayStarModal = require("../../models/slot_playstar.model");
const SlotFastSpinModal = require("../../models/slot_fastspin.model");
const SlotFachaiModal = require("../../models/slot_fachai.model");
const SlotCQ9Modal = require("../../models/slot_cq9.model");
const SlotLivePPModal = require("../../models/slot_live_pp.model");
const SlotRSGModal = require("../../models/slot_rsg.model");
const SlotIBEXModal = require("../../models/slot_ibex.model");
const SlotDCTGameModal = require("../../models/slot_dctgame.model");

require("dotenv").config();

function roundToTwoDecimals(num) {
  return Math.round(Number(num) * 100) / 100;
}

async function fetchRouteWithRetry(
  route,
  date,
  retryCount = 3,
  delayMinutes = 2
) {
  for (let i = 0; i < retryCount; i++) {
    try {
      const response = await axios.post(route.url, { date });
      if (response.data.success) {
        return response.data.summary;
      }
    } catch (error) {
      console.error(
        `Attempt ${i + 1} failed for ${route.name}:`,
        error.message
      );
      if (i < retryCount - 1) {
        console.log(`Retrying ${route.name} in ${delayMinutes} minutes...`);
        await new Promise((resolve) =>
          setTimeout(resolve, delayMinutes * 60 * 1000)
        );
      } else {
        console.error(
          `All retries failed for ${route.name}. Last error:`,
          error.response?.data || error.message
        );
      }
    }
  }
  return null;
}

const PUBLIC_APIURL = process.env.BASE_URL;

router.post("/admin/api/getAllTurnoverForRebate", async (req, res) => {
  try {
    const { date, pass } = req.body;
    const allGamesData = [];

    // if (pass !== process.env.SERVER_SECRET) {
    //   console.error(
    //     "Error in getAllTurnoverForRebate: Invalid Secret Key",
    //     error.message
    //   );
    //   return res.status(500).json({
    //     success: false,
    //     error: "Failed to fetch combined turnover data",
    //   });
    // }

    const routes = [
      {
        url: `${PUBLIC_APIURL}api/epicwin/getturnoverforrebate`,
        name: "EPICWIN",
      },
      {
        url: `${PUBLIC_APIURL}api/btgaming/getturnoverforrebate`,
        name: "BT GAMING",
      },
      {
        url: `${PUBLIC_APIURL}api/acewinslot/getturnoverforrebate`,
        name: "ACEWIN",
      },
      {
        url: `${PUBLIC_APIURL}api/acewinfish/getturnoverforrebate`,
        name: "ACEWIN",
      },
      {
        url: `${PUBLIC_APIURL}api/yesgetrichslot/getturnoverforrebate`,
        name: "YGR",
      },
      {
        url: `${PUBLIC_APIURL}api/yesgetrichfish/getturnoverforrebate`,
        name: "YGR",
      },
      {
        url: `${PUBLIC_APIURL}api/vpower/getturnoverforrebate`,
        name: "VPOWER",
      },
      {
        url: `${PUBLIC_APIURL}api/tfgaming/getturnoverforrebate`,
        name: "TF GAMING",
      },
      {
        url: `${PUBLIC_APIURL}api/bng/getturnoverforrebate`,
        name: "BNG",
      },
      {
        url: `${PUBLIC_APIURL}api/sagaming/getturnoverforrebate`,
        name: "SA GAMING",
      },
      {
        url: `${PUBLIC_APIURL}api/yeebet/getturnoverforrebate`,
        name: "YEEBET",
      },
      {
        url: `${PUBLIC_APIURL}api/m9bet/getturnoverforrebate`,
        name: "M9BET",
      },
      {
        url: `${PUBLIC_APIURL}api/wecasino/getturnoverforrebate`,
        name: "WE CASINO",
      },
      {
        url: `${PUBLIC_APIURL}api/spadegamingslot/getturnoverforrebate`,
        name: "SPADE GAMING",
      },
      {
        url: `${PUBLIC_APIURL}api/spadegamingfish/getturnoverforrebate`,
        name: "SPADE GAMING",
      },
      {
        url: `${PUBLIC_APIURL}api/nextspin/getturnoverforrebate`,
        name: "NEXTSPIN",
      },
      {
        url: `${PUBLIC_APIURL}api/wmcasino/getturnoverforrebate`,
        name: "WM CASINO",
      },
      {
        url: `${PUBLIC_APIURL}api/playstar/getturnoverforrebate`,
        name: "PLAYSTAR",
      },
      {
        url: `${PUBLIC_APIURL}api/fastspinslot/getturnoverforrebate`,
        name: "FASTSPIN",
      },
      {
        url: `${PUBLIC_APIURL}api/fastspinfish/getturnoverforrebate`,
        name: "FASTSPIN",
      },
      {
        url: `${PUBLIC_APIURL}api/fachaislot/getturnoverforrebate`,
        name: "FACHAI",
      },
      {
        url: `${PUBLIC_APIURL}api/fachaifish/getturnoverforrebate`,
        name: "FACHAI",
      },
      {
        url: `${PUBLIC_APIURL}api/cq9slot/getturnoverforrebate`,
        name: "CQ9",
      },
      {
        url: `${PUBLIC_APIURL}api/cq9fish/getturnoverforrebate`,
        name: "CQ9",
      },
      {
        url: `${PUBLIC_APIURL}api/ppslot/getturnoverforrebate`,
        name: "PRAGMATIC PLAY SLOT",
      },
      {
        url: `${PUBLIC_APIURL}api/pplive/getturnoverforrebate`,
        name: "PRAGMATIC PLAY LIVE",
      },
      {
        url: `${PUBLIC_APIURL}api/rsgslot/getturnoverforrebate`,
        name: "RSG",
      },
      {
        url: `${PUBLIC_APIURL}api/rsgfish/getturnoverforrebate`,
        name: "RSG",
      },
      {
        url: `${PUBLIC_APIURL}api/ibex/getturnoverforrebate`,
        name: "IBEX",
      },
      {
        url: `${PUBLIC_APIURL}api/hacksaw/getturnoverforrebate`,
        name: "HACKSAW",
      },
      {
        url: `${PUBLIC_APIURL}api/relaxgaming/getturnoverforrebate`,
        name: "RELAX GAMING",
      },
    ];

    const routePromises = routes.map((route) =>
      fetchRouteWithRetry(route, date)
    );
    const results = await Promise.all(routePromises);

    results.forEach((result) => {
      if (result) allGamesData.push(result);
    });

    const combinedUserData = {};

    allGamesData.forEach((gameData) => {
      const { gamename, gamecategory, users } = gameData;

      Object.entries(users).forEach(([username, data]) => {
        if (!combinedUserData[username]) {
          combinedUserData[username] = {};
        }

        if (!combinedUserData[username][gamecategory]) {
          combinedUserData[username][gamecategory] = {};
        }

        combinedUserData[username][gamecategory][gamename] = {
          turnover: data.turnover,
          winloss: data.winloss,
        };
      });
    });

    const yesterday = moment
      .utc()
      .add(8, "hours")
      .subtract(1, "days")
      .format("YYYY-MM-DD");

    for (const [username, categories] of Object.entries(combinedUserData)) {
      const gameCategories = new Map();

      for (const [category, games] of Object.entries(categories)) {
        gameCategories.set(category, new Map(Object.entries(games)));
      }

      await GameDataLog.findOneAndUpdate(
        { username, date: yesterday },
        {
          username,
          date: yesterday,
          gameCategories,
        },
        { upsert: true, new: true }
      );
    }

    return res.status(200).json({
      success: true,
      data: combinedUserData,
    });
  } catch (error) {
    console.error("Error in getAllTurnoverForRebate:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch combined turnover data",
    });
  }
});

const DEFAULT_TURNOVER_MULTIPLIER = 1;

const CATEGORIES = {
  LIVE_CASINO: "Live Casino",
  SLOT: "Slot",
  SPORTS: "Sports",
  ESPORTS: "Esports",
  FISHING: "Fishing",
  LOTTERY: "Lottery",
};

const GAME_CONFIG = [
  // ========== SLOT ==========
  {
    model: SlotEpicWinModal,
    name: "epicwin",
    category: CATEGORIES.SLOT,
    match: { cancel: { $ne: true }, settle: true },
  },
  {
    model: SlotBTGamingModal,
    name: "btgaming",
    category: CATEGORIES.SLOT,
    match: { cancel: { $ne: true }, settle: true },
  },
  {
    model: SlotAceWinModal,
    name: "acewinSlot",
    category: CATEGORIES.SLOT,
    match: { cancel: { $ne: true }, settle: true, gametype: { $ne: "FISH" } },
  },
  {
    model: SlotYGRModal,
    name: "ygrSlot",
    category: CATEGORIES.SLOT,
    match: { cancel: { $ne: true }, settle: true, gametype: { $ne: "FISH" } },
  },
  {
    model: SlotVPowerModal,
    name: "vpower",
    category: CATEGORIES.SLOT,
    match: { settle: true },
  },
  {
    model: SlotBNGModal,
    name: "bng",
    category: CATEGORIES.SLOT,
    match: { cancel: { $ne: true }, settle: true },
  },
  {
    model: SlotSpadeGamingModal,
    name: "spadegamingSlot",
    category: CATEGORIES.SLOT,
    match: { cancel: { $ne: true }, settle: true, gametype: { $ne: "FISH" } },
  },
  {
    model: SlotNextSpinModal,
    name: "nextspin",
    category: CATEGORIES.SLOT,
    match: { cancel: { $ne: true }, settle: true },
  },
  {
    model: SlotPlayStarModal,
    name: "playstar",
    category: CATEGORIES.SLOT,
    match: { cancel: { $ne: true }, settle: true },
  },
  {
    model: SlotFastSpinModal,
    name: "fastspinSlot",
    category: CATEGORIES.SLOT,
    match: { cancel: { $ne: true }, settle: true, gametype: { $ne: "FISH" } },
  },
  {
    model: SlotFachaiModal,
    name: "fachaiSlot",
    category: CATEGORIES.SLOT,
    match: { cancel: { $ne: true }, settle: true, gametype: { $ne: "FISH" } },
  },
  {
    model: SlotCQ9Modal,
    name: "cq9Slot",
    category: CATEGORIES.SLOT,
    match: {
      cancel: { $ne: true },
      refund: { $ne: true },
      settle: true,
      gametype: { $ne: "FISH" },
    },
  },
  {
    model: SlotLivePPModal,
    name: "ppSlot",
    category: CATEGORIES.SLOT,
    match: { refunded: false, ended: true, gameType: "Slot" },
  },
  {
    model: SlotRSGModal,
    name: "rsgSlot",
    category: CATEGORIES.SLOT,
    match: { cancel: { $ne: true }, settle: true, gametype: { $ne: "FISH" } },
  },
  {
    model: SlotIBEXModal,
    name: "ibex",
    category: CATEGORIES.SLOT,
    match: { cancel: { $ne: true }, settle: true },
  },
  {
    model: SlotDCTGameModal,
    name: "dctgames",
    category: CATEGORIES.SLOT,
    match: { cancel: { $ne: true }, settle: true },
  },

  // ========== LIVE CASINO ==========
  {
    model: LiveSaGamingModal,
    name: "sagaming",
    category: CATEGORIES.LIVE_CASINO,
    match: { cancel: { $ne: true }, settle: true },
    useValidBet: true,
  },
  {
    model: LiveYeebetModal,
    name: "yeebet",
    category: CATEGORIES.LIVE_CASINO,
    match: { settle: true, cancel: { $ne: true } },
  },
  {
    model: LiveWeCasinoModal,
    name: "wecasino",
    category: CATEGORIES.LIVE_CASINO,
    match: { settle: true, cancel: { $ne: true } },
    useValidBet: true,
  },
  {
    model: LiveWMCasinoRebateModal,
    name: "wmcasino",
    category: CATEGORIES.LIVE_CASINO,
    match: {},
  },
  {
    model: SlotLivePPModal,
    name: "ppLive",
    category: CATEGORIES.LIVE_CASINO,
    match: { refunded: false, ended: true, gameType: "Live" },
  },

  // ========== SPORTS ==========
  {
    model: SportM9BetModal,
    name: "m9bet",
    category: CATEGORIES.SPORTS,
    match: { cancel: { $ne: true }, settle: true },
  },

  // ========== ESPORTS ==========
  {
    model: EsportTfGamingModal,
    name: "tfgaming",
    category: CATEGORIES.ESPORTS,
    match: { settle: true, cancel: { $ne: true } },
  },

  // ========== FISHING (0% rebate) ==========
  {
    model: SlotAceWinModal,
    name: "acewinFish",
    category: CATEGORIES.FISHING,
    match: { cancel: { $ne: true }, settle: true, gametype: "FISH" },
  },
  {
    model: SlotYGRModal,
    name: "ygrFish",
    category: CATEGORIES.FISHING,
    match: { cancel: { $ne: true }, settle: true, gametype: "FISH" },
  },
  {
    model: SlotSpadeGamingModal,
    name: "spadegamingFish",
    category: CATEGORIES.FISHING,
    match: { cancel: { $ne: true }, settle: true, gametype: "FISH" },
  },
  {
    model: SlotFastSpinModal,
    name: "fastspinFish",
    category: CATEGORIES.FISHING,
    match: { cancel: { $ne: true }, settle: true, gametype: "FISH" },
  },
  {
    model: SlotFachaiModal,
    name: "fachaiFish",
    category: CATEGORIES.FISHING,
    match: { cancel: { $ne: true }, settle: true, gametype: "FISH" },
  },
  {
    model: SlotCQ9Modal,
    name: "cq9Fish",
    category: CATEGORIES.FISHING,
    match: {
      cancel: { $ne: true },
      refund: { $ne: true },
      settle: true,
      gametype: "FISH",
    },
  },
  {
    model: SlotRSGModal,
    name: "rsgFish",
    category: CATEGORIES.FISHING,
    match: { cancel: { $ne: true }, settle: true, gametype: "FISH" },
  },
];

const buildUsernameSearchArray = (gameId, username) => {
  const upperGameId = gameId.toUpperCase();
  const lowerGameId = gameId.toLowerCase();
  const variations = [
    upperGameId,
    `${upperGameId}2X`,
    `${upperGameId}2x`,
    lowerGameId,
    `${lowerGameId}2X`,
    `${lowerGameId}2x`,
    gameId,
  ];

  if (username && username !== gameId) {
    const upperUsername = username.toUpperCase();
    const lowerUsername = username.toLowerCase();
    variations.push(
      upperUsername,
      `${upperUsername}2X`,
      `${upperUsername}2x`,
      lowerUsername,
      `${lowerUsername}2X`,
      `${lowerUsername}2x`,
      username
    );
  }

  return [...new Set(variations)];
};

const getVipRebateRates = (vipLevels, userVipLevel) => {
  if (!userVipLevel) {
    console.error(`❌ VIP Error: No VIP level assigned`);
    return null;
  }

  const vipLevel = vipLevels.find(
    (level) => level.name.toLowerCase() === userVipLevel.toLowerCase()
  );

  if (!vipLevel?.benefits) {
    console.error(`❌ VIP Error: "${userVipLevel}" not found or no benefits`);
    return null;
  }

  const benefits =
    vipLevel.benefits instanceof Map
      ? Object.fromEntries(vipLevel.benefits)
      : vipLevel.benefits;

  const liveCasino = parseFloat(benefits["Rebate Live Casino"]);
  const sports = parseFloat(benefits["Rebate Sports"]);
  const slot = parseFloat(benefits["Rebate Slot"]);
  const esports = parseFloat(benefits["Rebate Esports"]);

  if (isNaN(liveCasino) || isNaN(sports) || isNaN(slot) || isNaN(esports)) {
    console.error(
      `❌ VIP Error: "${userVipLevel}" missing required rebate rates`
    );
    return null;
  }

  return {
    [CATEGORIES.LIVE_CASINO]: liveCasino / 100,
    [CATEGORIES.SLOT]: slot / 100,
    [CATEGORIES.SPORTS]: sports / 100,
    [CATEGORIES.ESPORTS]: esports / 100,
    [CATEGORIES.FISHING]: 0,
    [CATEGORIES.LOTTERY]: 0,
  };
};

const calculateBonusTurnoverRequirement = async (bonuses) => {
  const promotionIds = [
    ...new Set(bonuses.map((b) => b.promotionId).filter(Boolean)),
  ];
  const promotions = await Promotion.find({
    _id: { $in: promotionIds },
  }).lean();
  const promotionMap = new Map(promotions.map((p) => [String(p._id), p]));

  let totalTurnoverRequired = 0;
  const bonusDetails = [];

  for (const bonus of bonuses) {
    const promotion = promotionMap.get(String(bonus.promotionId));
    const multiplier =
      promotion?.turnoverrequiremnt || DEFAULT_TURNOVER_MULTIPLIER;
    const bonusAmount = parseFloat(bonus.amount) || 0;
    const requiredForThisBonus = bonusAmount * multiplier;

    totalTurnoverRequired += requiredForThisBonus;

    bonusDetails.push({
      bonusId: bonus._id,
      bonusAmount,
      multiplier,
      required: requiredForThisBonus,
      promotionName: promotion?.name || "Unknown",
      createdAt: bonus.createdAt,
    });
  }

  return { totalTurnoverRequired, bonusDetails };
};

const checkUserQualification = async (userId) => {
  try {
    const [deposits, bonuses] = await Promise.all([
      Deposit.find({ userId, status: "approved", reverted: false })
        .sort({ createdAt: -1 })
        .lean(),
      Bonus.find({ userId, status: "approved", reverted: false })
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    const hasDeposits = deposits?.length > 0;
    const hasBonuses = bonuses?.length > 0;

    if (!hasDeposits && !hasBonuses) {
      return { qualified: false, reason: "No deposits and no bonuses found" };
    }

    if (!hasDeposits && hasBonuses) {
      const turnoverData = await calculateBonusTurnoverRequirement(bonuses);
      return {
        qualified: true,
        hasBonusTurnoverRequirement: true,
        turnoverRequired: turnoverData.totalTurnoverRequired,
        bonusDetails: turnoverData.bonusDetails,
        bonusTurnoverStartDate: new Date(0),
        reason: "Free bonus - need to meet turnover requirement",
      };
    }

    if (hasDeposits && !hasBonuses) {
      return {
        qualified: true,
        qualifyFromDate: deposits[0].createdAt,
        reason: "No bonuses claimed",
        hasBonusTurnoverRequirement: false,
      };
    }

    const linkedDepositIds = new Set(
      bonuses.filter((b) => b.depositId).map((b) => String(b.depositId))
    );

    const latestPureDeposit = deposits.find(
      (d) => !linkedDepositIds.has(String(d.transactionId))
    );

    if (!latestPureDeposit) {
      const turnoverData = await calculateBonusTurnoverRequirement(bonuses);
      return {
        qualified: true,
        hasBonusTurnoverRequirement: true,
        turnoverRequired: turnoverData.totalTurnoverRequired,
        bonusDetails: turnoverData.bonusDetails,
        bonusTurnoverStartDate: new Date(0),
        reason:
          "All deposits linked to bonuses - need to meet turnover requirement",
      };
    }

    const latestBonus = bonuses[0];

    if (!latestBonus || latestPureDeposit.createdAt > latestBonus.createdAt) {
      return {
        qualified: true,
        qualifyFromDate: latestPureDeposit.createdAt,
        reason: "Pure deposit without linked bonus",
        hasBonusTurnoverRequirement: false,
      };
    }

    const turnoverData = await calculateBonusTurnoverRequirement(bonuses);
    return {
      qualified: true,
      qualifyFromDate: latestPureDeposit.createdAt,
      hasBonusTurnoverRequirement: true,
      turnoverRequired: turnoverData.totalTurnoverRequired,
      bonusDetails: turnoverData.bonusDetails,
      bonusTurnoverStartDate: latestBonus.createdAt,
      reason: "Bonus claimed after pure deposit - split eligibility",
    };
  } catch (error) {
    console.error(`Error checking qualification for ${userId}:`, error);
    return { qualified: false, reason: "Error checking qualification" };
  }
};

const processRecordsWithTurnoverRequirement = (
  allRecords,
  turnoverRequired,
  bonusTurnoverStartDate = null
) => {
  const sortedRecords = [...allRecords].sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
  );

  let eligibleBeforeBonus = [];
  let recordsAfterBonus = [];

  if (bonusTurnoverStartDate) {
    const bonusDate = new Date(bonusTurnoverStartDate);
    sortedRecords.forEach((record) => {
      if (new Date(record.createdAt) < bonusDate) {
        eligibleBeforeBonus.push(record);
      } else {
        recordsAfterBonus.push(record);
      }
    });
  } else {
    recordsAfterBonus = sortedRecords;
  }

  let cumulativeTurnover = 0;
  let requirementMetIndex = -1;
  let requirementMetDate = null;

  for (let i = 0; i < recordsAfterBonus.length; i++) {
    cumulativeTurnover += recordsAfterBonus[i].turnover || 0;
    if (cumulativeTurnover >= turnoverRequired && requirementMetIndex === -1) {
      requirementMetIndex = i;
      requirementMetDate = recordsAfterBonus[i].createdAt;
      break;
    }
  }

  if (requirementMetIndex === -1) {
    return {
      met: false,
      currentTurnover: cumulativeTurnover,
      remainingTurnover: turnoverRequired - cumulativeTurnover,
      eligibleRecords: eligibleBeforeBonus,
      disqualifiedRecords: [],
      pendingRecords: recordsAfterBonus,
      eligibleBeforeBonusCount: eligibleBeforeBonus.length,
      pendingCount: recordsAfterBonus.length,
      excessTurnover: 0,
    };
  }

  const excessTurnover = cumulativeTurnover - turnoverRequired;
  const disqualifiedRecords = recordsAfterBonus.slice(
    0,
    requirementMetIndex + 1
  );
  const eligibleAfterRequirement = recordsAfterBonus.slice(
    requirementMetIndex + 1
  );
  const allEligibleRecords = [
    ...eligibleBeforeBonus,
    ...eligibleAfterRequirement,
  ];
  const eligibleRecordsTurnover = allEligibleRecords.reduce(
    (sum, r) => sum + (r.turnover || 0),
    0
  );

  return {
    met: true,
    requirementMetDate,
    turnoverUsedForRequirement: turnoverRequired,
    excessTurnover,
    eligibleRecords: allEligibleRecords,
    disqualifiedRecords,
    pendingRecords: [],
    eligibleTurnover: eligibleRecordsTurnover + excessTurnover,
    eligibleBeforeBonusCount: eligibleBeforeBonus.length,
    eligibleAfterRequirementCount: eligibleAfterRequirement.length,
  };
};

const getGameTurnoverWithRecords = async (config, searchArray) => {
  try {
    let turnoverField;

    if (config.useValidBet) {
      turnoverField = {
        $ifNull: [{ $ifNull: ["$validbetamount", "$betamount"] }, 0],
      };
    } else {
      turnoverField = { $ifNull: ["$betamount", 0] };
    }

    const pipeline = [
      {
        $match: {
          ...config.match,
          username: { $in: searchArray },
          claimed: false,
          disqualified: false,
        },
      },
      {
        $project: {
          _id: 1,
          createdAt: 1,
          turnover: turnoverField,
          username: 1,
        },
      },
      {
        $sort: { createdAt: 1 },
      },
    ];

    const records = await config.model.aggregate(pipeline);
    const totalTurnover = records.reduce(
      (sum, r) => sum + (r.turnover || 0),
      0
    );

    return {
      name: config.name,
      category: config.category,
      model: config.model,
      turnover: totalTurnover,
      records: records.map((r) => ({
        _id: r._id,
        createdAt: r.createdAt,
        turnover: r.turnover,
        category: config.category,
        gameName: config.name,
        model: config.model,
      })),
      count: records.length,
    };
  } catch (error) {
    console.error(`❌ Error fetching ${config.name}:`, error.message);
    return {
      name: config.name,
      category: config.category,
      model: config.model,
      turnover: 0,
      records: [],
      count: 0,
    };
  }
};

// ============================================================
// MAIN ROUTE
// ============================================================

router.post("/api/rebatemanualclaim", authenticateToken, async (req, res) => {
  const startTime = Date.now();

  try {
    const userId = req.user.userId;

    const [user, vipData, currentPromotion, kioskSettings] = await Promise.all([
      User.findById(userId)
        .select(
          "_id gameId username viplevel wallet fullname duplicateIP duplicateBank"
        )
        .lean(),
      vip.findOne({}).lean(),
      Promotion.findById("6929c17d4d6d42211caf19a2")
        .select("_id maintitle maintitleEN")
        .lean(),
      kioskbalance.findOne({}).lean(),
    ]);

    if (!user) {
      return res.status(200).json({
        success: false,
        message: {
          en: "User not found. Please try again or contact customer service for assistance.",
          zh: "用户未找到，请重试或联系客服以获取帮助。",
          ms: "Pengguna tidak ditemui, sila cuba lagi atau hubungi khidmat pelanggan untuk bantuan.",
        },
      });
    }

    if (!vipData?.vipLevels?.length) {
      return res.status(200).json({
        success: false,
        message: {
          en: "Service temporarily unavailable. Please try again later or contact customer service.",
          zh: "服务暂时不可用，请稍后再试或联系客服。",
          ms: "Perkhidmatan tidak tersedia buat sementara waktu. Sila cuba lagi kemudian atau hubungi khidmat pelanggan.",
        },
      });
    }

    if (!currentPromotion) {
      return res.status(200).json({
        success: false,
        message: {
          en: "Rebate is currently unavailable. Please try again later or contact customer service.",
          zh: "返水功能暂时不可用，请稍后再试或联系客服。",
          ms: "Rebat tidak tersedia buat masa ini. Sila cuba lagi kemudian atau hubungi khidmat pelanggan.",
        },
      });
    }

    const rates = getVipRebateRates(vipData.vipLevels, user.viplevel);
    if (!rates) {
      return res.status(400).json({
        success: false,
        message: {
          en: `Invalid VIP level: ${user.viplevel}`,
          zh: `无效VIP等级: ${user.viplevel}`,
          ms: `Tahap VIP tidak sah: ${user.viplevel}`,
        },
      });
    }

    const qualification = await checkUserQualification(userId);

    if (!qualification.qualified) {
      return res.status(400).json({
        success: false,
        message: {
          en: qualification.reason,
          zh: qualification.reason,
          ms: qualification.reason,
        },
      });
    }

    const searchArray = buildUsernameSearchArray(user.gameId, user.username);

    const gameResults = await Promise.all(
      GAME_CONFIG.map((config) =>
        getGameTurnoverWithRecords(config, searchArray)
      )
    );

    let allRecords = [];
    gameResults.forEach((result) => {
      if (result?.records?.length) {
        allRecords.push(...result.records);
      }
    });

    const totalTurnover = allRecords.reduce(
      (sum, r) => sum + (r.turnover || 0),
      0
    );

    if (totalTurnover <= 0) {
      return res.status(200).json({
        success: false,
        message: {
          en: "No turnover records available for rebate.",
          zh: "没有可用于返水的流水记录。",
          ms: "Tiada rekod pusing ganti tersedia untuk rebat.",
        },
      });
    }

    let eligibleRecords = allRecords;
    let disqualifiedRecords = [];
    let pendingRecords = [];
    let turnoverRequirementInfo = null;

    if (
      qualification.hasBonusTurnoverRequirement &&
      qualification.turnoverRequired > 0
    ) {
      const turnoverResult = processRecordsWithTurnoverRequirement(
        allRecords,
        qualification.turnoverRequired,
        qualification.bonusTurnoverStartDate
      );

      if (!turnoverResult.met) {
        if (turnoverResult.eligibleRecords.length > 0) {
          eligibleRecords = turnoverResult.eligibleRecords;
          disqualifiedRecords = [];
          pendingRecords = turnoverResult.pendingRecords;

          turnoverRequirementInfo = {
            required: qualification.turnoverRequired,
            current: turnoverResult.currentTurnover,
            remaining: turnoverResult.remainingTurnover,
            disqualifiedCount: 0,
            eligibleCount: eligibleRecords.length,
            eligibleBeforeBonusCount: turnoverResult.eligibleBeforeBonusCount,
            pendingCount: turnoverResult.pendingCount,
            status: "partial",
          };
        } else {
          return res.status(200).json({
            success: false,
            message: {
              en: `Turnover requirement not met. Need ${turnoverResult.remainingTurnover.toFixed(
                2
              )} more turnover.`,
              zh: `流水要求未达到。还需 ${turnoverResult.remainingTurnover.toFixed(
                2
              )} 流水。`,
              ms: `Keperluan pusing ganti tidak dipenuhi. Perlukan ${turnoverResult.remainingTurnover.toFixed(
                2
              )} lagi.`,
            },
            turnoverDetails: {
              required: qualification.turnoverRequired,
              current: turnoverResult.currentTurnover,
              remaining: turnoverResult.remainingTurnover,
              pendingCount: turnoverResult.pendingCount,
              bonusDetails: qualification.bonusDetails,
            },
          });
        }
      } else {
        eligibleRecords = turnoverResult.eligibleRecords;
        disqualifiedRecords = turnoverResult.disqualifiedRecords;
        pendingRecords = [];

        turnoverRequirementInfo = {
          required: qualification.turnoverRequired,
          usedForRequirement: turnoverResult.turnoverUsedForRequirement,
          excessTurnover: turnoverResult.excessTurnover,
          requirementMetDate: turnoverResult.requirementMetDate,
          disqualifiedCount: disqualifiedRecords.length,
          eligibleCount: eligibleRecords.length,
          eligibleBeforeBonusCount:
            turnoverResult.eligibleBeforeBonusCount || 0,
          eligibleAfterRequirementCount:
            turnoverResult.eligibleAfterRequirementCount || 0,
          status: "met",
        };
      }
    } else if (qualification.qualifyFromDate) {
      const qualifyDate = new Date(qualification.qualifyFromDate);
      eligibleRecords = allRecords.filter(
        (r) => new Date(r.createdAt) >= qualifyDate
      );
      disqualifiedRecords = allRecords.filter(
        (r) => new Date(r.createdAt) < qualifyDate
      );
    }

    const breakdown = {
      [CATEGORIES.LIVE_CASINO]: 0,
      [CATEGORIES.SLOT]: 0,
      [CATEGORIES.SPORTS]: 0,
      [CATEGORIES.ESPORTS]: 0,
      [CATEGORIES.FISHING]: 0,
      [CATEGORIES.LOTTERY]: 0,
    };

    const gamesByCategory = {
      [CATEGORIES.LIVE_CASINO]: [],
      [CATEGORIES.SLOT]: [],
      [CATEGORIES.SPORTS]: [],
      [CATEGORIES.ESPORTS]: [],
      [CATEGORIES.FISHING]: [],
      [CATEGORIES.LOTTERY]: [],
    };

    eligibleRecords.forEach((record) => {
      breakdown[record.category] += record.turnover || 0;
    });

    let excessTurnover = 0;
    if (
      turnoverRequirementInfo?.excessTurnover > 0 &&
      disqualifiedRecords.length > 0
    ) {
      excessTurnover = turnoverRequirementInfo.excessTurnover;
      const lastDisqualifiedRecord =
        disqualifiedRecords[disqualifiedRecords.length - 1];
      const excessCategory = lastDisqualifiedRecord.category;
      breakdown[excessCategory] += excessTurnover;
    }

    const gameAggregation = {};
    eligibleRecords.forEach((record) => {
      const key = `${record.category}_${record.gameName}`;
      if (!gameAggregation[key]) {
        gameAggregation[key] = {
          category: record.category,
          gameName: record.gameName,
          turnover: 0,
          count: 0,
        };
      }
      gameAggregation[key].turnover += record.turnover || 0;
      gameAggregation[key].count += 1;
    });

    if (excessTurnover > 0 && disqualifiedRecords.length > 0) {
      const lastDisqualifiedRecord =
        disqualifiedRecords[disqualifiedRecords.length - 1];
      const key = `${lastDisqualifiedRecord.category}_${lastDisqualifiedRecord.gameName}`;
      if (!gameAggregation[key]) {
        gameAggregation[key] = {
          category: lastDisqualifiedRecord.category,
          gameName: lastDisqualifiedRecord.gameName,
          turnover: 0,
          count: 0,
        };
      }
      gameAggregation[key].turnover += excessTurnover;
    }

    Object.values(gameAggregation).forEach((game) => {
      if (game.turnover > 0) {
        gamesByCategory[game.category].push({
          gameName: game.gameName,
          turnover: game.turnover,
          count: game.count,
        });
      }
    });

    const eligibleTurnover = Object.values(breakdown).reduce(
      (sum, val) => sum + val,
      0
    );
    const rebatableTurnover =
      breakdown[CATEGORIES.LIVE_CASINO] +
      breakdown[CATEGORIES.SLOT] +
      breakdown[CATEGORIES.SPORTS] +
      breakdown[CATEGORIES.ESPORTS];

    if (rebatableTurnover <= 0) {
      return res.status(200).json({
        success: false,
        message: {
          en: "No valid turnover available for rebate.",
          zh: "没有可用于返水的有效流水。",
          ms: "Tiada pusing ganti sah tersedia untuk rebat.",
        },
        turnoverDetails: turnoverRequirementInfo,
      });
    }

    const commission = {
      [CATEGORIES.LIVE_CASINO]:
        breakdown[CATEGORIES.LIVE_CASINO] * rates[CATEGORIES.LIVE_CASINO],
      [CATEGORIES.SLOT]: breakdown[CATEGORIES.SLOT] * rates[CATEGORIES.SLOT],
      [CATEGORIES.SPORTS]:
        breakdown[CATEGORIES.SPORTS] * rates[CATEGORIES.SPORTS],
      [CATEGORIES.ESPORTS]:
        breakdown[CATEGORIES.ESPORTS] * rates[CATEGORIES.ESPORTS],
      [CATEGORIES.FISHING]: 0,
      [CATEGORIES.LOTTERY]: 0,
    };

    const totalCommission = Number(
      Object.values(commission)
        .reduce((sum, val) => sum + val, 0)
        .toFixed(2)
    );

    if (user.wallet >= 1) {
      const walletBalance = parseFloat(user.wallet?.toString() || "0");
      return res.status(200).json({
        success: false,
        message: {
          en: `Wallet balance must be less than 1 to claim rebate. Current balance: ${walletBalance.toFixed(
            2
          )}`,
          zh: `钱包余额必须少于1才能领取返水。当前余额：${walletBalance.toFixed(
            2
          )}`,
          ms: `Baki dompet mestilah kurang daripada 1 untuk menuntut rebat. Baki semasa: ${walletBalance.toFixed(
            2
          )}`,
        },
      });
    }

    if (totalCommission <= 0) {
      return res.status(200).json({
        success: false,
        message: {
          en: "Rebate amount is too low to claim. Please accumulate more turnover.",
          zh: "返水金额太低，无法领取。请累积更多流水。",
          ms: "Jumlah rebat terlalu rendah untuk dituntut. Sila kumpulkan lebih banyak pusing ganti.",
        },
      });
    }

    const formulaParts = [];
    if (breakdown[CATEGORIES.LIVE_CASINO] > 0) {
      formulaParts.push(
        `LC:${breakdown[CATEGORIES.LIVE_CASINO].toFixed(2)}×${(
          rates[CATEGORIES.LIVE_CASINO] * 100
        ).toFixed(2)}%`
      );
    }
    if (breakdown[CATEGORIES.SLOT] > 0) {
      formulaParts.push(
        `SL:${breakdown[CATEGORIES.SLOT].toFixed(2)}×${(
          rates[CATEGORIES.SLOT] * 100
        ).toFixed(2)}%`
      );
    }
    if (breakdown[CATEGORIES.SPORTS] > 0) {
      formulaParts.push(
        `SP:${breakdown[CATEGORIES.SPORTS].toFixed(2)}×${(
          rates[CATEGORIES.SPORTS] * 100
        ).toFixed(2)}%`
      );
    }
    if (breakdown[CATEGORIES.ESPORTS] > 0) {
      formulaParts.push(
        `ES:${breakdown[CATEGORIES.ESPORTS].toFixed(2)}×${(
          rates[CATEGORIES.ESPORTS] * 100
        ).toFixed(2)}%`
      );
    }
    const formula = `[${user.viplevel}] ${formulaParts.join(
      " + "
    )} = ${totalCommission}`;

    let remark = `VIP Rebate - ${qualification.reason}`;
    if (turnoverRequirementInfo) {
      if (turnoverRequirementInfo.status === "met") {
        remark += ` | Req: ${turnoverRequirementInfo.required.toFixed(
          2
        )}, Used: ${turnoverRequirementInfo.usedForRequirement.toFixed(2)}`;
      } else if (turnoverRequirementInfo.status === "partial") {
        remark += ` | Req: ${turnoverRequirementInfo.required.toFixed(
          2
        )}, Pending: ${turnoverRequirementInfo.current.toFixed(
          2
        )}/${turnoverRequirementInfo.required.toFixed(2)}`;
      }
    }

    const transactionId = uuidv4();

    let kioskUpdateResult = { success: false, skipped: true };
    if (kioskSettings?.status) {
      try {
        kioskUpdateResult = await updateKioskBalance(
          "subtract",
          totalCommission,
          {
            username: user.username,
            transactionType: "bonus approval",
            remark: `Bonus ID: ${transactionId}`,
            processBy: "admin",
          }
        );
      } catch (kioskError) {
        console.error(
          `❌ Kiosk balance error (non-blocking):`,
          kioskError.message
        );
        kioskUpdateResult = { success: false, error: kioskError.message };
      }
    }

    let updatedUser, rebateRecord, newBonus, newUserWalletLog;

    try {
      [updatedUser, rebateRecord, newBonus, newUserWalletLog] =
        await Promise.all([
          User.findByIdAndUpdate(
            userId,
            { $inc: { wallet: totalCommission, totalbonus: totalCommission } },
            { new: true, projection: { wallet: 1 } }
          ).lean(),

          RebateLog.create({
            username: user.username,
            totalRebate: totalCommission,
            rebateissuesdate: new Date(),
            formula,
            remark,
            totalturnover: totalTurnover,
            eligibleTurnover,
            rebatableTurnover,
            slot: breakdown[CATEGORIES.SLOT],
            livecasino: breakdown[CATEGORIES.LIVE_CASINO],
            sports: breakdown[CATEGORIES.SPORTS],
            fishing: breakdown[CATEGORIES.FISHING],
            esports: breakdown[CATEGORIES.ESPORTS],
            lottery: breakdown[CATEGORIES.LOTTERY],
            poker: 0,
            mahjong: 0,
            horse: 0,
            type: "turnover",
          }),

          Bonus.create({
            transactionId: transactionId,
            userId: user._id,
            username: user.username,
            fullname: user.fullname || "unknown",
            transactionType: "bonus",
            processBy: "admin",
            amount: totalCommission,
            walletamount: user.wallet,
            status: "approved",
            method: "manual",
            remark: formula,
            promotionname: currentPromotion.maintitle,
            promotionnameEN: currentPromotion.maintitleEN,
            promotionId: currentPromotion._id,
            duplicateIP: user.duplicateIP,
            duplicateBank: user.duplicateBank,
          }),

          UserWalletLog.create({
            userId: user._id,
            transactionid: transactionId,
            transactiontime: new Date(),
            transactiontype: "bonus",
            amount: totalCommission,
            status: "approved",
            promotionnameCN: currentPromotion.maintitle,
            promotionnameEN: currentPromotion.maintitleEN,
          }),
        ]);
    } catch (dbError) {
      console.error(
        `❌ Database error during wallet/record creation:`,
        dbError
      );

      if (kioskUpdateResult.success) {
        try {
          await updateKioskBalance("add", totalCommission, {
            username: user.username,
            transactionType: "bonus rollback",
            remark: `Rollback Bonus ID: ${transactionId}`,
            processBy: "system",
          });
        } catch (rollbackError) {
          console.error(`❌ Kiosk rollback failed:`, rollbackError.message);
        }
      }

      return res.status(200).json({
        success: false,
        message: {
          en: "Failed to process rebate. Please try again later or contact customer service.",
          zh: "处理返水失败，请稍后再试或联系客服。",
          ms: "Gagal memproses rebat. Sila cuba lagi kemudian atau hubungi khidmat pelanggan.",
        },
      });
    }

    if (!updatedUser) {
      await Promise.all(
        [
          rebateRecord?._id && RebateLog.findByIdAndDelete(rebateRecord._id),
          newBonus?._id && Bonus.findByIdAndDelete(newBonus._id),
          newUserWalletLog?._id &&
            UserWalletLog.findByIdAndDelete(newUserWalletLog._id),
        ].filter(Boolean)
      );

      if (kioskUpdateResult.success) {
        try {
          await updateKioskBalance("add", totalCommission, {
            username: user.username,
            transactionType: "bonus rollback",
            remark: `Rollback Bonus ID: ${transactionId}`,
            processBy: "system",
          });
        } catch (rollbackError) {
          console.error(`❌ Kiosk rollback failed:`, rollbackError.message);
        }
      }

      return res.status(200).json({
        success: false,
        message: {
          en: "Failed to process rebate. Please try again later or contact customer service.",
          zh: "处理返水失败，请稍后再试或联系客服。",
          ms: "Gagal memproses rebat. Sila cuba lagi kemudian atau hubungi khidmat pelanggan.",
        },
      });
    }

    // Batch update records - mark as claimed/disqualified
    const updatePromises = [];
    const eligibleByModel = new Map();
    const disqualifiedByModel = new Map();

    eligibleRecords.forEach((r) => {
      const modelName = r.model.modelName;
      if (!eligibleByModel.has(modelName)) {
        eligibleByModel.set(modelName, { model: r.model, ids: [] });
      }
      eligibleByModel.get(modelName).ids.push(r._id);
    });

    disqualifiedRecords.forEach((r) => {
      const modelName = r.model.modelName;
      if (!disqualifiedByModel.has(modelName)) {
        disqualifiedByModel.set(modelName, { model: r.model, ids: [] });
      }
      disqualifiedByModel.get(modelName).ids.push(r._id);
    });

    eligibleByModel.forEach(({ model, ids }) => {
      if (ids.length > 0) {
        updatePromises.push(
          model.updateMany({ _id: { $in: ids } }, { $set: { claimed: true } })
        );
      }
    });

    disqualifiedByModel.forEach(({ model, ids }) => {
      if (ids.length > 0) {
        updatePromises.push(
          model.updateMany(
            { _id: { $in: ids } },
            { $set: { disqualified: true, claimed: true } }
          )
        );
      }
    });

    const updateResults = await Promise.all(updatePromises);
    const totalUpdated = updateResults.reduce(
      (sum, r) => sum + (r.modifiedCount || 0),
      0
    );

    const executionTime = Date.now() - startTime;

    return res.status(200).json({
      success: true,
      message: {
        en: `Rebate claimed successfully! +${totalCommission.toFixed(2)}`,
        zh: `返水领取成功！+${totalCommission.toFixed(2)}`,
        ms: `Rebat berjaya dituntut! +${totalCommission.toFixed(2)}`,
      },
      data: {
        username: user.gameId,
        vipLevel: user.viplevel,
        rates: {
          liveCasino: `${(rates[CATEGORIES.LIVE_CASINO] * 100).toFixed(2)}%`,
          slot: `${(rates[CATEGORIES.SLOT] * 100).toFixed(2)}%`,
          sports: `${(rates[CATEGORIES.SPORTS] * 100).toFixed(2)}%`,
          esports: `${(rates[CATEGORIES.ESPORTS] * 100).toFixed(2)}%`,
          fishing: "0.00%",
          lottery: "0.00%",
        },
        turnover: {
          total: Number(totalTurnover.toFixed(2)),
          eligible: Number(eligibleTurnover.toFixed(2)),
          rebatable: Number(rebatableTurnover.toFixed(2)),
          liveCasino: Number(breakdown[CATEGORIES.LIVE_CASINO].toFixed(2)),
          slot: Number(breakdown[CATEGORIES.SLOT].toFixed(2)),
          sports: Number(breakdown[CATEGORIES.SPORTS].toFixed(2)),
          esports: Number(breakdown[CATEGORIES.ESPORTS].toFixed(2)),
          fishing: Number(breakdown[CATEGORIES.FISHING].toFixed(2)),
          lottery: Number(breakdown[CATEGORIES.LOTTERY].toFixed(2)),
        },
        commission: {
          liveCasino: Number(commission[CATEGORIES.LIVE_CASINO].toFixed(2)),
          slot: Number(commission[CATEGORIES.SLOT].toFixed(2)),
          sports: Number(commission[CATEGORIES.SPORTS].toFixed(2)),
          esports: Number(commission[CATEGORIES.ESPORTS].toFixed(2)),
          total: totalCommission,
        },
        games: {
          liveCasino: gamesByCategory[CATEGORIES.LIVE_CASINO],
          slot: gamesByCategory[CATEGORIES.SLOT],
          sports: gamesByCategory[CATEGORIES.SPORTS],
          esports: gamesByCategory[CATEGORIES.ESPORTS],
          fishing: gamesByCategory[CATEGORIES.FISHING],
          lottery: gamesByCategory[CATEGORIES.LOTTERY],
        },
        turnoverRequirement: turnoverRequirementInfo,
        newWallet: parseFloat(updatedUser.wallet.toString()),
        rebateLogId: rebateRecord._id,
        bonusId: newBonus._id,
        transactionId,
        recordsUpdated: totalUpdated,
        qualificationReason: qualification.reason,
        kioskUpdated: kioskUpdateResult.success,
        executionTime: `${executionTime}ms`,
      },
    });
  } catch (error) {
    console.error("❌ VIP Rebate Error:", error);
    return res.status(200).json({
      success: false,
      message: {
        en: "Something went wrong. Please try again later or contact customer service.",
        zh: "出了点问题，请稍后再试或联系客服。",
        ms: "Sesuatu tidak kena. Sila cuba lagi kemudian atau hubungi khidmat pelanggan.",
      },
    });
  }
});

module.exports = router;

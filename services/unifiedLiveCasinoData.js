const moment = require("moment-timezone");

const parseDate = (dateStr, sourceTimezone = "Asia/Kuala_Lumpur") => {
  if (!dateStr) return null;
  return moment
    .tz(dateStr, "YYYY-MM-DD HH:mm:ss", sourceTimezone)
    .utc()
    .toDate();
};

const getCurrentUTC = () => moment.utc().toDate();

const mapStatus = (provider, state) => {
  const statusMaps = {
    YEEBET: {
      2: "accepted",
      1: "accepted",
      0: "accepted",
      "-1": "cancelled",
      "-2": "cancelled",
      "-3": "cancelled",
      "-4": "cancelled",
    },
  };

  const map = statusMaps[provider] || {};
  return map[state?.toString()] || "pending";
};

const mapResult = (provider, state, winlost) => {
  const resultMaps = {
    YEEBET: {
      2: winlost > 0 ? "won" : winlost < 0 ? "lost" : "draw",
      1: winlost > 0 ? "won" : winlost < 0 ? "lost" : "draw",
      0: "pending",
      "-1": "void",
      "-2": "void",
      "-3": "void",
      "-4": "void",
    },
  };

  const map = resultMaps[provider] || {};
  return map[state?.toString()] || "pending";
};

const mapGameType = (gametype) => {
  const gameTypeMap = {
    4: "Baccarat",
    5: "Roulette",
    10: "Dragon Tiger",
    11: "Sic Bo",
    14: "Bull Bull",
    17: "Three Cards",
    18: "Xoc Dia",
    22: "Cockfight",
  };
  return gameTypeMap[gametype] || `GameType_${gametype}`;
};

// ========== BET POINT MAPPER ==========
const mapBetPoint = (betpoint) => {
  const betPointMap = {
    PLAYER: "Player",
    BANKER: "Banker",
    TIED: "Tie",
    TIE: "Tie",
    PLAYERPAIR: "Player Pair",
    BANKERPAIR: "Banker Pair",
    BIG: "Big",
    SMALL: "Small",
    DRAGON: "Dragon",
    TIGER: "Tiger",
  };
  return betPointMap[betpoint?.toUpperCase()] || betpoint;
};

// ========== CHECK IF YEEBET IS SETTLED ==========
const isYeebetSettled = (state) => {
  // state 1 = settled, state 0 = pending, negative = cancelled/void
  return state !== 0;
};

// ========== YEEBET MAPPER ==========
const mapYeebetToUnified = (bet) => {
  const parseYeebetDate = (dateStr) => parseDate(dateStr, "Asia/Kuala_Lumpur");
  const isSettled = isYeebetSettled(bet.state);
  const isCancelled = bet.state < 0;

  return {
    provider: "YEEBET",
    category: "Live Casino",
    username: bet.username,
    betId: bet.id?.toString(),
    transactionId: bet.serialnumber?.toString(),
    roundId: bet.gameroundid?.toString(),

    // ========== UNIVERSAL AMOUNTS ==========
    betamount: bet.betamount || 0,
    validbetamount: bet.commamount || 0,
    winlossamount: bet.winlost || 0,
    settleamount: (bet.betamount || 0) + (bet.winlost || 0),
    turnover: bet.betamount || 0,
    commission: 0,

    // ========== UNIVERSAL STATUS ==========
    status: mapStatus("YEEBET", bet.state),
    result: mapResult("YEEBET", bet.state, bet.winlost),
    settle: isSettled,
    cancel: isCancelled,

    // ========== UNIVERSAL GAME INFO ==========
    gameName: bet.gametitle || null,
    gameId: bet.gameid?.toString() || null,
    gameType: mapGameType(bet.gametype),

    // ========== UNIVERSAL DATES ==========
    betTime: parseYeebetDate(bet.createtime),
    settleTime: parseYeebetDate(bet.updatetime),

    // ========== UNIVERSAL INFO ==========
    currency: bet.currency || "MYR",
    ipAddress: null,
    deviceType: null,

    // ========== LIVE CASINO SPECIFIC ==========
    liveCasino: {
      gameCode: bet.gameno?.toString() || null,
      tableId: bet.gameid?.toString() || null,
      dealerId: null,
      dealerName: null,
      result: bet.gameresult || null,
      cards: bet.gameresult || null,
      playerCards: null,
      bankerCards: null,
      betType: mapBetPoint(bet.betpoint),
      betUrl: bet.grurl || null,
      betOdds: bet.betodds || null,
    },
  };
};

// ========== BATCH PROCESS YEEBET DATA ==========
const processYeebetBetHistory = async (bets) => {
  if (!bets || !Array.isArray(bets) || bets.length === 0) {
    return {
      success: true,
      processed: 0,
      data: [],
    };
  }

  const unifiedData = bets.map(mapYeebetToUnified);

  return {
    success: true,
    processed: unifiedData.length,
    data: unifiedData,
  };
};

// ========== EXPORT ==========
module.exports = {
  // Mappers
  mapYeebetToUnified,

  // Batch processors
  processYeebetBetHistory,

  // Helpers
  parseDate,
  getCurrentUTC,
  mapStatus,
  mapResult,
  mapGameType,
  mapBetPoint,
  isYeebetSettled,
};

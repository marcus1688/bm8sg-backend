const mongoose = require("mongoose");

const GameGeneralSchema = new mongoose.Schema(
  {
    provider: String,
    category: {
      type: String,
      enum: [
        "Sports",
        "Slot",
        "Live Casino",
        "Esports",
        "Fishing",
        "Lottery",
        "Other",
      ],
    },
    username: String,
    betId: String,
    transactionId: String,
    roundId: String,
    sequence: Number,

    // ========== UNIVERSAL AMOUNTS ==========
    betamount: { type: Number, default: 0 },
    validbetamount: { type: Number, default: 0 },
    winlossamount: { type: Number, default: 0 },
    settleamount: { type: Number, default: 0 },
    turnover: { type: Number, default: 0 },
    commission: { type: Number, default: 0 },

    // ========== UNIVERSAL STATUS ==========
    status: {
      type: String,
      enum: ["accepted", "rejected", "cancelled"],
    },
    result: {
      type: String,
      enum: [
        "complete",
        "pending",
        "won",
        "lost",
        "draw",
        "void",
        "half_won",
        "half_lost",
        "rejected",
      ],
    },
    settle: { type: Boolean, default: false },
    cancel: { type: Boolean, default: false },
    refund: { type: Boolean, default: false },

    // ========== UNIVERSAL GAME INFO ==========
    gameName: String,
    gameId: String,
    gameType: String,

    // ========== UNIVERSAL DATES ==========
    betTime: Date,
    settleTime: Date,

    // ========== UNIVERSAL INFO ==========
    currency: { type: String, default: "MYR" },
    ipAddress: String,
    deviceType: String,

    // =====================================================
    // CATEGORY SPECIFIC DATA (only set what you need)
    // =====================================================

    // ========== SPORTS SPECIFIC ==========
    sports: {
      sportsType: String,
      sportsTypeId: Number,
      gameType: String,
      odds: Number,
      oddsType: String,
      leagueId: String,
      leagueName: String,
      homeTeamId: String,
      homeTeamName: String,
      awayTeamId: String,
      awayTeamName: String,
      side: String,
      selection: String,
      handicapInfo: String,
      half: String,
      homeScore: Number,
      awayScore: Number,
      score: String,
      halfTimeScore: String,
      runningScore: String,
      isLive: Boolean,
      isParlay: Boolean,
      isCashOut: Boolean,
      isHalfWonLose: Boolean,
      matchDate: String,
      matchDateTime: Date,
      matchEndTime: Date,
      workDate: Date,
      groupId: String,
      comboInfo: String,
      matchName: String,
      parlayLegs: Number,
      parlayDetails: Array,
      subBets: Array,
      turnoverByStake: Number,
      turnoverByActualStake: Number,
      netTurnoverByStake: Number,
      netTurnoverByActualStake: Number,
      maxWinWithoutActualStake: Number,
      isSystemTagRisky: Boolean,
      isCustomerTagRisky: Boolean,
      voidReason: String,
      topDownline: String,
      firstLastGoal: String,
      result4d: String,
      transSerial: String,
      fetchId: String,
      commissionAmount: Number,
      commissionValue: Number,
    },

    // ========== SLOT SPECIFIC ==========
    slot: {
      gameId: String,
      gameName: String,
      gameCode: String,
      gameType: String,
      spinCount: Number,
      freeSpinCount: Number,
      bonusRound: Boolean,
      multiplier: Number,
      fishTurnover: Number,
      fishWinLoss: Number,
      depositamount: Number,
      withdrawamount: Number,
      transferbetamount: Number,
      transfersettleamount: Number,
      beganbalance: Number,
      endbalance: Number,
    },

    // ========== LIVE CASINO SPECIFIC ==========
    liveCasino: {
      gameCode: String,
      tableId: String,
      dealerId: String,
      dealerName: String,
      result: String,
      cards: String,
      playerCards: String,
      bankerCards: String,
      betType: String,
      betUrl: String,
      betOdds: Number,
    },

    // ========== ESPORTS SPECIFIC ==========
    esports: {
      gameId: String,
      gameName: String,
      gameType: String,
      tournamentId: String,
      tournamentName: String,
      matchId: String,
      team1Id: String,
      team1Name: String,
      team2Id: String,
      team2Name: String,
      selection: String,
      odds: Number,
      handicap: String,
      result: String,
      score: String,
      mapScore: String,
      matchDateTime: Date,
    },

    // ========== FISHING SPECIFIC ==========
    fishing: {
      gameId: String,
      gameName: String,
      gameCode: String,
      fishTurnover: Number,
      fishWinLoss: Number,
      depositamount: Number,
      withdrawamount: Number,
    },

    // ========== LOTTERY SPECIFIC ==========
    lottery: {
      gameId: String,
      gameName: String,
      gameType: String,
      drawId: String,
      drawDate: Date,
      drawNumber: String,
      betNumber: String,
      betType: String,
      betPosition: String,
      winningNumbers: String,
      result: String,
      prizeType: String,
    },
  },
  {
    timestamps: true,
  }
);

const GameGeneralDetailDataModal = mongoose.model(
  "GameGeneralDetailDataModal",
  GameGeneralSchema
);

module.exports = GameGeneralDetailDataModal;

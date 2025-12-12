const SportsCMD368UnlimitedModal = require("../models/sport_cmdunlimited.model");
const moment = require("moment");
const axios = require("axios");
const crypto = require("crypto");

const cmdAPIURL = "https://api.fts368.com/";
const cmdPartnerCode = "EGEGM";
const cmdPartnerKey = process.env.CMD_TOKEN;

// async function processCMD368Bets() {
//   try {
//     const yesterdayStart = moment
//       .utc()
//       .add(8, "hours")
//       .startOf("day")
//       .subtract(1, "days")
//       .format("YYYY-MM-DD HH:mm:ss");
//     const yesterdayEnd = moment
//       .utc()
//       .add(8, "hours")
//       .endOf("day")
//       .subtract(1, "days")
//       .format("YYYY-MM-DD HH:mm:ss");

//     const todayStart = moment
//       .utc()
//       .add(8, "hours")
//       .startOf("day")
//       .format("YYYY-MM-DD HH:mm:ss");
//     const todayEnd = moment
//       .utc()
//       .add(8, "hours")
//       .endOf("day")
//       .format("YYYY-MM-DD HH:mm:ss");

//     const yesterdayResponse = await axios.get(
//       `${cmdAPIURL}/?Method=betrecordbydate&PartnerKey=${cmdPartnerKey}&TimeType=2&StartDate=${yesterdayStart}&EndDate=${yesterdayEnd}&Version=0`,
//       {
//         headers: {
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     // Fetch today's bets
//     const todayResponse = await axios.get(
//       `${cmdAPIURL}/?Method=betrecordbydate&PartnerKey=${cmdPartnerKey}&TimeType=2&StartDate=${todayStart}&EndDate=${todayEnd}&Version=0`,
//       {
//         headers: {
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     // const response = await axios.get(
//     //   `${cmdAPIURL}/?Method=betrecordbydate&PartnerKey=${cmdPartnerKey}&TimeType=2&StartDate=${startDate}&EndDate=${endDate}&Version=0`,
//     //   {
//     //     headers: {
//     //       "Content-Type": "application/json",
//     //     },
//     //   }
//     // );
//     // if (response.data.Code !== 0) {
//     //   return { success: false, error: `API Error Code: ${response.data.Code}` };
//     // }

//     if (yesterdayResponse.data.Code !== 0 || todayResponse.data.Code !== 0) {
//       return {
//         success: false,
//         error: `API Error Code: ${yesterdayResponse.data.Code} / ${todayResponse.data.Code}`,
//       };
//     }

//     // Combine both datasets
//     const yesterdayData = yesterdayResponse.data.Data || [];
//     const todayData = todayResponse.data.Data || [];
//     const betData = [...yesterdayData, ...todayData];

//     // Filter valid bets
//     const validBets = betData.filter(
//       (bet) =>
//         bet.WinLoseStatus !== "P" &&
//         bet.DangerStatus !== "C" &&
//         bet.DangerStatus !== "R" &&
//         bet.IsCashOut !== true
//     );

//     // Prepare bulk operations
//     const bulkOps = validBets.map((bet) => ({
//       updateOne: {
//         filter: { betId: bet.ReferenceNo },
//         update: {
//           $set: {
//             betId: bet.ReferenceNo,
//             username: bet.SourceName,
//             betamount: parseFloat(bet.BetAmount),
//             winlossamount: parseFloat(bet.WinAmount),
//             status: bet.WinLoseStatus,
//             result: bet.DangerStatus,
//           },
//           $setOnInsert: {
//             claimed: false,
//             disqualified: false,
//           },
//         },
//         upsert: true,
//       },
//     }));

//     let insertedCount = 0;
//     let updatedCount = 0;

//     if (bulkOps.length > 0) {
//       const result = await SportsCMD368UnlimitedModal.bulkWrite(bulkOps);
//       insertedCount = result.upsertedCount;
//       updatedCount = result.modifiedCount;
//     }

//     return {
//       success: true,
//       total: betData.length,
//       inserted: insertedCount,
//       updated: updatedCount,
//       filtered: betData.length - validBets.length,
//     };
//   } catch (error) {
//     console.error("Error processing CMD368 bets:", error);
//     return { success: false, error: error.message };
//   }
// }

async function processCMD368Bets() {
  try {
    const todayStart = moment
      .utc()
      .add(8, "hours")
      .startOf("day")
      .format("YYYY-MM-DD HH:mm:ss");
    const todayEnd = moment
      .utc()
      .add(8, "hours")
      .endOf("day")
      .format("YYYY-MM-DD HH:mm:ss");

    const todayResponse = await axios.get(
      `${cmdAPIURL}/?Method=betrecordbydate&PartnerKey=${cmdPartnerKey}&TimeType=2&StartDate=${todayStart}&EndDate=${todayEnd}&Version=0`,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (todayResponse.data.Code !== 0) {
      return {
        success: false,
        error: `API Error Code: ${todayResponse.data.Code}`,
      };
    }

    const betData = todayResponse.data.Data || [];

    // Filter valid bets
    const validBets = betData.filter(
      (bet) =>
        bet.WinLoseStatus !== "P" &&
        bet.DangerStatus !== "C" &&
        bet.DangerStatus !== "R"
    );

    // Prepare bulk operations
    const bulkOps = validBets.map((bet) => ({
      updateOne: {
        filter: { betId: bet.ReferenceNo },
        update: {
          $set: {
            betId: bet.ReferenceNo,
            username: bet.SourceName,
            betamount: parseFloat(bet.BetAmount),
            winlossamount: parseFloat(bet.WinAmount),
            status: bet.WinLoseStatus,
            result: bet.DangerStatus,
            iscashout: bet.IsCashOut === true,
          },
          $setOnInsert: {
            claimed: false,
            disqualified: false,
          },
        },
        upsert: true,
      },
    }));

    let insertedCount = 0;
    let updatedCount = 0;

    if (bulkOps.length > 0) {
      const result = await SportsCMD368UnlimitedModal.bulkWrite(bulkOps);
      insertedCount = result.upsertedCount;
      updatedCount = result.modifiedCount;
    }

    return {
      success: true,
      total: betData.length,
      inserted: insertedCount,
      updated: updatedCount,
      filtered: betData.length - validBets.length,
    };
  } catch (error) {
    console.error("Error processing CMD368 bets:", error);
    return { success: false, error: error.message };
  }
}
module.exports = {
  processCMD368Bets,
};

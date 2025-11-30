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

const GameWalletLog = require("../../models/gamewalletlog.model");

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

module.exports = router;

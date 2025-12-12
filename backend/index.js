// server.js
const express = require("express");
const fetch = require("node-fetch"); // v2
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 4000;

const query = `
  query getUserProfile($username: String!) {
    allQuestionsCount {
      difficulty
      count
    }
    matchedUser(username: $username) {
      contributions { points }
      profile { reputation ranking }
      submissionCalendar
      submitStats {
        acSubmissionNum { difficulty count submissions }
        totalSubmissionNum { difficulty count submissions }
      }
    }
    recentSubmissionList(username: $username) {
      title titleSlug timestamp statusDisplay lang __typename
    }
    matchedUserStats: matchedUser(username: $username) {
      submitStats: submitStatsGlobal {
        acSubmissionNum { difficulty count submissions __typename }
        totalSubmissionNum { difficulty count submissions __typename }
        __typename
      }
    }

    # added contest ranking fields
    userContestRanking(username: $username) {
      attendedContestsCount
      rating
      globalRanking
      totalParticipants
      topPercentage
      badge { name }
    }
    userContestRankingHistory(username: $username) {
      attended
      rating
      ranking
      trendDirection
      problemsSolved
      totalProblems
      finishTimeInSeconds
      contest { title startTime }
    }
  }
`;

const formatData = (data) => {
  if (!data) return {};

  const matched = data.matchedUser || null;

  // Helper to safely sum counts from an acSubmissionNum array
  const sumAcArray = (arr) => {
    if (!Array.isArray(arr)) return 0;
    return arr.reduce((sum, entry) => {
      const n = Number(entry && entry.count);
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);
  };

  // Get per-difficulty accepted counts from user submitStats or global fallback
  let acArray = null;
  if (
    matched &&
    matched.submitStats &&
    Array.isArray(matched.submitStats.acSubmissionNum)
  ) {
    acArray = matched.submitStats.acSubmissionNum;
  } else if (
    data.matchedUserStats &&
    data.matchedUserStats.submitStats &&
    Array.isArray(data.matchedUserStats.submitStats.acSubmissionNum)
  ) {
    acArray = data.matchedUserStats.submitStats.acSubmissionNum;
  }

  // Map difficulty -> count (common keys: "All", "Easy", "Medium", "Hard")
  const perDifficulty = { easy: 0, medium: 0, hard: 0, total: 0 };
  if (acArray) {
    acArray.forEach((entry) => {
      if (!entry || entry.count == null) return;
      const count = Number(entry.count);
      if (!Number.isFinite(count)) return;
      const key = String(entry.difficulty || "").toLowerCase();
      if (key.includes("easy")) perDifficulty.easy += count;
      else if (key.includes("medium")) perDifficulty.medium += count;
      else if (key.includes("hard")) perDifficulty.hard += count;
      else if (key.includes("all")) perDifficulty.total += count; // 'All' entry if present
    });
    // If 'total' wasn't provided separately, compute it as sum of difficulties
    if (!perDifficulty.total) {
      perDifficulty.total =
        perDifficulty.easy + perDifficulty.medium + perDifficulty.hard;
    }
  }

  // Fallback: if no acArray but matched.profile or other sources exist, leave zeros/nulls
  const solved = perDifficulty.total || null;

  // rating: prefer userContestRanking.rating, then latest history entry, then profile.reputation
  let rating = null;
  if (
    data.userContestRanking &&
    typeof data.userContestRanking.rating === "number"
  ) {
    rating = data.userContestRanking.rating;
  } else if (
    Array.isArray(data.userContestRankingHistory) &&
    data.userContestRankingHistory.length > 0
  ) {
    const recent = data.userContestRankingHistory
      .slice()
      .reverse()
      .find((h) => h && typeof h.rating === "number");
    if (recent) rating = recent.rating;
  } else if (matched && matched.profile && matched.profile.reputation != null) {
    const n = Number(matched.profile.reputation);
    if (Number.isFinite(n)) rating = n;
  }

  let topPercentage = null;
  if (
    data.userContestRanking &&
    data.userContestRanking.topPercentage != null
  ) {
    const tp = Number(data.userContestRanking.topPercentage);
    topPercentage = Number.isFinite(tp) ? tp : null;
  } else if (
    data.userContestRanking &&
    data.userContestRanking.globalRanking != null &&
    data.userContestRanking.totalParticipants != null
  ) {
    const rank = Number(data.userContestRanking.globalRanking);
    const total = Number(data.userContestRanking.totalParticipants);
    if (Number.isFinite(rank) && Number.isFinite(total) && total > 0) {
      topPercentage = Number(((rank / total) * 100).toFixed(2));
    }
  } else if (
    Array.isArray(data.userContestRankingHistory) &&
    data.userContestRankingHistory.length > 0
  ) {
    // Try to derive from most recent history entry if it contains ranking and contest.totalParticipants (rare)
    const recent = data.userContestRankingHistory
      .slice()
      .reverse()
      .find(
        (h) =>
          h &&
          h.ranking != null &&
          h.contest &&
          h.contest.totalParticipants != null
      );
    if (recent) {
      const r = Number(recent.ranking);
      const t = Number(recent.contest.totalParticipants);
      if (Number.isFinite(r) && Number.isFinite(t) && t > 0) {
        topPercentage = Number(((r / t) * 100).toFixed(2));
      }
    }
  }

  // global ranking: prefer userContestRanking.globalRanking, then history latest 'ranking', then profile.ranking
  let globalRanking = null;
  if (
    data.userContestRanking &&
    data.userContestRanking.globalRanking != null
  ) {
    const n = Number(data.userContestRanking.globalRanking);
    if (Number.isFinite(n)) globalRanking = n;
  } else if (
    Array.isArray(data.userContestRankingHistory) &&
    data.userContestRankingHistory.length > 0
  ) {
    const recentRank = data.userContestRankingHistory
      .slice()
      .reverse()
      .find((h) => h && h.ranking != null);
    if (recentRank) {
      const n = Number(recentRank.ranking);
      if (Number.isFinite(n)) globalRanking = n;
    }
  } else if (matched && matched.profile && matched.profile.ranking != null) {
    const n = Number(matched.profile.ranking);
    if (Number.isFinite(n)) globalRanking = n;
  }

  return {
    totalSolved: solved,
    solvedByDifficulty: {
      easy: perDifficulty.easy,
      medium: perDifficulty.medium,
      hard: perDifficulty.hard,
    },
    globalRanking,
    rating,
    topPercentage,
  };
};

app.get("/leetcode/:id", async (req, res) => {
  const user = req.params.id;
  try {
    const resp = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Referer: "https://leetcode.com",
      },
      body: JSON.stringify({ query, variables: { username: user } }),
    });

    const json = await resp.json();

    if (json.errors) {
      return res.status(400).json(json);
    }

    const formatted = formatData(json.data);
    return res.json(formatted);
  } catch (err) {
    console.error("Error fetching LeetCode data:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`LeetCode API server running on port ${PORT}`);
});

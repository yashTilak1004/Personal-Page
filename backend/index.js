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
      contributions {
        points
      }
      profile {
        reputation
        ranking
      }
      submissionCalendar
      submitStats {
        acSubmissionNum {
          difficulty
          count
          submissions
        }
        totalSubmissionNum {
          difficulty
          count
          submissions
        }
      }
    }
    recentSubmissionList(username: $username) {
      title
      titleSlug
      timestamp
      statusDisplay
      lang
      __typename
    }
    matchedUserStats: matchedUser(username: $username) {
      submitStats: submitStatsGlobal {
        acSubmissionNum {
          difficulty
          count
          submissions
          __typename
        }
        totalSubmissionNum {
          difficulty
          count
          submissions
          __typename
        }
        __typename
      }
    }
  }
`;

const formatData = (data) => {
  return {
    totalSolved: data.matchedUser.submitStats.acSubmissionNum[0].count,
    totalSubmissions: data.matchedUser.submitStats.totalSubmissionNum,
    totalQuestions: data.allQuestionsCount[0].count,
    easySolved: data.matchedUser.submitStats.acSubmissionNum[1].count,
    totalEasy: data.allQuestionsCount[1].count,
    mediumSolved: data.matchedUser.submitStats.acSubmissionNum[2].count,
    totalMedium: data.allQuestionsCount[2].count,
    hardSolved: data.matchedUser.submitStats.acSubmissionNum[3].count,
    totalHard: data.allQuestionsCount[3].count,
    ranking: data.matchedUser.profile.ranking,
    contributionPoint: data.matchedUser.contributions.points,
    reputation: data.matchedUser.profile.reputation,
    submissionCalendar: (() => {
      try {
        return JSON.parse(data.matchedUser.submissionCalendar);
      } catch (e) {
        return data.matchedUser.submissionCalendar;
      }
    })(),
    recentSubmissions: data.recentSubmissionList,
    matchedUserStats: data.matchedUser.submitStats,
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

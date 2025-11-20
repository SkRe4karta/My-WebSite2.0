// LeetCode не предоставляет официального API, поэтому используем парсинг профиля
// Это упрощенная версия, в реальности может потребоваться более сложный парсинг

export type LeetCodeStats = {
  username: string;
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  acceptanceRate: number;
  ranking: number;
  contributionPoints: number;
};

export async function getLeetCodeStats(username: string): Promise<LeetCodeStats | null> {
  try {
    // Используем GraphQL API LeetCode (неофициальный, но стабильный)
    const query = `
      query getUserProfile($username: String!) {
        matchedUser(username: $username) {
          username
          submitStats {
            acSubmissionNum {
              difficulty
              count
              submissions
            }
          }
          profile {
            ranking
            contributionPoints
          }
        }
      }
    `;

    const response = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables: { username },
      }),
      next: { revalidate: 3600 }, // Кэш на 1 час
    });

    if (!response.ok) {
      throw new Error(`LeetCode API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.data?.matchedUser) {
      return null;
    }

    const user = data.data.matchedUser;
    const stats = user.submitStats.acSubmissionNum;

    const easy = stats.find((s: any) => s.difficulty === "Easy") || { count: 0 };
    const medium = stats.find((s: any) => s.difficulty === "Medium") || { count: 0 };
    const hard = stats.find((s: any) => s.difficulty === "Hard") || { count: 0 };

    const totalSolved = easy.count + medium.count + hard.count;
    const totalSubmissions = easy.submissions + medium.submissions + hard.submissions;
    const acceptanceRate = totalSubmissions > 0 ? (totalSolved / totalSubmissions) * 100 : 0;

    return {
      username: user.username,
      totalSolved,
      easySolved: easy.count,
      mediumSolved: medium.count,
      hardSolved: hard.count,
      acceptanceRate: Math.round(acceptanceRate * 100) / 100,
      ranking: user.profile.ranking || 0,
      contributionPoints: user.profile.contributionPoints || 0,
    };
  } catch (error) {
    console.error("Error fetching LeetCode stats:", error);
    return null;
  }
}


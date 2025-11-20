type GitHubCommit = {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
  html_url: string;
};

type GitHubRepo = {
  id: number;
  name: string;
  full_name: string;
  description: string;
  stargazers_count: number;
  forks_count: number;
  language: string;
  html_url: string;
  updated_at: string;
};

export async function getGitHubActivity(username: string, token?: string): Promise<GitHubCommit[]> {
  try {
    const headers: HeadersInit = {
      Accept: "application/vnd.github.v3+json",
    };

    if (token) {
      headers.Authorization = `token ${token}`;
    }

    const response = await fetch(`https://api.github.com/users/${username}/events/public`, {
      headers,
      next: { revalidate: 300 }, // Кэш на 5 минут
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const events = await response.json();
    const pushEvents = events
      .filter((event: any) => event.type === "PushEvent")
      .slice(0, 10)
      .flatMap((event: any) =>
        event.payload.commits.map((commit: any) => ({
          sha: commit.sha,
          commit: {
            message: commit.message,
            author: {
              name: commit.author.name,
              date: event.created_at,
            },
          },
          html_url: `https://github.com/${event.repo.name}/commit/${commit.sha}`,
        }))
      );

    return pushEvents;
  } catch (error) {
    console.error("Error fetching GitHub activity:", error);
    return [];
  }
}

export async function getGitHubRepos(username: string, token?: string): Promise<GitHubRepo[]> {
  try {
    const headers: HeadersInit = {
      Accept: "application/vnd.github.v3+json",
    };

    if (token) {
      headers.Authorization = `token ${token}`;
    }

    const response = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=10`, {
      headers,
      next: { revalidate: 600 }, // Кэш на 10 минут
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const repos = await response.json();
    return repos.map((repo: any) => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description,
      stargazers_count: repo.stargazers_count,
      forks_count: repo.forks_count,
      language: repo.language,
      html_url: repo.html_url,
      updated_at: repo.updated_at,
    }));
  } catch (error) {
    console.error("Error fetching GitHub repos:", error);
    return [];
  }
}


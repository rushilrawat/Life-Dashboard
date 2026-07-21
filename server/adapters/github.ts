import type { BlockResult, HeatmapResult, ListResult } from "../../src/types.ts";
import { CAPABILITIES } from "../../src/types.ts";

export const requiredEnvVars = ["GITHUB_TOKEN"];

function authHeaders() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN not configured");
  return { Authorization: `bearer ${token}`, "Content-Type": "application/json" };
}

const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";
const HEATMAP_WEEKS = 12;

const CONTRIBUTIONS_QUERY = `
  query($login: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $login) {
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          weeks {
            contributionDays {
              date
              contributionCount
            }
          }
        }
      }
    }
  }
`;

interface ContributionDay {
  date: string;
  contributionCount: number;
}

async function commitHeatmap(params: Record<string, string>): Promise<HeatmapResult> {
  const username = params.username;
  if (!username) throw new Error("commit-heatmap requires a username");

  const to = new Date();
  const from = new Date(to.getTime() - HEATMAP_WEEKS * 7 * 24 * 60 * 60 * 1000);

  const res = await fetch(GITHUB_GRAPHQL_URL, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      query: CONTRIBUTIONS_QUERY,
      variables: { login: username, from: from.toISOString(), to: to.toISOString() },
    }),
  });

  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  const body = await res.json();
  if (body.errors) throw new Error(body.errors[0]?.message ?? "GitHub GraphQL error");

  const weeks = body.data?.user?.contributionsCollection?.contributionCalendar?.weeks as
    | { contributionDays: ContributionDay[] }[]
    | undefined;
  if (!weeks) throw new Error(`GitHub user "${username}" not found or has no public contributions`);

  const days = weeks.flatMap((week) =>
    week.contributionDays.map((d) => ({ date: d.date, value: d.contributionCount })),
  );

  return { days };
}

interface PushEvent {
  type: string;
  repo: { name: string };
  created_at: string;
  payload: { commits?: { message: string }[] };
}

const RECENT_COMMITS_LIMIT = 10;

async function recentCommits(params: Record<string, string>): Promise<ListResult> {
  const username = params.username;
  if (!username) throw new Error("recent-commits requires a username");

  const res = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/events/public`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);

  const events = (await res.json()) as PushEvent[];
  const pushes = events.filter((e) => e.type === "PushEvent").slice(0, RECENT_COMMITS_LIMIT);

  return {
    items: pushes.map((e) => {
      const commits = e.payload.commits ?? [];
      const title = commits.length === 1 ? commits[0].message : `${commits.length} commits`;
      return { title, subtitle: e.repo.name, date: e.created_at.slice(0, 10) };
    }),
  };
}

type CapabilityFn = (params: Record<string, string>) => Promise<BlockResult>;

const CAPABILITY_FNS: Record<string, CapabilityFn> = {
  "commit-heatmap": commitHeatmap,
  "recent-commits": recentCommits,
};

export async function runCapability(
  capabilityId: string,
  params: Record<string, string>,
): Promise<BlockResult | null> {
  const known = CAPABILITIES.github.some((c) => c.id === capabilityId);
  if (!known) return null;
  return CAPABILITY_FNS[capabilityId](params);
}

import React, { useMemo, useState } from "react";
import {
  SPRINT1_AGENT_STATES,
  SPRINT1_FORUM_POSTS_BY_ROUND,
  SPRINT1_ROUND_SNAPSHOTS,
} from "@ai-fashion-forum/shared-types";

function getAgentMap() {
  return new Map(SPRINT1_AGENT_STATES.map((agent) => [agent.agent_id, agent]));
}

function getRoundPostMap() {
  return new Map(SPRINT1_FORUM_POSTS_BY_ROUND.map((entry) => [entry.round_id, entry]));
}

function formatDelta(delta = {}) {
  return Object.entries(delta).map(([key, value]) => ({
    key,
    value: value > 0 ? `+${value}` : String(value),
  }));
}

function agentTone(agentId) {
  const tones = {
    S01: "from-emerald-500/20 to-teal-500/5 border-emerald-400/30",
    S02: "from-sky-500/20 to-indigo-500/5 border-sky-400/30",
    S03: "from-amber-500/20 to-rose-500/5 border-amber-400/30",
  };

  return tones[agentId] || "from-zinc-500/20 to-zinc-500/5 border-zinc-400/20";
}

function AgentChip({ label, value }) {
  return (
    <div className="rounded-full border border-zinc-800 bg-zinc-950/80 px-3 py-1 text-xs text-zinc-300">
      <span className="text-zinc-500">{label}</span>{" "}
      <span className="text-zinc-100">{value}</span>
    </div>
  );
}

export default function Sprint1ReplayApp() {
  const [selectedRoundId, setSelectedRoundId] = useState(SPRINT1_ROUND_SNAPSHOTS[0].round_id);
  const [selectedAgentId, setSelectedAgentId] = useState("S01");
  const agentMap = useMemo(() => getAgentMap(), []);
  const roundPostMap = useMemo(() => getRoundPostMap(), []);
  const selectedRound =
    SPRINT1_ROUND_SNAPSHOTS.find((round) => round.round_id === selectedRoundId) ||
    SPRINT1_ROUND_SNAPSHOTS[0];
  const selectedRoundPosts = roundPostMap.get(selectedRound.round_id) || { posts: [], shared_content: null };
  const selectedAgentSnapshot =
    selectedRound.agent_snapshots.find((snapshot) => snapshot.agent_id === selectedAgentId) ||
    selectedRound.agent_snapshots[0];
  const selectedAgent = agentMap.get(selectedAgentSnapshot.agent_id);

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 lg:px-8">
        <header className="rounded-[28px] border border-zinc-800 bg-zinc-950/70 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                Sprint 1 Replay Surface
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-white">
                Identity Loop Vertical Slice
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-zinc-400">
                같은 외부 자극을 본 에이전트들이 서로 다른 의미 프레임으로 반응하고, 그
                반응이 기억과 자기서사를 거쳐 포럼 글 차이로 드러나는지 보는 리뷰용 화면.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <AgentChip label="Agents" value={String(SPRINT1_AGENT_STATES.length)} />
              <AgentChip label="Rounds" value={String(SPRINT1_ROUND_SNAPSHOTS.length)} />
              <AgentChip label="Shared Stimulus" value="1" />
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-4 rounded-[28px] border border-zinc-800 bg-zinc-950/70 p-4">
            <div>
              <div className="mb-2 text-xs uppercase tracking-[0.25em] text-zinc-500">
                Round Timeline
              </div>
              <div className="space-y-2">
                {SPRINT1_ROUND_SNAPSHOTS.map((round, index) => {
                  const isActive = round.round_id === selectedRound.round_id;
                  return (
                    <button
                      key={round.round_id}
                      type="button"
                      onClick={() => setSelectedRoundId(round.round_id)}
                      className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                        isActive
                          ? "border-zinc-200 bg-zinc-100 text-zinc-950"
                          : "border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-700"
                      }`}
                    >
                      <div className="text-xs uppercase tracking-[0.2em]">
                        Round {index}
                      </div>
                      <div className="mt-1 text-sm font-medium">Tick {round.tick}</div>
                      <div className={`mt-2 text-xs leading-5 ${isActive ? "text-zinc-700" : "text-zinc-500"}`}>
                        {round.notes[0]}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs uppercase tracking-[0.25em] text-zinc-500">
                Agent Panels
              </div>
              <div className="space-y-2">
                {selectedRound.agent_snapshots.map((snapshot) => {
                  const agent = agentMap.get(snapshot.agent_id);
                  const isActive = snapshot.agent_id === selectedAgentSnapshot.agent_id;
                  return (
                    <button
                      key={snapshot.agent_id}
                      type="button"
                      onClick={() => setSelectedAgentId(snapshot.agent_id)}
                      className={`w-full rounded-2xl border bg-gradient-to-br p-3 text-left transition ${agentTone(
                        snapshot.agent_id,
                      )} ${isActive ? "ring-1 ring-white/40" : "opacity-85 hover:opacity-100"}`}
                    >
                      <div className="text-sm font-semibold text-white">{agent?.display_name}</div>
                      <div className="text-xs text-zinc-300">@{agent?.handle}</div>
                      <div className="mt-2 text-xs text-zinc-200">
                        {snapshot.self_narrative_summary}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          <main className="space-y-6">
            <section className="rounded-[28px] border border-zinc-800 bg-zinc-950/70 p-5">
              <div className="mb-3 text-xs uppercase tracking-[0.25em] text-zinc-500">
                Shared Stimulus
              </div>
              <div className="rounded-3xl border border-zinc-800 bg-black/40 p-5">
                <div className="text-sm text-zinc-500">
                  {selectedRoundPosts.shared_content?.content_id || selectedRound.shared_content_ids[0]}
                </div>
                <div className="mt-2 text-xl font-semibold text-white">
                  {selectedRoundPosts.shared_content?.title || "Shared external content stimulus"}
                </div>
                <div className="mt-3 text-sm leading-6 text-zinc-400">
                  같은 외부 자극을 본 후, 각 에이전트가 무엇을 더 중요하게 읽는지와 그 결과
                  어떤 포럼 글을 쓰는지 비교한다.
                </div>
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <div className="rounded-[28px] border border-zinc-800 bg-zinc-950/70 p-5">
                <div className="mb-3 text-xs uppercase tracking-[0.25em] text-zinc-500">
                  Drift Inspection
                </div>
                <div className={`rounded-3xl border bg-gradient-to-br p-5 ${agentTone(selectedAgentId)}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xl font-semibold text-white">{selectedAgent?.display_name}</div>
                      <div className="text-sm text-zinc-300">@{selectedAgent?.handle}</div>
                    </div>
                    <div className="rounded-full border border-white/15 bg-black/20 px-3 py-1 text-xs text-zinc-200">
                      {selectedAgentSnapshot.reaction_summary.stance}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <AgentChip label="Affect" value={selectedAgentSnapshot.reaction_summary.affect} />
                    <AgentChip label="Dominant Topic" value={selectedAgentSnapshot.exposure_summary.dominant_topic} />
                    <AgentChip label="Generated Posts" value={String(selectedAgentSnapshot.generated_post_ids.length)} />
                    <AgentChip
                      label="Narrative Write"
                      value={selectedAgentSnapshot.memory_write_summary.self_narrative_written ? "yes" : "no"}
                    />
                  </div>

                  <div className="mt-5">
                    <div className="mb-2 text-xs uppercase tracking-[0.2em] text-zinc-300">What Changed</div>
                    <div className="flex flex-wrap gap-2">
                      {formatDelta(selectedAgentSnapshot.identity_delta).map((delta) => (
                        <span
                          key={delta.key}
                          className="rounded-full border border-white/15 bg-black/20 px-3 py-1 text-xs text-zinc-100"
                        >
                          {delta.key} {delta.value}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-zinc-100">
                    {selectedAgentSnapshot.self_narrative_summary}
                  </div>

                  <div className="mt-4 text-xs leading-5 text-zinc-300">
                    Seen: {selectedAgentSnapshot.exposure_summary.seen_content_ids.join(", ")}
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-zinc-800 bg-zinc-950/70 p-5">
                <div className="mb-3 text-xs uppercase tracking-[0.25em] text-zinc-500">
                  Forum Output By Round
                </div>
                <div className="space-y-3">
                  {selectedRoundPosts.posts.map((post) => (
                    <article
                      key={post.post_id}
                      className={`rounded-3xl border bg-gradient-to-br p-5 ${agentTone(post.agent_id)}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-sm font-semibold text-white">{post.handle}</div>
                          <div className="text-xs text-zinc-300">{post.meaning_frame}</div>
                        </div>
                        <div className="rounded-full border border-white/15 bg-black/20 px-3 py-1 text-xs text-zinc-200">
                          {post.stance_signal}
                        </div>
                      </div>
                      <h2 className="mt-4 text-xl font-semibold leading-tight text-white">{post.title}</h2>
                      <p className="mt-3 text-sm leading-6 text-zinc-100">{post.body}</p>
                      <div className="mt-4 text-xs text-zinc-300">
                        source: {selectedRoundPosts.shared_content?.content_id}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          </main>
        </section>
      </div>
    </div>
  );
}

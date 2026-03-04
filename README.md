# term-quiz

A terminal-based Kahoot replacement. Run live quizzes from your command line.

## Install

```bash
npm install
npm run build
npm link
```

## Usage

### Create a quiz

```bash
quiz --build
```

Follow the prompts to add questions and answer choices (A–D), then mark the correct answer. Quizzes are saved to `~/.term-quiz/quizzes/`.

### Host a quiz

```bash
quiz --host "My Quiz Title"
```

Or build and host in one step:

```bash
quiz --build --host
```

A **7-letter code** is generated and a public tunnel is opened via [localtunnel](https://github.com/localtunnel/localtunnel). Share the code with participants — they don't need to be on your network.

```
┌─────────────────────────────┐
│  Join code:                 │
│        ABCXYZ               │
│                             │
│  quiz --join ABCXYZ         │
└─────────────────────────────┘
```

Once at least one player joins, press **S** or **Space** to start.

### Join a quiz

```bash
quiz --join ABCXYZ
```

Enter your name and wait for the host to start. When a question appears, press **A**, **B**, **C**, or **D** to answer. Faster correct answers earn more points (100–1000).

### Same-machine / local network (no tunnel)

If the tunnel is unavailable, the lobby will show `LOCAL ONLY — ws://localhost:<port>`. Participants on the same machine can join with:

```bash
quiz --join ABCXYZ --port <port>
```

## How it works

```
Host machine                        Participant machines
─────────────────────────────────────────────────────────
quiz --host "My Quiz"
  │
  ├─ starts WebSocket server (port ~3456)
  ├─ opens localtunnel → abcxyz.loca.lt
  └─ displays code: ABCXYZ
                                    quiz --join ABCXYZ
                                      │
                                      └─ connects to wss://abcxyz.loca.lt
```

- The 7-letter code **is** the tunnel subdomain — no IP addresses needed
- Participants connect directly through the tunnel to the host's machine
- The host controls pacing: advance to the next question by pressing **N** or **Space**
- Results appear automatically once everyone has answered

## Quiz flow

1. Host creates and shares the code
2. Participants join and see the lobby
3. Host presses **S** to start
4. Each question appears on everyone's screen simultaneously
5. After all participants answer, the leaderboard updates
6. Host advances to the next question
7. Final leaderboard shown at the end

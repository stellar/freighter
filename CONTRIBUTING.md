# Contributing

Thanks for helping improve Freighter. We welcome bug reports, feature requests, documentation fixes, and code from outside of the team.

**Read the [Stellar Contribution Guide](https://github.com/stellar/.github/blob/master/CONTRIBUTING.md) first.** It is the contribution policy for every repository in the Stellar organization, including this one. It covers how to report a bug, when a pull request will be accepted, and what you are responsible for when you use AI tools. The [Code of Conduct](https://github.com/stellar/.github/blob/master/CODE_OF_CONDUCT.md) applies here as well.

This document does not replace it. It adds what is specific to this repository. The code handles private keys, signs transactions, and moves funds, so some steps are stricter here and some are spelled out in more detail. Where this document is silent, the Stellar Contribution Guide governs.

This document is about *how to contribute*. For prerequisites, local setup, architecture, and the day-to-day commands, see [DEVELOPMENT.md](DEVELOPMENT.md).

## Start with an issue

We encourage contributors to start their task by opening an issue instead of a pull request. This lets maintainers confirm the problem is real, agree on the approach, and check that nobody is already working on it before anyone writes code.

1. Search existing issues in this repository first.
2. Open an issue describing the problem, the user impact, and, if you have one, the approach you intend to take.
3. Wait for a maintainer to triage it. An issue is ready to work on when a maintainer has replied confirming the approach or labeled it `accepted` or `help wanted`.
4. Comment on the issue to claim it before starting.

Pull requests without an accepted issue may be closed without review. This is not a judgment on the code. Reviewer time is the scarcest resource this project has, and vetting work at the issue stage is how we protect it.

Exceptions that do not need an issue first:

- Typo and formatting fixes in documentation.
- Fixing a broken link.
- Dependency bumps requested by a maintainer.

## Report a bug

Include the version or commit you are running, your platform (browser and OS, mobile OS and device, or Go/Node version), reproduction steps, and the expected and observed behavior. Attach logs if you have them/if applicable.

Before posting, remove secret keys, seed phrases, mnemonics, API keys, session tokens, and any account data that is not yours to share. Public keys and transaction hashes are fine.

## Suggest a feature

Open an issue describing the problem and the workflow you want to support, not just the feature you want built. Explain who benefits and how. Maintainers will weigh it against the roadmap and respond. Every feature needs explicit agreement with a maintainer on its functional requirements before any code is written. Features that change key management, signing, or transaction construction need an agreed design as well.

## Improve the documentation

Documentation fixes are welcome. Use synthetic examples. Keep example addresses, keys, and amounts fictional and clearly non-functional.

## Report a security issue

Do not open a public issue for a vulnerability in this repository. Report it privately through the [Stellar security policy](https://github.com/stellar/.github/blob/master/SECURITY.md), which describes the bug bounty program and how to submit a report.

Do not post exploit details, proof-of-concept code, affected user accounts, or credentials publicly, including in pull request descriptions or commit messages. If you believe a dependency has a vulnerability, report it to that project through its own security policy.

## Pull requests

A pull request is ready for review when all of the following are true:

- **Linked issue.** The description references the accepted issue it resolves. One issue per pull request unless a maintainer agreed otherwise.
- **Focused scope.** No unrelated refactors, formatting sweeps, or drive-by fixes. Open those separately.
- **Tests.** New behavior has tests. Bug fixes have a regression test. If a test is genuinely infeasible, say so in the description and explain why.
- **Passing CI.** Lint, type checks, and tests pass on the target branch.
- **Clear title.** Follow the target repository's convention, typically a `feat:`, `fix:`, `refactor:`, `docs:`, or `ci:` prefix and a short summary.
- **Written by you.** The description is in your own words. It explains what changed, why, and how you verified it. See [Using LLMs responsibly](#using-llms-responsibly).
- **Understood by you.** You can explain and defend every line in the diff. If a reviewer asks why something is there, "the tool produced it" is not an answer.

Keep pull requests as small and focused as possible. A pull request should do one thing, and the diff should contain only what that one thing requires. If you find yourself explaining several unrelated changes in the description, that is a sign it should be more than one pull request. Large changes should be split into a sequence of small, individually reviewable pull requests agreed on the issue.

Maintainers may close pull requests that do not meet these requirements without a detailed review. You are welcome to fix the gaps and reopen.

## Using LLMs responsibly

The [AI-Assisted Contributions](https://github.com/stellar/.github/blob/master/CONTRIBUTING.md#ai-assisted-contributions) section of the Stellar Contribution Guide applies in full.

LLM-assisted contributions are welcome. Use LLMs to explore the codebase, explain unfamiliar code, draft, refine, test, and review. The guidance below is about how to use them well. It comes down to two things: talk to maintainers yourself, and own every line you submit.

### Why this matters

The code handles private keys, signs transactions, and moves funds. A defect that would be an inconvenience elsewhere is an irreversible loss here. LLMs make it easy to produce large volumes of plausible code and prose. Human review capacity does not scale with it. A contribution is only useful if a maintainer can trust that a person understood it, verified it, and can answer for it.

### Write to maintainers yourself

Pull request descriptions, issue reports, review replies, and comments are a conversation between you and the people maintaining the project. Write them in your own words.

- **Describe what you did, not what the tool did.** Say what changed, why, what you considered and rejected, and how you verified it. A model summary of the diff tells the reviewer nothing they cannot see themselves.
- **Answer review questions yourself.** When a maintainer asks why something is there, respond from your own understanding. Do not paste the question into a model and return its answer.
- **Keep it short and specific.** Generated text tends toward length and generality. Cut it down to what the reviewer needs to make a decision.
- **Quote model output when you use it.** If a model's explanation or analysis is genuinely part of the point you are making, mark it as a quote so readers know whose position they are reading.

### Understand the entire change

You are responsible for every line in your pull request, whether you typed it or a tool did.

- **Read the whole diff before opening the pull request.** Every file, every hunk. If a tool changed something you did not ask for, remove it or explain it.
- **Be able to explain any line.** If a reviewer points at a line and asks why it is there, "the tool produced it" is not an answer. If you cannot explain it, you are not ready to submit it.
- **Verify, do not assume.** Run the tests. Exercise the change by hand. Generated tests that pass are not proof that the tests check the right thing. Read them.
- **Know the blast radius.** Understand what calls the code you changed and what it calls. This matters most in key handling, signing, transaction construction, and anything that authorizes movement of funds. Treat generated changes in those areas with extra suspicion, and expect reviewers to do the same.
- **Keep generated changes small.** Tools make it easy to change many files at once. Reviewers cannot verify a large generated diff any faster than a large handwritten one. Split it.

### Nobody has to use an LLM

Contributions written entirely by hand are always welcome and will never be held to a higher standard because of tools you did not use.

## Review expectations

Maintainers aim to triage new issues within a week and to give a first response on pull requests linked to accepted issues within two weeks. This is best effort and could change according to maintainer availability.

Maintainers are not obligated to review contributions that do not meet the requirements above, and may close them without performing the verification that is the contributor's responsibility.

## For maintainers

- Label issues when you triage them. `accepted` or `help wanted` signals a contributor may start work; a maintainer's written confirmation of the approach does too. Issues without a qualifying label or confirmation are not ready.
- When closing a pull request under this policy, link to the section that applies.

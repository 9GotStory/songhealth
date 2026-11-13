// A reporter that names the tests which passed close to their timeout, or ran past it (#247 retro).
//
// A test that grows with each ticket, such as the cards suite's walk over every Homepage card,
// passes for a long while before it fails: in #247 one took 15 to 24 of its 30 seconds, and three
// widths of it failed in a run that shared the host with other work. After the run this prints
// each passed test that used 60 % or more of its own timeout (`test.setTimeout` included), and each
// test that timed out, slowest first, so the next ticket sees it coming. Under each it names the
// test's two slowest `test.step`s, so a run that was slow in its fixtures, such as returning the
// runtime's content to draft, reads differently from one slow on the page (#249 retro: two full
// runs timed out there with nothing to say where). It never changes the run's result.

import type { Reporter, TestCase, TestResult, TestStep } from "@playwright/test/reporter";

/** The share of its timeout from which a passed test is reported. */
const SHARE = 0.6;

/** Every `test.step` of `steps`, the nested ones too, each with its title path. */
function namedSteps(steps: TestStep[], path: string[] = []): Array<{ title: string; ms: number }> {
	return steps.flatMap((step) => {
		const titles = step.category === "test.step" ? [...path, step.title] : path;
		const own =
			step.category === "test.step" ? [{ title: titles.join(" › "), ms: step.duration }] : [];
		return [...own, ...namedSteps(step.steps, titles)];
	});
}

export default class NearTimeoutReporter implements Reporter {
	private readonly near: Array<{
		title: string;
		seconds: number;
		timeout: number;
		timedOut: boolean;
		steps: string[];
	}> = [];

	onTestEnd(test: TestCase, result: TestResult): void {
		const timedOut = result.status === "timedOut";
		if ((result.status !== "passed" && !timedOut) || test.timeout <= 0) return;
		if (!timedOut && result.duration < SHARE * test.timeout) return;
		this.near.push({
			title: test.titlePath().slice(2).join(" › "),
			seconds: result.duration / 1000,
			timeout: test.timeout / 1000,
			timedOut,
			steps: namedSteps(result.steps)
				.sort((a, b) => b.ms - a.ms)
				.slice(0, 2)
				.map(({ title, ms }) => `${(ms / 1000).toFixed(1)} s  ${title}`),
		});
	}

	onEnd(): void {
		if (this.near.length === 0) return;
		console.log(`\nnear their timeout (${SHARE * 100} % or more of it), or past it:`);
		for (const { title, seconds, timeout, timedOut, steps } of this.near.sort(
			(a, b) => b.seconds - a.seconds,
		)) {
			const mark = timedOut ? "  timed out" : "";
			console.log(`  ${seconds.toFixed(1)} s of ${timeout} s${mark}  ${title}`);
			for (const step of steps) console.log(`      ${step}`);
		}
	}
}

// A reporter that names the tests which passed close to their timeout (#247 retro).
//
// A test that grows with each ticket, such as the cards suite's walk over every Homepage card,
// passes for a long while before it fails: in #247 one took 15 to 24 of its 30 seconds, and three
// widths of it failed in a run that shared the host with other work. After the run this prints
// each passed test that used 60 % or more of its own timeout (`test.setTimeout` included), slowest
// first, so the next ticket sees it coming. It never changes the run's result.

import type { Reporter, TestCase, TestResult } from "@playwright/test/reporter";

/** The share of its timeout from which a passed test is reported. */
const SHARE = 0.6;

export default class NearTimeoutReporter implements Reporter {
	private readonly near: Array<{ title: string; seconds: number; timeout: number }> = [];

	onTestEnd(test: TestCase, result: TestResult): void {
		if (result.status !== "passed" || test.timeout <= 0) return;
		if (result.duration < SHARE * test.timeout) return;
		this.near.push({
			title: test.titlePath().slice(2).join(" › "),
			seconds: result.duration / 1000,
			timeout: test.timeout / 1000,
		});
	}

	onEnd(): void {
		if (this.near.length === 0) return;
		console.log(`\nnear their timeout (${SHARE * 100} % or more of it):`);
		for (const { title, seconds, timeout } of this.near.sort((a, b) => b.seconds - a.seconds)) {
			console.log(`  ${seconds.toFixed(1)} s of ${timeout} s  ${title}`);
		}
	}
}

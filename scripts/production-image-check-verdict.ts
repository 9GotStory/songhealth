// The verdicts scripts/production-image-check.sh asks for (#453), from
// scripts/production-image-check/plan.ts:
//
//   node scripts/production-image-check-verdict.ts stop-contract <unit>
//     prints "<init: true|false> <stop timeout in s>" for the Quadlet unit's text;
//   node scripts/production-image-check-verdict.ts startup-build <report>
//     prints the report's figures, from the JSON the image's startup build wrote;
//   node scripts/production-image-check-verdict.ts stop <unit> <exit code> <seconds>
//
// A verdict prints each failure on its own line to stderr. Exit status 1: a failure; 2: a wrong
// argument.

import { readFileSync } from "node:fs";

import {
	startupBuildFailures,
	stopContract,
	stopFailures,
	type StartupBuild,
} from "./production-image-check/plan.ts";

/** The startup build's report: the verdict's facts and the figures recorded beside them. */
interface StartupBuildReport extends StartupBuild {
	/** The build output's last lines, printed when it fails. */
	tail: string[];
	/** The build's wall-clock time in s. */
	seconds: number;
	/** The container's peak memory in bytes (cgroup v2 memory.peak), or null where unreadable. */
	peakBytes: number | null;
}

const MIB = 1024 * 1024;

function main(args: string[]): number {
	const [command, ...rest] = args;
	let failures: string[];
	if (command === "stop-contract" && rest.length === 1) {
		const { init, stopTimeout } = stopContract(readFileSync(rest[0], "utf8"));
		console.log(`${init} ${stopTimeout}`);
		return 0;
	} else if (command === "startup-build" && rest.length === 1) {
		const report = JSON.parse(rest[0]) as StartupBuildReport;
		const peak =
			report.peakBytes === null ? "unreadable" : `${Math.round(report.peakBytes / MIB)} MiB`;
		console.log(
			`  uid ${report.uid}, exit ${report.status}, ${report.seconds} s, peak memory ${peak}`,
		);
		if (report.status !== 0) for (const line of report.tail) console.log(`  | ${line}`);
		failures = startupBuildFailures(report);
	} else if (command === "stop" && rest.length === 3) {
		const contract = stopContract(readFileSync(rest[0], "utf8"));
		failures = stopFailures({ exitCode: Number(rest[1]), seconds: Number(rest[2]) }, contract);
	} else {
		console.error(
			"usage: production-image-check-verdict.ts stop-contract <unit> | startup-build <report> |",
		);
		console.error("       stop <unit> <exit code> <seconds>");
		return 2;
	}
	for (const failure of failures) console.error(failure);
	return failures.length > 0 ? 1 : 0;
}

process.exitCode = main(process.argv.slice(2));

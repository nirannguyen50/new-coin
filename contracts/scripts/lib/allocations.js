// Pure helpers for turning an allocation config into concrete amounts and
// vesting schedules. No network access, so this file is unit-testable.
//
// Schedule semantics match tokenomics/unlock_schedule.py:
//   - `tgeUnlockPercent` (% of the bucket) is sent directly at TGE.
//   - `cliffMonths`: the remainder is fully locked until TGE + cliffMonths.
//   - `vestingMonths`: after the cliff the remainder vests linearly over this many
//     months, i.e. wallet.start = TGE + cliff, wallet.duration = vestingMonths.
//   - `vestingMonths == 0`: the remainder unlocks in one go at TGE + cliffMonths
//     (a wallet with duration 0). With cliffMonths == 0 too, everything is
//     simply sent at TGE and no wallet is deployed.

const SECONDS_PER_MONTH = 30n * 24n * 60n * 60n; // 30 days
const BPS_DENOMINATOR = 10_000n; // percents are handled with 2 decimal places

/** Convert a percent (number or numeric string, <= 2 decimals) to basis points as a bigint. */
function percentToBps(value, label) {
  const str = String(value).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(str)) {
    throw new Error(`${label}: percent "${value}" must be a non-negative number with at most 2 decimal places`);
  }
  const [whole, frac = ""] = str.split(".");
  return BigInt(whole) * 100n + BigInt(frac.padEnd(2, "0"));
}

function requireNonNegativeInt(value, label) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer, got ${JSON.stringify(value)}`);
  }
  return BigInt(value);
}

/**
 * Validate the config and compute per-bucket amounts.
 *
 * @param {object} config          Parsed JSON (`{ allocations: [...] }`).
 * @param {bigint} totalSupply     Token total supply in base units (wei).
 * @param {bigint} tgeTimestamp    Unix time of TGE (seconds).
 * @param {(a: string) => boolean} isAddress  Address validator (ethers.isAddress).
 * @returns {{ plan: Array<object>, dust: bigint }} One plan entry per bucket.
 */
function buildAllocationPlan(config, totalSupply, tgeTimestamp, isAddress) {
  if (!config || !Array.isArray(config.allocations) || config.allocations.length === 0) {
    throw new Error("Config must contain a non-empty `allocations` array");
  }

  let totalBps = 0n;
  let assigned = 0n;
  const plan = [];

  for (const [i, a] of config.allocations.entries()) {
    const label = `allocations[${i}] (${a.name || "unnamed"})`;
    if (!a.name) throw new Error(`${label}: missing name`);
    if (!isAddress(a.beneficiary)) throw new Error(`${label}: invalid beneficiary address`);
    if (/^0x0{40}$/i.test(a.beneficiary)) throw new Error(`${label}: beneficiary cannot be the zero address`);

    const bps = percentToBps(a.percent, `${label}.percent`);
    const tgeBps = percentToBps(a.tgeUnlockPercent ?? 0, `${label}.tgeUnlockPercent`);
    if (tgeBps > BPS_DENOMINATOR) throw new Error(`${label}: tgeUnlockPercent cannot exceed 100`);

    const cliffMonths = requireNonNegativeInt(a.cliffMonths ?? 0, `${label}.cliffMonths`);
    const vestingMonths = requireNonNegativeInt(a.vestingMonths ?? 0, `${label}.vestingMonths`);

    const bucketAmount = (totalSupply * bps) / BPS_DENOMINATOR;
    let tgeAmount = (bucketAmount * tgeBps) / BPS_DENOMINATOR;
    let vestedAmount = bucketAmount - tgeAmount;

    // No cliff and no vesting: the whole bucket is liquid at TGE (same as the
    // Python model, where vesting_months == 0 unlocks the remainder at month cliff_months).
    if (cliffMonths === 0n && vestingMonths === 0n) {
      tgeAmount = bucketAmount;
      vestedAmount = 0n;
    }

    totalBps += bps;
    assigned += bucketAmount;

    const cliffSeconds = cliffMonths * SECONDS_PER_MONTH;
    const durationSeconds = vestingMonths * SECONDS_PER_MONTH;

    plan.push({
      name: a.name,
      key: a.key,
      beneficiary: a.beneficiary,
      percentBps: bps,
      bucketAmount,
      tgeAmount,
      vestedAmount,
      needsWallet: vestedAmount > 0n,
      cliffMonths: Number(cliffMonths),
      vestingMonths: Number(vestingMonths),
      cliffSeconds,
      durationSeconds,
      // VestingWallet parameters: linear vesting starts when the cliff ends.
      start: tgeTimestamp + cliffSeconds,
      end: tgeTimestamp + cliffSeconds + durationSeconds,
    });
  }

  if (totalBps !== BPS_DENOMINATOR) {
    throw new Error(`Allocation percents must sum to exactly 100, got ${Number(totalBps) / 100}`);
  }
  if (assigned > totalSupply) {
    throw new Error("Internal error: assigned amount exceeds total supply");
  }

  // Rounding dust (from integer division) stays with the sender; report it.
  return { plan, dust: totalSupply - assigned };
}

module.exports = { buildAllocationPlan, percentToBps, SECONDS_PER_MONTH, BPS_DENOMINATOR };

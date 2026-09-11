// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {VestingWallet} from "@openzeppelin/contracts/finance/VestingWallet.sol";

/**
 * @title NewCoinVestingWallet
 * @notice Deployable instance of OpenZeppelin's audited `VestingWallet`.
 *
 * @dev This contract intentionally contains NO custom vesting logic. It only
 * exists so the project has its own compiled artifact (name, NatSpec, verified
 * source on BscScan). All behaviour (linear vesting, `release`, `vestedAmount`,
 * ...) is inherited unchanged from OpenZeppelin Contracts.
 *
 * Schedule semantics (inherited from OpenZeppelin):
 *  - Nothing is releasable before `startTimestamp`.
 *  - From `startTimestamp` the allocation vests linearly until
 *    `startTimestamp + durationSeconds`, after which everything is releasable.
 *  - `durationSeconds == 0` means the whole allocation unlocks at `startTimestamp`.
 *
 * A cliff is expressed by the deployer as `startTimestamp = TGE + cliff`, so
 * nothing vests during the cliff and the linear period begins right after it
 * (matching `tokenomics/unlock_schedule.py`).
 *
 * Tokens (or native coin) transferred to this wallet vest for `beneficiary`,
 * who is also the `owner()` of the wallet (OpenZeppelin design). Anyone may call
 * `release(token)`; funds always go to the beneficiary.
 */
contract NewCoinVestingWallet is VestingWallet {
    /**
     * @param beneficiary     Recipient of the vested tokens (and owner of this wallet).
     * @param startTimestamp  Unix time at which linear vesting starts (TGE + cliff).
     * @param durationSeconds Length of the linear vesting period, measured from `startTimestamp`.
     */
    constructor(
        address beneficiary,
        uint64 startTimestamp,
        uint64 durationSeconds
    ) VestingWallet(beneficiary, startTimestamp, durationSeconds) {}
}

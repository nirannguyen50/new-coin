// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/**
 * @title LiXi (LIXI)
 * @notice Fixed-supply BEP-20 reward and tip ("li xi") token for Vietnamese online
 *         communities on BNB Chain; the first product built on it is a Telegram tip bot.
 *
 * @dev Security guarantees, by construction (not by policy):
 *
 *  - Fixed supply. Exactly 1,000,000,000 LIXI (18 decimals) is minted once, in
 *    the constructor, to the treasury address. There is no `mint` function and
 *    `_mint` is never reachable after deployment, so total supply can only go
 *    down (via burns).
 *  - No owner, no admin, no roles. The contract does not inherit Ownable or
 *    AccessControl and holds no privileged address. There is nothing to
 *    renounce because nothing was ever granted.
 *  - No pause, no blacklist, no whitelist, no transfer limits. Transfers use
 *    the unmodified OpenZeppelin ERC20 implementation.
 *  - No transfer tax or fee-on-transfer. `amount` sent always equals `amount`
 *    received.
 *  - Not upgradeable. Deployed as a plain contract, no proxy.
 *
 *  Optional features that remain available to every holder:
 *  - ERC20Burnable: holders may burn their own tokens (or tokens approved to
 *    them) to reduce supply.
 *  - ERC20Permit (EIP-2612): gasless approvals via signed messages.
 *
 *  Vesting and treasury control are handled outside this contract (OpenZeppelin
 *  VestingWallet instances and a multisig treasury), keeping the token itself
 *  minimal and immutable.
 */
contract LiXi is ERC20, ERC20Burnable, ERC20Permit {
    /// @notice Total supply in whole tokens (before applying `decimals()`).
    uint256 public constant TOTAL_SUPPLY_WHOLE = 1_000_000_000;

    /// @dev Thrown when the treasury address passed at deployment is the zero address.
    error TreasuryIsZeroAddress();

    /**
     * @param treasury Address that receives the entire fixed supply at deployment.
     *                 Intended to be a multisig (e.g. Safe), never an EOA in production.
     */
    constructor(address treasury) ERC20("LiXi", "LIXI") ERC20Permit("LiXi") {
        if (treasury == address(0)) revert TreasuryIsZeroAddress();
        _mint(treasury, TOTAL_SUPPLY_WHOLE * 10 ** decimals());
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {MockFactory} from "./MockFactory.sol";
import {MockPair} from "./MockPair.sol";

// TEST-ONLY. Minimal stand-in for the PancakeSwap V2 router so that
// scripts/add-liquidity.js can be exercised end to end on the in-process
// Hardhat network. It mimics the parts of addLiquidityETH that matter for the
// script: deadline / min-amount checks, pulling the token via transferFrom
// (so the approval path is exercised), minting LP tokens to `to` and
// recording the call. Never deploy to a public network.
contract MockRouter {
    struct Call {
        address caller;
        address token;
        uint256 amountTokenDesired;
        uint256 amountTokenMin;
        uint256 amountETHMin;
        address to;
        uint256 deadline;
        uint256 value;
        uint256 liquidity;
    }

    uint256 public constant MINIMUM_LIQUIDITY = 1000;

    address public immutable factory;
    // solhint-disable-next-line var-name-mixedcase
    address public immutable WETH;
    Call public lastCall;
    uint256 public callCount;

    error Expired();
    error InvalidMinAmounts();
    error PairNotSet();

    constructor(address factory_, address weth_) {
        factory = factory_;
        WETH = weth_;
    }

    function addLiquidityETH(
        address token,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    ) external payable returns (uint256 amountToken, uint256 amountETH, uint256 liquidity) {
        if (deadline < block.timestamp) revert Expired();
        if (amountTokenMin > amountTokenDesired || amountETHMin > msg.value) revert InvalidMinAmounts();

        address pair = MockFactory(factory).getPair(token, WETH);
        if (pair == address(0)) revert PairNotSet();

        amountToken = amountTokenDesired;
        amountETH = msg.value;
        // Same first-mint formula as the real pair (MINIMUM_LIQUIDITY is burned).
        liquidity = Math.sqrt(amountToken * amountETH) - MINIMUM_LIQUIDITY;

        // Real router: TransferHelper.safeTransferFrom(token, msg.sender, pair, amountToken)
        require(IERC20(token).transferFrom(msg.sender, pair, amountToken), "MockRouter: TRANSFER_FROM_FAILED");
        MockPair(pair).setReserves(token, amountToken, amountETH);
        MockPair(pair).mint(to, liquidity);

        lastCall = Call({
            caller: msg.sender,
            token: token,
            amountTokenDesired: amountTokenDesired,
            amountTokenMin: amountTokenMin,
            amountETHMin: amountETHMin,
            to: to,
            deadline: deadline,
            value: msg.value,
            liquidity: liquidity
        });
        callCount += 1;
    }
}

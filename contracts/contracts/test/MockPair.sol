// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// TEST-ONLY. Minimal stand-in for a PancakeSwap V2 pair / LP token. The LP
// token is a plain ERC-20 that only MockRouter can mint. token0/token1 are
// sorted like the real factory does. Never deploy to a public network.
contract MockPair is ERC20 {
    address public immutable router;
    address public immutable token0;
    address public immutable token1;
    uint112 private reserve0;
    uint112 private reserve1;
    uint32 private blockTimestampLast;

    error NotRouter();

    constructor(address router_, address tokenA, address tokenB) ERC20("Pancake LPs", "Cake-LP") {
        router = router_;
        (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
    }

    modifier onlyRouter() {
        if (msg.sender != router) revert NotRouter();
        _;
    }

    function mint(address to, uint256 amount) external onlyRouter {
        _mint(to, amount);
    }

    function setReserves(address token, uint256 amountToken, uint256 amountOther) external onlyRouter {
        if (token == token0) {
            reserve0 = uint112(amountToken);
            reserve1 = uint112(amountOther);
        } else {
            reserve0 = uint112(amountOther);
            reserve1 = uint112(amountToken);
        }
        blockTimestampLast = uint32(block.timestamp);
    }

    function getReserves() external view returns (uint112, uint112, uint32) {
        return (reserve0, reserve1, blockTimestampLast);
    }
}

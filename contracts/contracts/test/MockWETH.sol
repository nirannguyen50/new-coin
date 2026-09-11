// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

// TEST-ONLY. Stand-in for WBNB used by test/AddLiquidity.test.js. It is never
// deployed to a public network; it only needs an address that MockRouter.WETH()
// can return and MockFactory can pair with the token.
contract MockWETH {
    string public constant name = "Mock Wrapped BNB";
    string public constant symbol = "WBNB";
    uint8 public constant decimals = 18;
}

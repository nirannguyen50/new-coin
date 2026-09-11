// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

// TEST-ONLY. Minimal stand-in for the PancakeSwap V2 factory: getPair() always
// returns one fixed pair address set by the test. Never deploy to a public
// network.
contract MockFactory {
    address public pair;

    function setPair(address pair_) external {
        pair = pair_;
    }

    function getPair(address, address) external view returns (address) {
        return pair;
    }
}

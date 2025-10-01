// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/release-v5.0/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/release-v5.0/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/release-v5.0/contracts/token/ERC20/utils/SafeERC20.sol";
import {ECDSA} from "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/release-v5.0/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/release-v5.0/contracts/utils/cryptography/MessageHashUtils.sol";
import {Ownable} from "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/release-v5.0/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/release-v5.0/contracts/utils/ReentrancyGuard.sol";

contract SmartFX is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant RATE_SCALE = 1e8;
    address public eigenSigner;
    uint256 public maxQuoteAge = 5 minutes;
    mapping(bytes32 => bool) public usedQuotes;

    event Swapped(address indexed sender,address indexed recipient,address indexed fromToken,address toToken,uint256 amountIn,uint256 amountOut,uint256 rate,uint256 timestamp);
    event SignerUpdated(address signer);
    event MaxQuoteAgeUpdated(uint256 seconds_);
    event Rescue(address token, uint256 amount, address to);

    constructor(address _eigenSigner, address _owner) Ownable(_owner) {
        require(_eigenSigner != address(0), "bad signer");
        eigenSigner = _eigenSigner;
    }

    function setEigenSigner(address _signer) external onlyOwner {
        require(_signer != address(0), "bad signer");
        eigenSigner = _signer;
        emit SignerUpdated(_signer);
    }

    function setMaxQuoteAge(uint256 seconds_) external onlyOwner {
        require(seconds_ >= 30 && seconds_ <= 1 hours, "unreasonable age");
        maxQuoteAge = seconds_;
        emit MaxQuoteAgeUpdated(seconds_);
    }

    function quoteHash(address fromToken,address toToken,uint256 rate,uint256 timestamp) public view returns (bytes32) {
        return keccak256(abi.encode(
            keccak256("CELOFX_RATE_V1"),
            block.chainid,
            address(this),
            fromToken,
            toToken,
            rate,
            timestamp
        ));
    }

    function _quoteAmountOut(address fromToken,address toToken,uint256 amountIn,uint256 rate) internal view returns (uint256) {
        uint8 fd = IERC20Metadata(fromToken).decimals();
        uint8 td = IERC20Metadata(toToken).decimals();
        uint256 in18 = amountIn;
        if (fd < 18) in18 = amountIn * (10 ** (18 - fd));
        else if (fd > 18) in18 = amountIn / (10 ** (fd - 18));
        uint256 out18 = (in18 * rate) / RATE_SCALE;
        if (td < 18) return out18 / (10 ** (18 - td));
        if (td > 18) return out18 * (10 ** (td - 18));
        return out18;
    }

    function swapWithProof(
        address fromToken,
        address toToken,
        uint256 amountIn,
        uint256 minAmountOut,
        uint256 rate,
        uint256 timestamp,
        bytes calldata signature,
        address recipient
    ) external nonReentrant {
        require(amountIn > 0, "amountIn=0");
        require(recipient != address(0), "bad recipient");
        require(block.timestamp >= timestamp, "future ts");
        require(block.timestamp - timestamp <= maxQuoteAge, "stale quote");

        bytes32 qh = quoteHash(fromToken, toToken, rate, timestamp);
        require(!usedQuotes[qh], "quote used");

        bytes32 digest = MessageHashUtils.toEthSignedMessageHash(qh);
        address recovered = ECDSA.recover(digest, signature);
        require(recovered == eigenSigner, "bad sig");

        IERC20(fromToken).safeTransferFrom(msg.sender, address(this), amountIn);

        uint256 amountOut = _quoteAmountOut(fromToken, toToken, amountIn, rate);
        require(amountOut >= minAmountOut, "slippage");
        require(IERC20(toToken).balanceOf(address(this)) >= amountOut, "insufficient liquidity");
        IERC20(toToken).safeTransfer(recipient, amountOut);

        usedQuotes[qh] = true;
        emit Swapped(msg.sender, recipient, fromToken, toToken, amountIn, amountOut, rate, timestamp);
    }

    function rescue(address token, uint256 amount, address to) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
        emit Rescue(token, amount, to);
    }
}
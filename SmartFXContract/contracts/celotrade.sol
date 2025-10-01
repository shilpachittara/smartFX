// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/release-v5.0/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/release-v5.0/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/release-v5.0/contracts/token/ERC20/utils/SafeERC20.sol";
import {ECDSA} from "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/release-v5.0/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/release-v5.0/contracts/utils/cryptography/MessageHashUtils.sol";
import {Ownable} from "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/release-v5.0/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/release-v5.0/contracts/utils/ReentrancyGuard.sol";

/// @title CeloFX — Proof-verified stablecoin FX swaps (vault-settled)
/// @notice Swaps fromToken -> toToken using an EigenCloud-signed FX rate proof.
contract SmartFX is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @dev fixed-point rate scale: 1e8 = 8 decimals (e.g., 5.12345678)
    uint256 public constant RATE_SCALE = 1e8;

    /// @notice EOA or contract address whose signatures we accept as rate proofs
    address public eigenSigner;

    /// @notice Maximum allowed age for a quote (in seconds)
    uint256 public maxQuoteAge = 5 minutes;

    /// @notice prevent replay: quoteHash => used?
    mapping(bytes32 => bool) public usedQuotes;

    event Swapped(
        address indexed sender,
        address indexed recipient,
        address indexed fromToken,
        address toToken,
        uint256 amountIn,
        uint256 amountOut,
        uint256 rate,
        uint256 timestamp
    );
    event SignerUpdated(address signer);
    event MaxQuoteAgeUpdated(uint256 seconds_);
    event Rescue(address token, uint256 amount, address to);

    /// @param _eigenSigner Authorized signer of FX quotes (EOA or contract)
    /// @param _owner Initial owner (passed to Ownable constructor in OZ v5)
    constructor(address _eigenSigner, address _owner) Ownable(_owner) {
        require(_eigenSigner != address(0), "bad signer");
        eigenSigner = _eigenSigner;
        // No _transferOwnership here; handled by Ownable(_owner)
    }

    /// @notice Admin: update authorized rate signer
    function setEigenSigner(address _signer) external onlyOwner {
        require(_signer != address(0), "bad signer");
        eigenSigner = _signer;
        emit SignerUpdated(_signer);
    }

    /// @notice Admin: update max quote age
    function setMaxQuoteAge(uint256 seconds_) external onlyOwner {
        require(seconds_ >= 30 && seconds_ <= 1 hours, "unreasonable age");
        maxQuoteAge = seconds_;
        emit MaxQuoteAgeUpdated(seconds_);
    }

    /// @notice Deterministic hash covering the quote fields (domain-separated)
    function quoteHash(
        address fromToken,
        address toToken,
        uint256 rate,
        uint256 timestamp
    ) public view returns (bytes32) {
        return keccak256(
            abi.encode(
                keccak256("CELOFX_RATE_V1"),
                block.chainid,
                address(this),
                fromToken,
                toToken,
                rate,
                timestamp
            )
        );
    }

    /// @notice Compute expected amountOut given decimals & fixed-point rate
    function _quoteAmountOut(
        address fromToken,
        address toToken,
        uint256 amountIn,
        uint256 rate
    ) internal view returns (uint256) {
        uint8 fromDec = IERC20Metadata(fromToken).decimals();
        uint8 toDec = IERC20Metadata(toToken).decimals();

        uint256 in18 = amountIn;
        if (fromDec < 18) in18 = amountIn * (10 ** (18 - fromDec));
        else if (fromDec > 18) in18 = amountIn / (10 ** (fromDec - 18));

        uint256 out18 = (in18 * rate) / RATE_SCALE;

        if (toDec < 18) return out18 / (10 ** (18 - toDec));
        if (toDec > 18) return out18 * (10 ** (toDec - 18));
        return out18;
    }

    /// @param rate Fixed-point (1e8) toToken per 1 fromToken
    /// @param timestamp Unix seconds when rate was produced off-chain
    /// @param signature EIP-191 eth_sign signature from eigenSigner
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

        // OZ v5: MessageHashUtils handles the EIP-191 prefixing helper
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

    /// @notice Owner can withdraw tokens from the vault (top-up / rebalancing)
    function rescue(address token, uint256 amount, address to) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
        emit Rescue(token, amount, to);
    }
}
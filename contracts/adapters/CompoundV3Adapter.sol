// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../interfaces/IYieldProtocol.sol";

/**
 * @title CompoundV3Adapter
 * @notice Adapter contract for interacting with Compound V3 (Comet) protocol
 * @dev Implements IYieldProtocol interface for standardized yield operations
 */
contract CompoundV3Adapter is IYieldProtocol, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Compound V3 Comet contract
    ICompoundV3 public immutable comet;
    
    // Base token (e.g., USDC)
    address public immutable baseToken;
    
    // Chain ID
    uint256 public immutable override chainId;

    // User balances tracking
    mapping(address => uint256) public userShares;
    uint256 public totalShares;

    // Events
    event Deposited(address indexed user, uint256 amount, uint256 shares);
    event Withdrawn(address indexed user, uint256 shares, uint256 amount);

    // Seconds per year for APY calculation
    uint256 private constant SECONDS_PER_YEAR = 31536000;

    constructor(
        address _comet,
        uint256 _chainId
    ) Ownable(msg.sender) {
        require(_comet != address(0), "Invalid Comet address");
        comet = ICompoundV3(_comet);
        baseToken = comet.baseToken();
        chainId = _chainId;
        
        // Approve Comet to spend base token (use forceApprove for compatibility with USDT-like tokens)
        IERC20(baseToken).forceApprove(_comet, type(uint256).max);
    }

    /**
     * @notice Get the current APY for the base asset
     * @param asset The address of the asset (must be base token)
     * @return APY in basis points (1% = 100)
     */
    function getCurrentAPY(address asset) external view override returns (uint256) {
        require(asset == baseToken, "Only base token supported");
        
        uint256 utilization = comet.getUtilization();
        uint64 supplyRate = comet.getSupplyRate(utilization);
        
        // Compound V3 returns rate per second with 18 decimals
        // APY = (1 + ratePerSecond)^secondsPerYear - 1
        // Simplified: ratePerSecond * secondsPerYear * 10000 / 1e18
        uint256 apy = uint256(supplyRate) * SECONDS_PER_YEAR * 10000 / 1e18;
        
        return apy;
    }

    /**
     * @notice Deposit base token into Compound V3
     * @param asset The asset to deposit (must be base token)
     * @param amount The amount to deposit
     * @return shares The shares assigned to user
     */
    function deposit(address asset, uint256 amount) external override nonReentrant returns (uint256 shares) {
        require(asset == baseToken, "Only base token supported");
        require(amount > 0, "Amount must be greater than 0");
        
        // Transfer tokens from user
        IERC20(baseToken).safeTransferFrom(msg.sender, address(this), amount);
        
        // Calculate shares
        uint256 totalBalance = comet.balanceOf(address(this));
        if (totalShares == 0) {
            shares = amount;
        } else if (totalBalance == 0) {
            // Edge case: shares exist but balance is 0 (shouldn't happen normally)
            // Reset shares to avoid division by zero
            shares = amount;
        } else {
            shares = (amount * totalShares) / totalBalance;
        }
        
        // Supply to Compound
        comet.supply(baseToken, amount);
        
        // Update user shares
        userShares[msg.sender] += shares;
        totalShares += shares;
        
        emit Deposited(msg.sender, amount, shares);
    }

    /**
     * @notice Withdraw base token from Compound V3
     * @param asset The asset to withdraw (must be base token)
     * @param shares The amount of shares to redeem
     * @return amount The amount of assets received
     */
    function withdraw(address asset, uint256 shares) external override nonReentrant returns (uint256 amount) {
        require(asset == baseToken, "Only base token supported");
        require(shares > 0 && shares <= userShares[msg.sender], "Invalid shares");
        
        // Calculate amount to withdraw
        uint256 totalBalance = comet.balanceOf(address(this));
        amount = (shares * totalBalance) / totalShares;
        
        // Update shares
        userShares[msg.sender] -= shares;
        totalShares -= shares;
        
        // Withdraw from Compound
        comet.withdraw(baseToken, amount);
        
        // Transfer to user
        IERC20(baseToken).safeTransfer(msg.sender, amount);
        
        emit Withdrawn(msg.sender, shares, amount);
    }

    /**
     * @notice Get the current balance for an account
     * @param asset The asset address (must be base token)
     * @param account The account to check
     * @return The current balance value
     */
    function getBalance(address asset, address account) external view override returns (uint256) {
        require(asset == baseToken, "Only base token supported");
        
        if (totalShares == 0) return 0;
        
        uint256 totalBalance = comet.balanceOf(address(this));
        return (userShares[account] * totalBalance) / totalShares;
    }

    /**
     * @notice Get user's share balance
     * @param account The account to check
     * @return The number of shares
     */
    function getShares(address account) external view returns (uint256) {
        return userShares[account];
    }

    /**
     * @notice Get the protocol name
     * @return "Compound V3"
     */
    function protocolName() external pure override returns (string memory) {
        return "Compound V3";
    }

    /**
     * @notice Get the base token address
     * @return The base token address
     */
    function getBaseToken() external view returns (address) {
        return baseToken;
    }

    /**
     * @notice Emergency withdraw function
     * @param token The token to withdraw
     * @param to The recipient address
     */
    function emergencyWithdraw(address token, address to) external onlyOwner {
        address tokenToWithdraw = token;
        
        if (token == address(comet)) {
            // Withdraw everything from Compound first
            uint256 cometBalance = comet.balanceOf(address(this));
            if (cometBalance > 0) {
                comet.withdraw(baseToken, cometBalance);
            }
            tokenToWithdraw = baseToken;
        }
        
        uint256 tokenBalance = IERC20(tokenToWithdraw).balanceOf(address(this));
        if (tokenBalance > 0) {
            IERC20(tokenToWithdraw).safeTransfer(to, tokenBalance);
        }
    }
}

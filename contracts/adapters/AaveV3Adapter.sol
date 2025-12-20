// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../interfaces/IYieldProtocol.sol";

/**
 * @title AaveV3Adapter
 * @notice Adapter contract for interacting with Aave V3 protocol
 * @dev Implements IYieldProtocol interface for standardized yield operations
 */
contract AaveV3Adapter is IYieldProtocol, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Aave V3 Pool address
    IAaveV3Pool public immutable aavePool;
    
    // Chain ID
    uint256 public immutable override chainId;
    
    // Mapping of asset to aToken
    mapping(address => address) public aTokens;
    
    // Supported assets
    mapping(address => bool) public supportedAssets;

    // Events
    event Deposited(address indexed asset, address indexed user, uint256 amount, uint256 aTokenAmount);
    event Withdrawn(address indexed asset, address indexed user, uint256 shares, uint256 amount);
    event AssetAdded(address indexed asset, address indexed aToken);
    event AssetRemoved(address indexed asset);

    constructor(
        address _aavePool,
        uint256 _chainId
    ) Ownable(msg.sender) {
        require(_aavePool != address(0), "Invalid Aave pool");
        aavePool = IAaveV3Pool(_aavePool);
        chainId = _chainId;
    }

    /**
     * @notice Add a supported asset with its corresponding aToken
     * @param asset The underlying asset address
     * @param aToken The corresponding aToken address
     */
    function addSupportedAsset(address asset, address aToken) external onlyOwner {
        require(asset != address(0) && aToken != address(0), "Invalid addresses");
        require(!supportedAssets[asset], "Asset already supported");
        
        supportedAssets[asset] = true;
        aTokens[asset] = aToken;
        
        // Approve Aave pool to spend assets (use forceApprove for compatibility with USDT-like tokens)
        IERC20(asset).forceApprove(address(aavePool), type(uint256).max);
        
        emit AssetAdded(asset, aToken);
    }

    /**
     * @notice Remove a supported asset
     * @param asset The asset to remove
     */
    function removeSupportedAsset(address asset) external onlyOwner {
        require(supportedAssets[asset], "Asset not supported");
        
        supportedAssets[asset] = false;
        IERC20(asset).approve(address(aavePool), 0);
        
        emit AssetRemoved(asset);
    }

    /**
     * @notice Get the current APY for a specific asset
     * @param asset The address of the asset
     * @return APY in basis points (1% = 100)
     */
    function getCurrentAPY(address asset) external view override returns (uint256) {
        require(supportedAssets[asset], "Asset not supported");
        
        // Aave V3 getReserveData returns a struct, we only need currentLiquidityRate
        // which is at index 2 (after configuration and liquidityIndex)
        (uint256 configuration, uint128 liquidityIndex, uint128 currentLiquidityRate, , , , , , , , , , , , ) = aavePool.getReserveData(asset);
        
        // Silence unused variable warnings
        configuration;
        liquidityIndex;
        
        // Aave returns rate in RAY (27 decimals), convert to basis points
        // APY = (1 + rate/secondsPerYear)^secondsPerYear - 1
        // Simplified: rate / 1e27 * 10000 for basis points
        return uint256(currentLiquidityRate) / 1e23;
    }

    /**
     * @notice Deposit assets into Aave
     * @param asset The asset to deposit
     * @param amount The amount to deposit
     * @return shares The aToken amount received
     */
    function deposit(address asset, uint256 amount) external override nonReentrant returns (uint256 shares) {
        require(supportedAssets[asset], "Asset not supported");
        require(amount > 0, "Amount must be greater than 0");
        
        // Get aToken balance before
        address aToken = aTokens[asset];
        uint256 aTokenBefore = IERC20(aToken).balanceOf(address(this));
        
        // Transfer asset from user
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        
        // Supply to Aave
        aavePool.supply(asset, amount, address(this), 0);
        
        // Calculate shares received
        shares = IERC20(aToken).balanceOf(address(this)) - aTokenBefore;
        
        emit Deposited(asset, msg.sender, amount, shares);
    }

    /**
     * @notice Withdraw assets from Aave
     * @param asset The asset to withdraw
     * @param shares The amount of aTokens to redeem
     * @return amount The amount of assets received
     */
    function withdraw(address asset, uint256 shares) external override nonReentrant returns (uint256 amount) {
        require(supportedAssets[asset], "Asset not supported");
        require(shares > 0, "Shares must be greater than 0");
        
        // Get asset balance before
        uint256 assetBefore = IERC20(asset).balanceOf(address(this));
        
        // Withdraw from Aave
        amount = aavePool.withdraw(asset, shares, address(this));
        
        // Calculate actual amount received
        uint256 actualAmount = IERC20(asset).balanceOf(address(this)) - assetBefore;
        
        // Transfer to user
        IERC20(asset).safeTransfer(msg.sender, actualAmount);
        
        emit Withdrawn(asset, msg.sender, shares, actualAmount);
        
        return actualAmount;
    }

    /**
     * @notice Get the current balance in Aave
     * @param asset The asset address
     * @param account The account to check (ignored, uses contract balance)
     * @return The current aToken balance
     */
    function getBalance(address asset, address account) external view override returns (uint256) {
        require(supportedAssets[asset], "Asset not supported");
        // For simplicity, return contract's aToken balance
        // In production, track per-user balances
        return IERC20(aTokens[asset]).balanceOf(account == address(0) ? address(this) : account);
    }

    /**
     * @notice Get the protocol name
     * @return "Aave V3"
     */
    function protocolName() external pure override returns (string memory) {
        return "Aave V3";
    }

    /**
     * @notice Emergency withdraw function
     * @param token The token to withdraw
     * @param to The recipient address
     */
    function emergencyWithdraw(address token, address to) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).safeTransfer(to, balance);
        }
    }
}

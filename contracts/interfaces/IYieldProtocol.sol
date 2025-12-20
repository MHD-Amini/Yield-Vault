// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IYieldProtocol
 * @notice Interface for interacting with yield-generating protocols (Aave, Compound, etc.)
 */
interface IYieldProtocol {
    /// @notice Get the current APY for a specific asset
    /// @param asset The address of the asset
    /// @return The current APY in basis points (1% = 100)
    function getCurrentAPY(address asset) external view returns (uint256);

    /// @notice Deposit assets into the protocol
    /// @param asset The address of the asset to deposit
    /// @param amount The amount to deposit
    /// @return shares The amount of shares/tokens received
    function deposit(address asset, uint256 amount) external returns (uint256 shares);

    /// @notice Withdraw assets from the protocol
    /// @param asset The address of the asset to withdraw
    /// @param shares The amount of shares to redeem
    /// @return amount The amount of assets received
    function withdraw(address asset, uint256 shares) external returns (uint256 amount);

    /// @notice Get the current balance in the protocol
    /// @param asset The address of the asset
    /// @param account The address to check
    /// @return The current balance
    function getBalance(address asset, address account) external view returns (uint256);

    /// @notice Get the protocol name
    /// @return The name of the protocol
    function protocolName() external view returns (string memory);

    /// @notice Get the chain ID this adapter is deployed on
    /// @return The chain ID
    function chainId() external view returns (uint256);
}

/**
 * @title IAaveV3Pool
 * @notice Interface for Aave V3 Pool
 */
interface IAaveV3Pool {
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
    function withdraw(address asset, uint256 amount, address to) external returns (uint256);
    function getReserveData(address asset) external view returns (
        uint256 configuration,
        uint128 liquidityIndex,
        uint128 currentLiquidityRate,
        uint128 variableBorrowIndex,
        uint128 currentVariableBorrowRate,
        uint128 currentStableBorrowRate,
        uint40 lastUpdateTimestamp,
        uint16 id,
        address aTokenAddress,
        address stableDebtTokenAddress,
        address variableDebtTokenAddress,
        address interestRateStrategyAddress,
        uint128 accruedToTreasury,
        uint128 unbacked,
        uint128 isolationModeTotalDebt
    );
}

/**
 * @title ICompoundV3
 * @notice Interface for Compound V3 (Comet)
 */
interface ICompoundV3 {
    function supply(address asset, uint256 amount) external;
    function withdraw(address asset, uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
    function getSupplyRate(uint256 utilization) external view returns (uint64);
    function getUtilization() external view returns (uint256);
    function baseToken() external view returns (address);
}

// Use OpenZeppelin's IERC20 instead of defining our own

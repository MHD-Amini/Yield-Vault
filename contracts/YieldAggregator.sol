// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./interfaces/IYieldProtocol.sol";

/**
 * @title YieldAggregator
 * @notice Main contract for aggregating yields across multiple DeFi protocols
 * @dev Manages deposits, withdrawals, and automatic yield optimization
 */
contract YieldAggregator is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ============ Structs ============

    struct ProtocolInfo {
        address adapter;
        string name;
        bool active;
        uint256 totalDeposited;
        uint256 currentAPY;
        uint256 lastUpdate;
    }

    struct UserPosition {
        uint256 deposited;
        uint256 shares;
        address currentProtocol;
        uint256 depositTimestamp;
    }

    struct YieldStrategy {
        address asset;
        address[] protocols;
        uint256 minRebalanceAmount;
        uint256 rebalanceThreshold; // In basis points
        bool autoRebalance;
    }

    // ============ State Variables ============

    // Protocol registry: protocolId => ProtocolInfo
    mapping(bytes32 => ProtocolInfo) public protocols;
    bytes32[] public protocolIds;

    // User positions: user => asset => UserPosition
    mapping(address => mapping(address => UserPosition)) public userPositions;

    // Supported assets
    mapping(address => bool) public supportedAssets;
    address[] public assetList;

    // Yield strategies: asset => YieldStrategy
    mapping(address => YieldStrategy) public strategies;

    // Cross-chain bridge contract
    address public crossChainBridge;

    // Fee configuration
    uint256 public performanceFee = 1000; // 10% in basis points
    uint256 public managementFee = 50; // 0.5% annual in basis points
    address public feeRecipient;

    // Constants
    uint256 public constant MAX_FEE = 2000; // 20%
    uint256 public constant BASIS_POINTS = 10000;

    // ============ Events ============

    event ProtocolAdded(bytes32 indexed protocolId, address adapter, string name);
    event ProtocolRemoved(bytes32 indexed protocolId);
    event ProtocolUpdated(bytes32 indexed protocolId, uint256 newAPY);
    
    event Deposited(address indexed user, address indexed asset, uint256 amount, bytes32 protocolId);
    event Withdrawn(address indexed user, address indexed asset, uint256 amount, uint256 yield);
    event Rebalanced(address indexed asset, bytes32 fromProtocol, bytes32 toProtocol, uint256 amount);
    
    event StrategyUpdated(address indexed asset, bool autoRebalance, uint256 threshold);
    event CrossChainBridgeUpdated(address newBridge);
    event FeesCollected(address indexed asset, uint256 amount);

    // ============ Constructor ============

    constructor(address _feeRecipient) Ownable(msg.sender) {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        feeRecipient = _feeRecipient;
    }

    // ============ Admin Functions ============

    /**
     * @notice Add a new protocol adapter
     * @param adapter The adapter contract address
     */
    function addProtocol(address adapter) external onlyOwner {
        require(adapter != address(0), "Invalid adapter");
        
        string memory name = IYieldProtocol(adapter).protocolName();
        uint256 chainId = IYieldProtocol(adapter).chainId();
        
        bytes32 protocolId = keccak256(abi.encodePacked(name, chainId));
        require(protocols[protocolId].adapter == address(0), "Protocol exists");
        
        protocols[protocolId] = ProtocolInfo({
            adapter: adapter,
            name: name,
            active: true,
            totalDeposited: 0,
            currentAPY: 0,
            lastUpdate: block.timestamp
        });
        
        protocolIds.push(protocolId);
        
        emit ProtocolAdded(protocolId, adapter, name);
    }

    /**
     * @notice Remove a protocol
     * @param protocolId The protocol identifier
     */
    function removeProtocol(bytes32 protocolId) external onlyOwner {
        require(protocols[protocolId].adapter != address(0), "Protocol not found");
        require(protocols[protocolId].totalDeposited == 0, "Protocol has deposits");
        
        protocols[protocolId].active = false;
        
        emit ProtocolRemoved(protocolId);
    }

    /**
     * @notice Add a supported asset
     * @param asset The asset address
     */
    function addSupportedAsset(address asset) external onlyOwner {
        require(asset != address(0), "Invalid asset");
        require(!supportedAssets[asset], "Asset already supported");
        
        supportedAssets[asset] = true;
        assetList.push(asset);
        
        // Initialize strategy with defaults
        strategies[asset] = YieldStrategy({
            asset: asset,
            protocols: new address[](0),
            minRebalanceAmount: 100 * 10**6, // 100 USDC/USDT
            rebalanceThreshold: 50, // 0.5%
            autoRebalance: true
        });
    }

    /**
     * @notice Set the cross-chain bridge contract
     * @param bridge The bridge contract address
     */
    function setCrossChainBridge(address bridge) external onlyOwner {
        crossChainBridge = bridge;
        emit CrossChainBridgeUpdated(bridge);
    }

    /**
     * @notice Update fee configuration
     * @param _performanceFee New performance fee in basis points
     * @param _managementFee New management fee in basis points
     */
    function setFees(uint256 _performanceFee, uint256 _managementFee) external onlyOwner {
        require(_performanceFee <= MAX_FEE, "Performance fee too high");
        require(_managementFee <= MAX_FEE, "Management fee too high");
        
        performanceFee = _performanceFee;
        managementFee = _managementFee;
    }

    /**
     * @notice Update fee recipient
     * @param _feeRecipient New fee recipient address
     */
    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        feeRecipient = _feeRecipient;
    }

    /**
     * @notice Update strategy for an asset
     * @param asset The asset address
     * @param autoRebalance Whether to auto-rebalance
     * @param threshold Rebalance threshold in basis points
     */
    function updateStrategy(
        address asset,
        bool autoRebalance,
        uint256 threshold
    ) external onlyOwner {
        require(supportedAssets[asset], "Asset not supported");
        
        strategies[asset].autoRebalance = autoRebalance;
        strategies[asset].rebalanceThreshold = threshold;
        
        emit StrategyUpdated(asset, autoRebalance, threshold);
    }

    // ============ User Functions ============

    /**
     * @notice Deposit assets into the best yielding protocol
     * @param asset The asset to deposit
     * @param amount The amount to deposit
     */
    function deposit(address asset, uint256 amount) external nonReentrant whenNotPaused {
        require(supportedAssets[asset], "Asset not supported");
        require(amount > 0, "Amount must be greater than 0");
        
        // Transfer assets from user
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        
        // Find best protocol
        (bytes32 bestProtocol, ) = findBestProtocol(asset);
        require(bestProtocol != bytes32(0), "No protocol available");
        
        // Deposit to protocol
        address adapter = protocols[bestProtocol].adapter;
        // Reset approval first for tokens like USDT that require it
        IERC20(asset).forceApprove(adapter, amount);
        uint256 shares = IYieldProtocol(adapter).deposit(asset, amount);
        
        // Update user position
        UserPosition storage position = userPositions[msg.sender][asset];
        position.deposited += amount;
        position.shares += shares;
        position.currentProtocol = adapter;
        position.depositTimestamp = block.timestamp;
        
        // Update protocol stats
        protocols[bestProtocol].totalDeposited += amount;
        
        emit Deposited(msg.sender, asset, amount, bestProtocol);
    }

    /**
     * @notice Withdraw assets from the protocol
     * @param asset The asset to withdraw
     * @param amount The amount to withdraw (0 for all)
     */
    function withdraw(address asset, uint256 amount) external nonReentrant {
        UserPosition storage position = userPositions[msg.sender][asset];
        require(position.deposited > 0, "No position");
        
        uint256 withdrawAmount = amount == 0 ? position.deposited : amount;
        require(withdrawAmount <= position.deposited, "Insufficient balance");
        
        // Calculate shares to withdraw
        uint256 sharesToWithdraw = (position.shares * withdrawAmount) / position.deposited;
        
        // Find protocol
        bytes32 protocolId = getProtocolId(position.currentProtocol);
        address adapter = position.currentProtocol;
        
        // Withdraw from protocol
        uint256 received = IYieldProtocol(adapter).withdraw(asset, sharesToWithdraw);
        
        // Calculate yield
        uint256 yield = 0;
        if (received > withdrawAmount) {
            yield = received - withdrawAmount;
            
            // Deduct performance fee from yield
            uint256 fee = (yield * performanceFee) / BASIS_POINTS;
            if (fee > 0) {
                IERC20(asset).safeTransfer(feeRecipient, fee);
                received -= fee;
                yield -= fee;
            }
        }
        
        // Update position
        position.deposited -= withdrawAmount;
        position.shares -= sharesToWithdraw;
        
        // Update protocol stats
        protocols[protocolId].totalDeposited -= withdrawAmount;
        
        // Transfer to user
        IERC20(asset).safeTransfer(msg.sender, received);
        
        emit Withdrawn(msg.sender, asset, received, yield);
    }

    /**
     * @notice Rebalance user's position to a better protocol
     * @param asset The asset to rebalance
     */
    function rebalance(address asset) external nonReentrant whenNotPaused {
        UserPosition storage position = userPositions[msg.sender][asset];
        require(position.deposited > 0, "No position");
        
        (bytes32 bestProtocol, uint256 bestAPY) = findBestProtocol(asset);
        bytes32 currentProtocolId = getProtocolId(position.currentProtocol);
        
        require(bestProtocol != currentProtocolId, "Already in best protocol");
        
        uint256 currentAPY = protocols[currentProtocolId].currentAPY;
        uint256 threshold = strategies[asset].rebalanceThreshold;
        
        // Check if rebalance is worth it
        require(
            bestAPY > currentAPY + (currentAPY * threshold / BASIS_POINTS),
            "APY difference too small"
        );
        
        // Withdraw from current protocol
        uint256 received = IYieldProtocol(position.currentProtocol).withdraw(asset, position.shares);
        
        // Deposit to new protocol
        address newAdapter = protocols[bestProtocol].adapter;
        // Reset approval first for tokens like USDT that require it
        IERC20(asset).forceApprove(newAdapter, received);
        uint256 newShares = IYieldProtocol(newAdapter).deposit(asset, received);
        
        // Update position
        position.currentProtocol = newAdapter;
        position.shares = newShares;
        position.deposited = received;
        
        // Update protocol stats
        protocols[currentProtocolId].totalDeposited -= received;
        protocols[bestProtocol].totalDeposited += received;
        
        emit Rebalanced(asset, currentProtocolId, bestProtocol, received);
    }

    // ============ View Functions ============

    /**
     * @notice Find the best yielding protocol for an asset
     * @param asset The asset to check
     * @return bestProtocol The best protocol ID
     * @return bestAPY The best APY
     */
    function findBestProtocol(address asset) public view returns (bytes32 bestProtocol, uint256 bestAPY) {
        for (uint256 i = 0; i < protocolIds.length; i++) {
            bytes32 protocolId = protocolIds[i];
            ProtocolInfo storage protocol = protocols[protocolId];
            
            if (!protocol.active) continue;
            
            try IYieldProtocol(protocol.adapter).getCurrentAPY(asset) returns (uint256 apy) {
                if (apy > bestAPY) {
                    bestAPY = apy;
                    bestProtocol = protocolId;
                }
            } catch {
                continue;
            }
        }
    }

    /**
     * @notice Get all protocol APYs for an asset
     * @param asset The asset to check
     * @return ids Array of protocol IDs
     * @return apys Array of APYs
     * @return names Array of protocol names
     */
    function getAllProtocolAPYs(address asset) external view returns (
        bytes32[] memory ids,
        uint256[] memory apys,
        string[] memory names
    ) {
        uint256 count = protocolIds.length;
        ids = new bytes32[](count);
        apys = new uint256[](count);
        names = new string[](count);
        
        for (uint256 i = 0; i < count; i++) {
            bytes32 protocolId = protocolIds[i];
            ProtocolInfo storage protocol = protocols[protocolId];
            
            ids[i] = protocolId;
            names[i] = protocol.name;
            
            if (protocol.active) {
                try IYieldProtocol(protocol.adapter).getCurrentAPY(asset) returns (uint256 apy) {
                    apys[i] = apy;
                } catch {
                    apys[i] = 0;
                }
            }
        }
    }

    /**
     * @notice Get user's position details
     * @param user The user address
     * @param asset The asset address
     * @return position The user position
     * @return currentValue Current value including yield
     * @return unrealizedYield Unrealized yield
     */
    function getUserPosition(address user, address asset) external view returns (
        UserPosition memory position,
        uint256 currentValue,
        uint256 unrealizedYield
    ) {
        position = userPositions[user][asset];
        
        if (position.deposited > 0 && position.currentProtocol != address(0)) {
            currentValue = IYieldProtocol(position.currentProtocol).getBalance(asset, address(this));
            currentValue = (currentValue * position.shares) / _getTotalShares(position.currentProtocol, asset);
            
            if (currentValue > position.deposited) {
                unrealizedYield = currentValue - position.deposited;
            }
        }
    }

    /**
     * @notice Get protocol ID from adapter address
     * @param adapter The adapter address
     * @return The protocol ID
     */
    function getProtocolId(address adapter) public view returns (bytes32) {
        for (uint256 i = 0; i < protocolIds.length; i++) {
            if (protocols[protocolIds[i]].adapter == adapter) {
                return protocolIds[i];
            }
        }
        return bytes32(0);
    }

    /**
     * @notice Get list of all protocols
     * @return Array of protocol IDs
     */
    function getProtocols() external view returns (bytes32[] memory) {
        return protocolIds;
    }

    /**
     * @notice Get list of all supported assets
     * @return Array of asset addresses
     */
    function getSupportedAssets() external view returns (address[] memory) {
        return assetList;
    }

    // ============ Internal Functions ============

    function _getTotalShares(address adapter, address asset) internal view returns (uint256) {
        // Return adapter's total balance for this contract
        return IYieldProtocol(adapter).getBalance(asset, address(this));
    }

    // ============ Pause Functions ============

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}

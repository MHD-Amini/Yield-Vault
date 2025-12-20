// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../interfaces/ILayerZero.sol";

/**
 * @title CrossChainBridge
 * @notice Handles cross-chain asset transfers and messaging using LayerZero
 * @dev Implements OApp pattern for LayerZero V2
 */
contract CrossChainBridge is Ownable, ReentrancyGuard, ILayerZeroReceiver {
    using SafeERC20 for IERC20;

    // ============ Structs ============

    struct PeerConfig {
        bytes32 peer;
        bool active;
    }

    struct BridgeRequest {
        address sender;
        address asset;
        uint256 amount;
        uint32 dstChainId;
        bytes32 recipient;
        uint256 timestamp;
        bool completed;
    }

    struct CrossChainMessage {
        uint8 messageType; // 1: Transfer, 2: Rebalance, 3: YieldReport
        address asset;
        uint256 amount;
        address sender;
        bytes data;
    }

    // ============ Constants ============

    uint8 public constant MSG_TRANSFER = 1;
    uint8 public constant MSG_REBALANCE = 2;
    uint8 public constant MSG_YIELD_REPORT = 3;

    // ============ State Variables ============

    // LayerZero endpoint
    ILayerZeroEndpoint public immutable endpoint;

    // Yield aggregator contract
    address public yieldAggregator;

    // Peer contracts on other chains: chainId => PeerConfig
    mapping(uint32 => PeerConfig) public peers;

    // Supported tokens for bridging: token => supported
    mapping(address => bool) public supportedTokens;

    // Bridge requests: requestId => BridgeRequest
    mapping(bytes32 => BridgeRequest) public bridgeRequests;
    uint256 public requestNonce;

    // Chain configurations
    mapping(uint32 => uint256) public chainGasLimits;

    // Received message tracking
    mapping(bytes32 => bool) public processedMessages;

    // ============ Events ============

    event PeerSet(uint32 indexed eid, bytes32 peer);
    event TokenSupported(address indexed token, bool supported);
    event BridgeInitiated(
        bytes32 indexed requestId,
        address indexed sender,
        address asset,
        uint256 amount,
        uint32 dstChainId
    );
    event BridgeCompleted(bytes32 indexed requestId, address recipient, uint256 amount);
    event CrossChainMessageReceived(
        uint32 indexed srcChainId,
        bytes32 sender,
        uint8 messageType,
        bytes data
    );
    event RebalanceRequested(
        uint32 indexed dstChainId,
        address asset,
        uint256 amount,
        bytes32 targetProtocol
    );

    // ============ Constructor ============

    constructor(address _endpoint) Ownable(msg.sender) {
        require(_endpoint != address(0), "Invalid endpoint");
        endpoint = ILayerZeroEndpoint(_endpoint);
    }

    // ============ Admin Functions ============

    /**
     * @notice Set the yield aggregator contract
     * @param _aggregator The aggregator address
     */
    function setYieldAggregator(address _aggregator) external onlyOwner {
        require(_aggregator != address(0), "Invalid aggregator");
        yieldAggregator = _aggregator;
    }

    /**
     * @notice Set peer contract on another chain
     * @param _eid The endpoint ID (chain)
     * @param _peer The peer contract address (as bytes32)
     */
    function setPeer(uint32 _eid, bytes32 _peer) external onlyOwner {
        peers[_eid] = PeerConfig({
            peer: _peer,
            active: true
        });
        emit PeerSet(_eid, _peer);
    }

    /**
     * @notice Set supported token for bridging
     * @param token The token address
     * @param supported Whether the token is supported
     */
    function setSupportedToken(address token, bool supported) external onlyOwner {
        supportedTokens[token] = supported;
        emit TokenSupported(token, supported);
    }

    /**
     * @notice Set gas limit for a chain
     * @param chainId The chain ID
     * @param gasLimit The gas limit
     */
    function setChainGasLimit(uint32 chainId, uint256 gasLimit) external onlyOwner {
        chainGasLimits[chainId] = gasLimit;
    }

    // ============ Bridge Functions ============

    /**
     * @notice Initiate a cross-chain token transfer
     * @param asset The token to bridge
     * @param amount The amount to bridge
     * @param dstChainId Destination chain ID
     * @param recipient Recipient address on destination chain
     */
    function bridge(
        address asset,
        uint256 amount,
        uint32 dstChainId,
        bytes32 recipient
    ) external payable nonReentrant {
        require(supportedTokens[asset], "Token not supported");
        require(peers[dstChainId].active, "Destination chain not configured");
        require(amount > 0, "Amount must be greater than 0");

        // Transfer tokens from sender
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);

        // Create bridge request
        bytes32 requestId = keccak256(
            abi.encodePacked(msg.sender, asset, amount, dstChainId, block.timestamp, requestNonce++)
        );

        bridgeRequests[requestId] = BridgeRequest({
            sender: msg.sender,
            asset: asset,
            amount: amount,
            dstChainId: dstChainId,
            recipient: recipient,
            timestamp: block.timestamp,
            completed: false
        });

        // Encode message
        CrossChainMessage memory message = CrossChainMessage({
            messageType: MSG_TRANSFER,
            asset: asset,
            amount: amount,
            sender: msg.sender,
            data: abi.encode(recipient, requestId)
        });

        // Send cross-chain message
        _sendMessage(dstChainId, abi.encode(message));

        emit BridgeInitiated(requestId, msg.sender, asset, amount, dstChainId);
    }

    /**
     * @notice Request cross-chain rebalance
     * @param dstChainId Destination chain ID
     * @param asset The asset to rebalance
     * @param amount The amount to move
     * @param targetProtocol Target protocol on destination chain
     */
    function requestRebalance(
        uint32 dstChainId,
        address asset,
        uint256 amount,
        bytes32 targetProtocol
    ) external payable {
        require(msg.sender == yieldAggregator || msg.sender == owner(), "Unauthorized");
        require(peers[dstChainId].active, "Destination chain not configured");

        CrossChainMessage memory message = CrossChainMessage({
            messageType: MSG_REBALANCE,
            asset: asset,
            amount: amount,
            sender: msg.sender,
            data: abi.encode(targetProtocol)
        });

        _sendMessage(dstChainId, abi.encode(message));

        emit RebalanceRequested(dstChainId, asset, amount, targetProtocol);
    }

    /**
     * @notice Send yield report to another chain
     * @param dstChainId Destination chain ID
     * @param asset The asset
     * @param apy Current APY
     * @param totalDeposited Total deposits
     */
    function sendYieldReport(
        uint32 dstChainId,
        address asset,
        uint256 apy,
        uint256 totalDeposited
    ) external payable {
        require(msg.sender == yieldAggregator || msg.sender == owner(), "Unauthorized");
        require(peers[dstChainId].active, "Destination chain not configured");

        CrossChainMessage memory message = CrossChainMessage({
            messageType: MSG_YIELD_REPORT,
            asset: asset,
            amount: 0,
            sender: msg.sender,
            data: abi.encode(apy, totalDeposited)
        });

        _sendMessage(dstChainId, abi.encode(message));
    }

    // ============ LayerZero Receive ============

    /**
     * @notice Receive cross-chain message from LayerZero
     * @param _origin Origin information
     * @param _guid Unique message identifier
     * @param _message Encoded message
     */
    function lzReceive(
        Origin calldata _origin,
        bytes32 _guid,
        bytes calldata _message,
        address /*_executor*/,
        bytes calldata /*_extraData*/
    ) external payable override {
        require(msg.sender == address(endpoint), "Only endpoint");
        require(!processedMessages[_guid], "Message already processed");
        require(
            _origin.sender == peers[_origin.srcEid].peer,
            "Invalid sender"
        );

        processedMessages[_guid] = true;

        // Decode message
        CrossChainMessage memory ccMessage = abi.decode(_message, (CrossChainMessage));

        emit CrossChainMessageReceived(
            _origin.srcEid,
            _origin.sender,
            ccMessage.messageType,
            ccMessage.data
        );

        // Process based on message type
        if (ccMessage.messageType == MSG_TRANSFER) {
            _processTransfer(ccMessage);
        } else if (ccMessage.messageType == MSG_REBALANCE) {
            _processRebalance(ccMessage);
        } else if (ccMessage.messageType == MSG_YIELD_REPORT) {
            _processYieldReport(ccMessage, _origin.srcEid);
        }
    }

    /**
     * @notice Check if path is allowed
     */
    function allowInitializePath(Origin calldata _origin) external view override returns (bool) {
        return peers[_origin.srcEid].active && peers[_origin.srcEid].peer == _origin.sender;
    }

    /**
     * @notice Get next nonce for a sender (not used in LayerZero V2 OApp pattern)
     * @dev Returns 0 as this implementation uses ordered delivery
     */
    function nextNonce(uint32 /*_srcEid*/, bytes32 /*_sender*/) external pure override returns (uint64) {
        return 0; // LayerZero V2 OApp uses ordered delivery, nonce tracked by endpoint
    }

    // ============ View Functions ============

    /**
     * @notice Quote fee for cross-chain message
     * @param dstChainId Destination chain ID
     * @param message Encoded message
     * @return fee Required fee in native token
     */
    function quoteFee(
        uint32 dstChainId,
        bytes memory message
    ) external view returns (uint256 fee) {
        bytes memory options = _buildOptions(dstChainId);
        
        ILayerZeroEndpoint.MessagingParams memory params = ILayerZeroEndpoint.MessagingParams({
            dstEid: dstChainId,
            receiver: peers[dstChainId].peer,
            message: message,
            options: options,
            payInLzToken: false
        });

        ILayerZeroEndpoint.MessagingFee memory msgFee = endpoint.quote(params, address(this));
        return msgFee.nativeFee;
    }

    /**
     * @notice Get bridge request details
     * @param requestId The request ID
     * @return The bridge request
     */
    function getBridgeRequest(bytes32 requestId) external view returns (BridgeRequest memory) {
        return bridgeRequests[requestId];
    }

    /**
     * @notice Get peer for a chain
     * @param eid Endpoint ID
     * @return The peer configuration
     */
    function getPeer(uint32 eid) external view returns (PeerConfig memory) {
        return peers[eid];
    }

    // ============ Internal Functions ============

    /**
     * @notice Send message via LayerZero
     * @param dstChainId Destination chain
     * @param message Encoded message
     */
    function _sendMessage(uint32 dstChainId, bytes memory message) internal {
        bytes memory options = _buildOptions(dstChainId);
        
        ILayerZeroEndpoint.MessagingParams memory params = ILayerZeroEndpoint.MessagingParams({
            dstEid: dstChainId,
            receiver: peers[dstChainId].peer,
            message: message,
            options: options,
            payInLzToken: false
        });

        endpoint.send{value: msg.value}(params, msg.sender);
    }

    /**
     * @notice Build LayerZero options
     * @param dstChainId Destination chain
     * @return options Encoded options
     */
    function _buildOptions(uint32 dstChainId) internal view returns (bytes memory) {
        uint256 gasLimit = chainGasLimits[dstChainId];
        if (gasLimit == 0) gasLimit = 200000;
        
        // LayerZero V2 options encoding
        return abi.encodePacked(
            uint16(1), // Options type
            gasLimit
        );
    }

    /**
     * @notice Process incoming transfer
     * @param message The decoded message
     */
    function _processTransfer(CrossChainMessage memory message) internal {
        (bytes32 recipient, bytes32 requestId) = abi.decode(message.data, (bytes32, bytes32));
        
        address recipientAddr = address(uint160(uint256(recipient)));
        require(recipientAddr != address(0), "Invalid recipient");
        
        // Transfer tokens to recipient
        // Note: In production, you'd use wrapped tokens or a mint mechanism
        uint256 balance = IERC20(message.asset).balanceOf(address(this));
        require(balance >= message.amount, "Insufficient bridge liquidity");
        
        IERC20(message.asset).safeTransfer(recipientAddr, message.amount);
        emit BridgeCompleted(requestId, recipientAddr, message.amount);
    }

    /**
     * @notice Process rebalance request
     * @param message The decoded message
     */
    function _processRebalance(CrossChainMessage memory message) internal view {
        bytes32 targetProtocol = abi.decode(message.data, (bytes32));
        
        // In production, call the yield aggregator to execute rebalance
        // This would involve withdrawing from current protocol and depositing to target
        if (yieldAggregator != address(0)) {
            // Trigger rebalance logic
            // YieldAggregator(yieldAggregator).executeRebalance(message.asset, message.amount, targetProtocol);
        }
        
        // Silence unused variable warnings (these would be used in production implementation)
        targetProtocol;
        message;
    }

    /**
     * @notice Process yield report
     * @param message The decoded message
     * @param srcChainId Source chain ID
     */
    function _processYieldReport(CrossChainMessage memory message, uint32 srcChainId) internal {
        (uint256 apy, uint256 totalDeposited) = abi.decode(message.data, (uint256, uint256));
        
        // In production, store this data for cross-chain yield comparison
        // This enables finding the best yield across all chains
        
        // Silence unused variable warnings (these would be used in production to store yield data)
        apy;
        totalDeposited;
        
        // Emit event for off-chain indexing
        emit CrossChainMessageReceived(srcChainId, bytes32(0), MSG_YIELD_REPORT, message.data);
    }

    /**
     * @notice Emergency withdraw tokens
     * @param token Token to withdraw
     * @param to Recipient address
     */
    function emergencyWithdraw(address token, address to) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).safeTransfer(to, balance);
        }
    }

    /**
     * @notice Receive native token
     */
    receive() external payable {}
}

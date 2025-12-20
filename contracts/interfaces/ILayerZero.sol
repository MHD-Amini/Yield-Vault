// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ILayerZeroEndpoint
 * @notice Interface for LayerZero V2 Endpoint
 */
interface ILayerZeroEndpoint {
    struct MessagingParams {
        uint32 dstEid;
        bytes32 receiver;
        bytes message;
        bytes options;
        bool payInLzToken;
    }

    struct MessagingFee {
        uint256 nativeFee;
        uint256 lzTokenFee;
    }

    struct MessagingReceipt {
        bytes32 guid;
        uint64 nonce;
        MessagingFee fee;
    }

    function send(
        MessagingParams calldata _params,
        address _refundAddress
    ) external payable returns (MessagingReceipt memory);

    function quote(
        MessagingParams calldata _params,
        address _sender
    ) external view returns (MessagingFee memory);

    function setDelegate(address _delegate) external;
    function eid() external view returns (uint32);
}

/**
 * @title ILayerZeroReceiver
 * @notice Interface for receiving LayerZero messages
 */
interface ILayerZeroReceiver {
    struct Origin {
        uint32 srcEid;
        bytes32 sender;
        uint64 nonce;
    }

    function lzReceive(
        Origin calldata _origin,
        bytes32 _guid,
        bytes calldata _message,
        address _executor,
        bytes calldata _extraData
    ) external payable;

    function allowInitializePath(Origin calldata _origin) external view returns (bool);
    function nextNonce(uint32 _srcEid, bytes32 _sender) external view returns (uint64);
}

/**
 * @title IOAppCore
 * @notice Core OApp interface for LayerZero applications
 */
interface IOAppCore {
    function endpoint() external view returns (ILayerZeroEndpoint);
    function oAppVersion() external view returns (uint64 senderVersion, uint64 receiverVersion);
    function peers(uint32 _eid) external view returns (bytes32);
    function setPeer(uint32 _eid, bytes32 _peer) external;
}

/**
 * @title IOFT
 * @notice Interface for OFT (Omnichain Fungible Token)
 */
interface IOFT {
    struct SendParam {
        uint32 dstEid;
        bytes32 to;
        uint256 amountLD;
        uint256 minAmountLD;
        bytes extraOptions;
        bytes composeMsg;
        bytes oftCmd;
    }

    struct OFTLimit {
        uint256 minAmountLD;
        uint256 maxAmountLD;
    }

    struct OFTFeeDetail {
        int256 feeAmountLD;
        string description;
    }

    struct OFTReceipt {
        uint256 amountSentLD;
        uint256 amountReceivedLD;
    }

    function quoteSend(
        SendParam calldata _sendParam,
        bool _payInLzToken
    ) external view returns (ILayerZeroEndpoint.MessagingFee memory msgFee, OFTReceipt memory oftReceipt);

    function send(
        SendParam calldata _sendParam,
        ILayerZeroEndpoint.MessagingFee calldata _fee,
        address _refundAddress
    ) external payable returns (ILayerZeroEndpoint.MessagingReceipt memory msgReceipt, OFTReceipt memory oftReceipt);

    function token() external view returns (address);
    function approvalRequired() external view returns (bool);
}

/**
 * @title CCIP Router Interface
 * @notice Interface for Chainlink CCIP Router
 */
interface IRouterClient {
    struct EVM2AnyMessage {
        bytes receiver;
        bytes data;
        EVMTokenAmount[] tokenAmounts;
        address feeToken;
        bytes extraArgs;
    }

    struct EVMTokenAmount {
        address token;
        uint256 amount;
    }

    function getFee(
        uint64 destinationChainSelector,
        EVM2AnyMessage memory message
    ) external view returns (uint256 fee);

    function ccipSend(
        uint64 destinationChainSelector,
        EVM2AnyMessage calldata message
    ) external payable returns (bytes32);

    function isChainSupported(uint64 chainSelector) external view returns (bool);
}

import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Get network info
  const network = await ethers.provider.getNetwork();
  console.log("\nDeploying to network:", network.name, "chainId:", network.chainId);

  // Deploy YieldAggregator
  console.log("\n1. Deploying YieldAggregator...");
  const YieldAggregator = await ethers.getContractFactory("YieldAggregator");
  const yieldAggregator = await YieldAggregator.deploy(deployer.address);
  await yieldAggregator.waitForDeployment();
  const yieldAggregatorAddress = await yieldAggregator.getAddress();
  console.log("   YieldAggregator deployed to:", yieldAggregatorAddress);

  // Deploy CrossChainBridge (with mock endpoint for local testing)
  console.log("\n2. Deploying CrossChainBridge...");
  // For local testing, use a mock endpoint address
  // In production, use the actual LayerZero endpoint address
  const layerZeroEndpoints: { [key: number]: string } = {
    1: "0x1a44076050125825900e736c501f859c50fE728c", // Ethereum
    137: "0x1a44076050125825900e736c501f859c50fE728c", // Polygon
    42161: "0x1a44076050125825900e736c501f859c50fE728c", // Arbitrum
    11155111: "0x6EDCE65403992e310A62460808c4b910D972f10f", // Sepolia
    31337: deployer.address, // Local hardhat (mock)
  };

  const endpointAddress = layerZeroEndpoints[Number(network.chainId)] || deployer.address;
  const CrossChainBridge = await ethers.getContractFactory("CrossChainBridge");
  const crossChainBridge = await CrossChainBridge.deploy(endpointAddress);
  await crossChainBridge.waitForDeployment();
  const crossChainBridgeAddress = await crossChainBridge.getAddress();
  console.log("   CrossChainBridge deployed to:", crossChainBridgeAddress);

  // Deploy Aave V3 Adapter (mock pool address for testing)
  console.log("\n3. Deploying AaveV3Adapter...");
  const aavePoolAddresses: { [key: number]: string } = {
    1: "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2", // Ethereum
    137: "0x794a61358D6845594F94dc1DB02A252b5b4814aD", // Polygon
    42161: "0x794a61358D6845594F94dc1DB02A252b5b4814aD", // Arbitrum
    11155111: "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951", // Sepolia
    31337: deployer.address, // Local hardhat (mock)
  };

  const aavePoolAddress = aavePoolAddresses[Number(network.chainId)] || deployer.address;
  const AaveV3Adapter = await ethers.getContractFactory("AaveV3Adapter");
  const aaveAdapter = await AaveV3Adapter.deploy(aavePoolAddress, network.chainId);
  await aaveAdapter.waitForDeployment();
  const aaveAdapterAddress = await aaveAdapter.getAddress();
  console.log("   AaveV3Adapter deployed to:", aaveAdapterAddress);

  // Deploy Compound V3 Adapter (mock comet address for testing)
  console.log("\n4. Deploying CompoundV3Adapter...");
  const compoundCometAddresses: { [key: number]: string } = {
    1: "0xc3d688B66703497DAA19211EEdff47f25384cdc3", // Ethereum USDC
    137: "0xF25212E676D1F7F89Cd72fFEe66158f541246445", // Polygon USDC
    42161: "0xA5EDBDD9646f8dFF606d7448e414884C7d905dCA", // Arbitrum USDC
    11155111: "0xAec1F48e02Cfb822Be958B68C7957156EB3F0b6e", // Sepolia
    31337: deployer.address, // Local hardhat (mock)
  };

  const compoundCometAddress = compoundCometAddresses[Number(network.chainId)] || deployer.address;
  const CompoundV3Adapter = await ethers.getContractFactory("CompoundV3Adapter");
  const compoundAdapter = await CompoundV3Adapter.deploy(compoundCometAddress, network.chainId);
  await compoundAdapter.waitForDeployment();
  const compoundAdapterAddress = await compoundAdapter.getAddress();
  console.log("   CompoundV3Adapter deployed to:", compoundAdapterAddress);

  // Configure YieldAggregator
  console.log("\n5. Configuring YieldAggregator...");
  
  // Add protocols
  console.log("   Adding Aave V3 protocol...");
  await yieldAggregator.addProtocol(aaveAdapterAddress);
  
  console.log("   Adding Compound V3 protocol...");
  await yieldAggregator.addProtocol(compoundAdapterAddress);

  // Set cross-chain bridge
  console.log("   Setting CrossChainBridge...");
  await yieldAggregator.setCrossChainBridge(crossChainBridgeAddress);

  // Configure CrossChainBridge
  console.log("\n6. Configuring CrossChainBridge...");
  await crossChainBridge.setYieldAggregator(yieldAggregatorAddress);

  // Add supported stablecoins (using example addresses)
  const stablecoins: { [key: number]: { USDC: string; USDT: string } } = {
    1: {
      USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    },
    137: {
      USDC: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
      USDT: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    },
    42161: {
      USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    },
    11155111: {
      USDC: "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8",
      USDT: "0x7169D38820dfd117C3FA1f22a697dBA58d90BA06",
    },
    31337: {
      USDC: deployer.address,
      USDT: deployer.address,
    },
  };

  const coins = stablecoins[Number(network.chainId)] || stablecoins[31337];
  console.log("   Adding USDC support...");
  await yieldAggregator.addSupportedAsset(coins.USDC);
  await crossChainBridge.setSupportedToken(coins.USDC, true);

  console.log("   Adding USDT support...");
  await yieldAggregator.addSupportedAsset(coins.USDT);
  await crossChainBridge.setSupportedToken(coins.USDT, true);

  // Print deployment summary
  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log(`Network: ${network.name} (chainId: ${network.chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log("\nContract Addresses:");
  console.log(`  YieldAggregator:   ${yieldAggregatorAddress}`);
  console.log(`  CrossChainBridge:  ${crossChainBridgeAddress}`);
  console.log(`  AaveV3Adapter:     ${aaveAdapterAddress}`);
  console.log(`  CompoundV3Adapter: ${compoundAdapterAddress}`);
  console.log("\nSupported Assets:");
  console.log(`  USDC: ${coins.USDC}`);
  console.log(`  USDT: ${coins.USDT}`);
  console.log("=".repeat(60));

  // Return addresses for verification scripts
  return {
    yieldAggregator: yieldAggregatorAddress,
    crossChainBridge: crossChainBridgeAddress,
    aaveAdapter: aaveAdapterAddress,
    compoundAdapter: compoundAdapterAddress,
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

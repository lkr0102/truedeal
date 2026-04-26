const hre = require("hardhat");

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  TRUE DEAL - Smart Contract Deployment");
  console.log("  Network: " + hre.network.name);
  console.log("═══════════════════════════════════════════════════════════\n");

  // Get network name to determine deployment
  const networkName = hre.network.name;
  const isMainnet = networkName === "celo";
  
  console.log("Deploying TrueDeal contract...\n");

  // Deploy TrueDeal contract
  const TrueDeal = await hre.ethers.getContractFactory("TrueDeal");
  const trueDeal = await TrueDeal.deploy();

  await trueDeal.waitForDeployment();
  const contractAddress = await trueDeal.getAddress();

  console.log("✅ TrueDeal deployed to:", contractAddress);
  console.log("");

  // Verify contract on CeloScan (if not local/localhost)
  if (networkName !== "localhost" && networkName !== "hardhat") {
    try {
      console.log("Verifying contract on CeloScan...");
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [],
      });
      console.log("✅ Contract verified successfully!");
    } catch (error) {
      console.log("⚠️  Verification skipped:", error.message);
    }
  }

  // Save deployment info
  const deploymentInfo = {
    network: networkName,
    chainId: hre.network.config.chainId,
    contractAddress: contractAddress,
    deployer: (await hre.ethers.getSigners())[0].address,
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  };

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  DEPLOYMENT SUMMARY");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("Network:", networkName);
  console.log("Chain ID:", deploymentInfo.chainId);
  console.log("Contract Address:", contractAddress);
  console.log("Deployer:", deploymentInfo.deployer);
  console.log("═══════════════════════════════════════════════════════════\n");

  // Save to file
  const fs = require("fs");
  const path = require("path");
  
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const deploymentFile = path.join(deploymentsDir, `${networkName}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  
  console.log("📁 Deployment info saved to:", deploymentFile);
  console.log("\n🎉 Deployment complete!");
  
  if (isMainnet) {
    console.log("\n📋 Next steps for Proof of Ship:");
    console.log("   1. Add contract to Celo Explorer: https://explorer.celo.org");
    console.log("   2. Submit to Proof of Ship program");
    console.log("   3. Verify contract source code on CeloScan");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
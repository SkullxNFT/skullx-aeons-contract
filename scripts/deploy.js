async function main () {
    const SkullxAeons = await ethers.getContractFactory('SkullxAeons');
    console.log('Deploying SkullxAeons...');
    const aeonsContract = await SkullxAeons.deploy('ipfs://123456789');
    await aeonsContract.deployed();
    console.log('SkullxAeons deployed to:', aeonsContract.address);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
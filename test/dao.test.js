const {
    time,
    loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DAO", function () {

    async function contractFixture() {

        const accounts = await ethers.getSigners();

        const TOKEN = await ethers.getContractFactory('Token');
        const token = await TOKEN.deploy();

        await token.deployed();

        const DAO = await ethers.getContractFactory("DAO");
        const dao = await DAO.deploy(token.address);

        await dao.deployed();


        await token.transfer(accounts[1].address, 13000);
        await token.transfer(accounts[2].address, 32300);

        await dao.createProposal(ethers.utils.formatBytes32String("first proposal"))

        return { accounts, token, dao };
    }
    // ALL TESTS SHOULD GO BETWEEN START AND END LINE
    // ---------START---------

    it("Should set right contract address", async function () {
        const { token, dao } = await loadFixture(contractFixture);

        expect(await dao.token()).to.equal(token.address);
        expect(await token.totalSupply()).to.equal(1000000);
    });

    it('Should create correct proposal', async function () {
        const { accounts, dao } = await loadFixture(contractFixture);

        const proposal = await dao.proposals(0);

        expect(proposal.title).to.eq(ethers.utils.formatBytes32String("first proposal"));
        expect(proposal.accept).to.eq(0);
        expect(proposal.reject).to.eq(0);
        expect(proposal.abstain).to.eq(0);
    })

    it('Should have correct accept votes', async function () {
        const { accounts, dao } = await loadFixture(contractFixture);

        await dao.connect(accounts[1]).voteOnProposal(0, 0);
        await dao.connect(accounts[2]).voteOnProposal(0, 0);

        const proposal = await dao.proposals(0);

        expect(proposal.accept).to.eq(45300);
    })

    it('Should have correct reject votes', async function () {
        const { accounts, dao } = await loadFixture(contractFixture);

        await dao.connect(accounts[1]).voteOnProposal(0, 1);
        await dao.connect(accounts[2]).voteOnProposal(0, 1);

        const proposal = await dao.proposals(0);

        expect(proposal.reject).to.eq(45300);
    })

    it('Should have correct abstain votes', async function () {
        const { accounts, dao } = await loadFixture(contractFixture);

        await dao.connect(accounts[1]).voteOnProposal(0, 2);
        await dao.connect(accounts[2]).voteOnProposal(0, 2);

        const proposal = await dao.proposals(0);

        expect(proposal.abstain).to.eq(45300);
    })

    it('Should revert with NOT_A_TOKEN_HOLDER', async function () {
        const { accounts, dao } = await loadFixture(contractFixture);

        await expect(dao.connect(accounts[3]).voteOnProposal(0, 0)).to.be.rejectedWith("NOT_A_TOKEN_HOLDER");
        await expect(dao.connect(accounts[3]).createProposal(ethers.utils.formatBytes32String("second proposal"))).to.be.rejectedWith("NOT_A_TOKEN_HOLDER");
    })

    it('Should revert with already voted', async function () {
        const { accounts, dao } = await loadFixture(contractFixture);

        await dao.voteOnProposal(0, 0);

        await expect(dao.voteOnProposal(0, 0)).to.be.rejectedWith("ALREADY_VOTED");
    })

    it('Should revert with inactive proposal', async function () {
        const { accounts, dao } = await loadFixture(contractFixture);

        await time.increase(time.duration.days(1));

        await expect(dao.connect(accounts[1]).voteOnProposal(0, 0)).to.be.revertedWith("INACTIVE_PROPOSAL");
    })

    it('Should revert with active proposal', async function () {
        const { accounts, dao } = await loadFixture(contractFixture);

        await expect(dao.connect(accounts[1]).executeProposal(0)).to.be.revertedWith("ACTIVE_PROPOSAL");
    })

    it('Should emit event for first proposal on execution with accept vote as winner', async function () {
        const { dao } = await loadFixture(contractFixture);

        await dao.voteOnProposal(0, 0);
        await time.increase(time.duration.days(1));

        await expect(dao.executeProposal(0)).to.emit(dao, "winner").withArgs(0, ethers.utils.formatBytes32String("first proposal"), 0);
    })

    it('Should emit event for first proposal on execution with accept vote as winner', async function () {
        const { accounts, dao } = await loadFixture(contractFixture);

        await dao.connect(accounts[1]).voteOnProposal(0, 0);
        await dao.connect(accounts[2]).voteOnProposal(0, 2);
        await time.increase(time.duration.days(1));

        await expect(dao.executeProposal(0)).to.emit(dao, "winner").withArgs(0, ethers.utils.formatBytes32String("first proposal"), 2);
    })

    it('Should emit event for first proposal on execution with accept vote as winner', async function () {
        const { accounts, dao } = await loadFixture(contractFixture);

        await dao.connect(accounts[1]).voteOnProposal(0, 1);
        await dao.connect(accounts[2]).voteOnProposal(0, 2);
        await time.increase(time.duration.days(1));

        await expect(dao.executeProposal(0)).to.emit(dao, "winner").withArgs(0, ethers.utils.formatBytes32String("first proposal"), 2);
    })
    
    it('Should emit event for first proposal on execution with reject vote as winner', async function () {
        const { dao } = await loadFixture(contractFixture);

        await dao.voteOnProposal(0, 1);
        await time.increase(time.duration.days(1));

        await expect(dao.executeProposal(0)).to.emit(dao, "winner").withArgs(0, ethers.utils.formatBytes32String("first proposal"), 1);
    })

    
    it('Should emit event for first proposal on execution with abstain vote as winner', async function () {
        const { dao } = await loadFixture(contractFixture);

        await dao.voteOnProposal(0, 2);
        await time.increase(time.duration.days(1));

        await expect(dao.executeProposal(0)).to.emit(dao, "winner").withArgs(0, ethers.utils.formatBytes32String("first proposal"), 2);
    })
    // ---------END---------
})

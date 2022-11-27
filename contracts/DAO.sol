// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract DAO {
    IERC20 public token;

    struct Proposal {
        uint256 accept;
        uint256 reject;
        uint256 abstain;
        uint256 deadline;
        bytes32 title;
        mapping(address => bool) voted;
    }

    uint256 public proposalIndex;
    mapping(uint256 => Proposal) public proposals;

    enum Vote {
        accept,
        reject,
        abstain
    }

    event winner(uint256 _index, bytes32 proposal, Vote winningVote);

    constructor(address _token) {
        token = IERC20(_token);
    }

    function createProposal(
        bytes32 _proposal
    ) public onlyTokenHolders returns (uint256) {
        Proposal storage proposal = proposals[proposalIndex];

        proposal.title = _proposal;
        proposal.deadline = block.timestamp + 1 days;

        proposalIndex++;

        return proposalIndex - 1;
    }

    function voteOnProposal(uint256 _index, Vote vote) public onlyTokenHolders {
        Proposal storage proposal = proposals[_index];

        require(block.timestamp < proposal.deadline, "INACTIVE_PROPOSAL");
        require(proposal.voted[msg.sender] == false, "ALREADY_VOTED");

        proposal.voted[msg.sender] = true;

        if (vote == Vote.accept) {
            proposal.accept += token.balanceOf(msg.sender);
        } else if (vote == Vote.reject) {
            proposal.reject += token.balanceOf(msg.sender);
        } else {
            proposal.abstain += token.balanceOf(msg.sender);
        }
    }

    function executeProposal(uint256 _index) public {
        Proposal storage proposal = proposals[_index];

        require(block.timestamp > proposal.deadline, "ACTIVE_PROPOSAL");

        if (proposal.accept >= proposal.reject) {
            if (proposal.accept >= proposal.abstain) {
                emit winner(_index, proposal.title, Vote.accept);
            } else {
                emit winner(_index, proposal.title, Vote.abstain);
            }
        } else {
            if (proposal.reject >= proposal.abstain) {
                emit winner(_index, proposal.title, Vote.reject);
            } else {
                emit winner(_index, proposal.title, Vote.abstain);
            }
        }
    }

    modifier onlyTokenHolders() {
        require(token.balanceOf(msg.sender) > 0, "NOT_A_TOKEN_HOLDER");
        _;
    }
}

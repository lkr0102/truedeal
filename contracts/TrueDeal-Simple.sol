// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract TrueDeal {
    uint256 public dealCount = 0;
    mapping(uint256 => Deal) public deals;
    mapping(uint256 => address[]) public dealParticipants;
    mapping(uint256 => mapping(address => uint256)) public userStake;
    mapping(uint256 => mapping(address => bool)) public hasJoinedDeal;
    
    struct Deal {
        string name;
        address creator;
        uint256 stakeAmount;
        uint256 totalPool;
        uint256 deadline;
        uint8 status;
        address winner;
    }
    
    event DealCreated(uint256 id, address creator, string name, uint256 stake);
    event DealJoined(uint256 id, address participant, uint256 amount);
    event DealVerified(uint256 id, address winner, uint256 prize);
    event DealCancelled(uint256 id);
    
    function createDeal(string memory _name, uint256 _stake, uint256 _duration) public {
        require(_stake >= 0.01 ether, "Stake too low");
        dealCount++;
        
        deals[dealCount] = Deal({
            name: _name,
            creator: msg.sender,
            stakeAmount: _stake,
            totalPool: 0,
            deadline: block.timestamp + _duration,
            status: 1,
            winner: address(0)
        });
        
        dealParticipants[dealCount].push(msg.sender);
        hasJoinedDeal[dealCount][msg.sender] = true;
        
        emit DealCreated(dealCount, msg.sender, _name, _stake);
    }
    
    function joinDeal(uint256 _dealId) public payable {
        Deal storage d = deals[_dealId];
        
        require(d.creator != address(0), "Deal not found");
        require(d.status == 1, "Deal not active");
        require(!hasJoinedDeal[_dealId][msg.sender], "Already joined");
        require(msg.value >= d.stakeAmount, "Insufficient stake");
        
        hasJoinedDeal[_dealId][msg.sender] = true;
        dealParticipants[_dealId].push(msg.sender);
        userStake[_dealId][msg.sender] = msg.value;
        d.totalPool += msg.value;
        
        emit DealJoined(_dealId, msg.sender, msg.value);
    }
    
    function verifyDeal(uint256 _dealId, address _winner) public {
        Deal storage d = deals[_dealId];
        
        require(d.creator != address(0), "Deal not found");
        require(d.status == 1, "Deal not active");
        require(block.timestamp >= d.deadline, "Deadline not reached");
        require(hasJoinedDeal[_dealId][_winner], "Winner not found");
        
        uint256 prize = (d.totalPool * 97) / 100;
        
        d.status = 2;
        d.winner = _winner;
        
        payable(_winner).call{value: prize}("");
        
        emit DealVerified(_dealId, _winner, prize);
    }
    
    function cancelDeal(uint256 _dealId) public {
        Deal storage d = deals[_dealId];
        
        require(d.creator == msg.sender, "Not creator");
        require(d.status == 1, "Deal not active");
        
        d.status = 3;
        
        emit DealCancelled(_dealId);
    }
    
    function getDeal(uint256 _dealId) public view returns (Deal memory) {
        return deals[_dealId];
    }
    
    function getParticipants(uint256 _dealId) public view returns (address[] memory) {
        return dealParticipants[_dealId];
    }
    
    receive() external payable {}
}
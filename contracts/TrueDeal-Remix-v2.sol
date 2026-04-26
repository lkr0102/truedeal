// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TrueDeal - Ultra Minimal Version
 * @dev For Remix deployment on Celo network
 * @custom:proofofship True Deal - Proof of Ship
 */
contract TrueDeal {
    
    uint8 public constant FEE = 3;
    uint256 public constant MIN_STAKE = 0.01 ether;
    
    uint256 public dealCount = 0;
    mapping(uint256 => Deal) public deals;
    mapping(uint256 => address[]) public participants;
    mapping(uint256 => mapping(address => bool)) public hasJoined;
    mapping(uint256 => mapping(address => uint256)) public stakes;
    
    struct Deal {
        string name;
        string desc;
        address creator;
        uint256 stake;
        uint8 max;
        uint256 deadline;
        uint256 created;
        uint8 status;
        address winner;
        uint256 pool;
    }
    
    event Created(uint256 id, address creator, string name, uint256 stake, uint8 max, uint256 deadline);
    event Joined(uint256 id, address participant, uint256 amount);
    event Verified(uint256 id, address winner, uint256 prize);
    event Cancelled(uint256 id);
    event Withdrawn(uint256 id, address participant, uint256 amount);
    
    function createDeal(
        string memory name,
        string memory desc,
        uint256 stakeAmount,
        uint8 maxParticipants,
        uint256 duration
    ) public returns (uint256) {
        require(stakeAmount >= MIN_STAKE, "Stake too low");
        require(maxParticipants >= 2 && maxParticipants <= 100, "Invalid participants");
        
        uint256 id = ++dealCount;
        
        deals[id] = Deal({
            name: name,
            desc: desc,
            creator: msg.sender,
            stake: stakeAmount,
            max: maxParticipants,
            deadline: block.timestamp + duration,
            created: block.timestamp,
            status: 1,
            winner: address(0),
            pool: 0
        });
        
        participants[id].push(msg.sender);
        hasJoined[id][msg.sender] = true;
        
        emit Created(id, msg.sender, name, stakeAmount, maxParticipants, deals[id].deadline);
        return id;
    }
    
    function joinDeal(uint256 id) public payable {
        Deal storage d = deals[id];
        
        require(d.created > 0, "Deal not found");
        require(d.status == 1, "Deal not active");
        require(!hasJoined[id][msg.sender], "Already joined");
        require(participants[id].length < d.max, "Deal full");
        require(msg.value >= d.stake, "Insufficient stake");
        
        hasJoined[id][msg.sender] = true;
        participants[id].push(msg.sender);
        stakes[id][msg.sender] = msg.value;
        d.pool += msg.value;
        
        emit Joined(id, msg.sender, msg.value);
    }
    
    function verifyDeal(uint256 id, address winner) public {
        Deal storage d = deals[id];
        
        require(d.created > 0, "Deal not found");
        require(d.status == 1, "Deal not active");
        require(block.timestamp >= d.deadline, "Deadline not reached");
        require(hasJoined[id][winner], "Winner not in deal");
        
        uint256 fee = (d.pool * FEE) / 100;
        uint256 prize = d.pool - fee;
        
        d.status = 2;
        d.winner = winner;
        
        (bool success, ) = payable(winner).call{value: prize}("");
        require(success, "Transfer failed");
        
        emit Verified(id, winner, prize);
    }
    
    function cancelDeal(uint256 id) public {
        Deal storage d = deals[id];
        
        require(d.created > 0, "Deal not found");
        require(d.creator == msg.sender, "Not creator");
        require(d.status == 1, "Deal not active");
        
        d.status = 3;
        
        address[] memory p = participants[id];
        for (uint256 i = 0; i < p.length; i++) {
            uint256 s = stakes[id][p[i]];
            if (s > 0) {
                stakes[id][p[i]] = 0;
                payable(p[i]).call{value: s}("");
                emit Withdrawn(id, p[i], s);
            }
        }
        
        emit Cancelled(id);
    }
    
    function getDeal(uint256 id) public view returns (Deal memory) {
        return deals[id];
    }
    
    function getParticipants(uint256 id) public view returns (address[] memory) {
        return participants[id];
    }
    
    receive() external payable {}
}
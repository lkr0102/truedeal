// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TrueDeal - Versão Minimal para Remix
 * @dev Smart contract simplificado para deploy via Remix IDE
 * @notice Handles deal creation, stake management, verification and prize distribution
 * 
 * @custom:proofofship True Deal - Proof of Ship Program - Celo Network
 */
contract TrueDeal {
    
    // ═══════════════════════════════════════════════════════════════════
    // CONSTANTS
    // ═══════════════════════════════════════════════════════════════════
    
    uint8 public constant FEE_PERCENTAGE = 3;
    uint256 public constant MIN_STAKE = 0.01 ether;
    uint256 public constant MAX_DEAL_DURATION = 90 days;
    
    // ═══════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════
    
    event DealCreated(uint256 indexed dealId, address indexed creator, string name, uint256 stakeAmount, uint8 maxParticipants, uint256 deadline);
    event DealJoined(uint256 indexed dealId, address indexed participant, uint256 amount);
    event DealVerified(uint256 indexed dealId, address indexed winner, uint256 prizeAmount);
    event DealCancelled(uint256 indexed dealId);
    event StakeWithdrawn(uint256 indexed dealId, address indexed participant, uint256 amount);

    // ═══════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════
    
    uint256 private _dealCounter = 0;
    mapping(uint256 => Deal) private _deals;
    mapping(uint256 => address[]) private _dealParticipants;
    mapping(uint256 => mapping(address => bool)) private _hasJoined;
    mapping(uint256 => mapping(address => uint256)) private _stakes;
    uint256 private _locked = 0;

    // ═══════════════════════════════════════════════════════════════════
    // STRUCTS
    // ═══════════════════════════════════════════════════════════════════
    
    struct Deal {
        string name;
        string description;
        address creator;
        uint256 stakeAmount;
        uint8 maxParticipants;
        uint256 deadline;
        uint256 createdAt;
        uint8 status; // 0=Pending, 1=Active, 2=Resolved, 3=Cancelled
        address winner;
        uint256 totalPool;
        uint8 dealType;
    }

    // ═══════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════
    
    modifier nonReentrant() {
        require(_locked == 0, "Reentrancy locked");
        _locked = 1;
        _;
        _locked = 0;
    }

    // ═══════════════════════════════════════════════════════════════════
    // FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * @notice Create a new deal
     * @param name Deal name
     * @param description Deal description
     * @param stakeAmount Amount each participant must stake
     * @param maxParticipants Maximum number of participants
     * @param duration Deal duration in seconds
     * @param dealType Type of deal (0-3)
     */
    function createDeal(
        string memory name,
        string memory description,
        uint256 stakeAmount,
        uint8 maxParticipants,
        uint256 duration,
        uint8 dealType
    ) public returns (uint256) {
        require(stakeAmount >= MIN_STAKE, "Stake too low");
        require(maxParticipants >= 2 && maxParticipants <= 100, "Invalid participants");
        require(duration > 0 && duration <= MAX_DEAL_DURATION, "Invalid duration");

        uint256 dealId = ++_dealCounter;
        uint256 deadline = block.timestamp + duration;

        _deals[dealId] = Deal({
            name: name,
            description: description,
            creator: msg.sender,
            stakeAmount: stakeAmount,
            maxParticipants: maxParticipants,
            deadline: deadline,
            createdAt: block.timestamp,
            status: 1, // Active
            winner: address(0),
            totalPool: 0,
            dealType: dealType
        });

        _dealParticipants[dealId].push(msg.sender);
        _hasJoined[dealId][msg.sender] = true;

        emit DealCreated(dealId, msg.sender, name, stakeAmount, maxParticipants, deadline);
        return dealId;
    }

    /**
     * @notice Join an active deal
     */
    function joinDeal(uint256 dealId) public payable nonReentrant {
        Deal storage deal = _deals[dealId];
        
        require(deal.createdAt > 0, "Deal not found");
        require(deal.status == 1, "Deal not active");
        require(!_hasJoined[dealId][msg.sender], "Already joined");
        require(_dealParticipants[dealId].length < deal.maxParticipants, "Deal full");
        require(msg.value >= deal.stakeAmount, "Insufficient stake");

        _hasJoined[dealId][msg.sender] = true;
        _dealParticipants[dealId].push(msg.sender);
        _stakes[dealId][msg.sender] = msg.value;
        deal.totalPool += msg.value;

        emit DealJoined(dealId, msg.sender, msg.value);
    }

    /**
     * @notice Verify deal result and distribute prizes
     */
    function verifyDeal(uint256 dealId, address winner) public nonReentrant {
        Deal storage deal = _deals[dealId];
        
        require(deal.createdAt > 0, "Deal not found");
        require(deal.status == 1, "Deal not active");
        require(block.timestamp >= deal.deadline, "Deadline not reached");
        require(_hasJoined[dealId][winner], "Winner not in deal");

        uint256 platformFee = (deal.totalPool * FEE_PERCENTAGE) / 100;
        uint256 prizeAmount = deal.totalPool - platformFee;

        deal.status = 2; // Resolved
        deal.winner = winner;

        (bool success, ) = payable(winner).call{value: prizeAmount}("");
        require(success, "Transfer failed");

        emit DealVerified(dealId, winner, prizeAmount);
    }

    /**
     * @notice Cancel a deal and refund all participants
     */
    function cancelDeal(uint256 dealId) public nonReentrant {
        Deal storage deal = _deals[dealId];
        
        require(deal.createdAt > 0, "Deal not found");
        require(deal.creator == msg.sender, "Not creator");
        require(deal.status == 1, "Deal not active");

        deal.status = 3; // Cancelled
        
        address[] memory participants = _dealParticipants[dealId];
        for (uint256 i = 0; i < participants.length; i++) {
            address participant = participants[i];
            uint256 stake = _stakes[dealId][participant];
            
            if (stake > 0) {
                _stakes[dealId][participant] = 0;
                (bool success, ) = payable(participant).call{value: stake}("");
                if (success) {
                    emit StakeWithdrawn(dealId, participant, stake);
                }
            }
        }

        emit DealCancelled(dealId);
    }

    /**
     * @notice Withdraw stake if deal was cancelled
     */
    function withdrawStake(uint256 dealId) public nonReentrant {
        Deal storage deal = _deals[dealId];
        
        require(deal.createdAt > 0, "Deal not found");
        require(deal.status == 3, "Deal not cancelled");
        
        uint256 stake = _stakes[dealId][msg.sender];
        require(stake > 0, "No stake to withdraw");
        
        _stakes[dealId][msg.sender] = 0;
        (bool success, ) = payable(msg.sender).call{value: stake}("");
        require(success, "Transfer failed");
        
        emit StakeWithdrawn(dealId, msg.sender, stake);
    }

    // ═══════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════
    
    function getDeal(uint256 dealId) public view returns (Deal memory) {
        return _deals[dealId];
    }

    function getDealParticipants(uint256 dealId) public view returns (address[] memory) {
        return _dealParticipants[dealId];
    }

    function getStake(uint256 dealId, address participant) public view returns (uint256) {
        return _stakes[dealId][participant];
    }

    function hasJoined(uint256 dealId, address participant) public view returns (bool) {
        return _hasJoined[dealId][participant];
    }

    function getDealCount() public view returns (uint256) {
        return _dealCounter;
    }

    // ═══════════════════════════════════════════════════════════════════
    // RECEIVE FUNCTION
    // ═══════════════════════════════════════════════════════════════════
    
    receive() external payable {}
}
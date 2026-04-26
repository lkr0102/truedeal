// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TrueDeal Contract
 * @dev Smart contract for managing digital agreements with stake on Celo network
 * @notice Handles deal creation, stake management, verification and prize distribution
 * 
 * @custom:proofofship True Deal - Proof of Ship Program
 * 
 * @dev Version simplificada para deploy via Remix
 *      Implementa as proteções de segurança inline (sem OpenZeppelin)
 */
contract TrueDeal {
    
    // ═══════════════════════════════════════════════════════════════════
    // ERRORS
    // ═══════════════════════════════════════════════════════════════════
    
    error Deal__InvalidAmount();
    error Deal__InvalidParticipants();
    error Deal__DealNotActive();
    error Deal__DealAlreadyResolved();
    error Deal__DeadlineNotReached();
    error Deal__Unauthorized();
    error Deal__TransferFailed();
    error Deal__AlreadyJoined();
    error Deal__DealFull();
    error Deal__InvalidVerification();

    // ═══════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════
    
    event DealCreated(
        uint256 indexed dealId,
        address indexed creator,
        string name,
        uint256 stakeAmount,
        uint8 maxParticipants,
        uint256 deadline
    );
    
    event DealJoined(
        uint256 indexed dealId,
        address indexed participant,
        uint256 amount
    );
    
    event DealVerified(
        uint256 indexed dealId,
        address indexed winner,
        uint256 prizeAmount
    );
    
    event DealCancelled(
        uint256 indexed dealId,
        address indexed canceller
    );
    
    event StakeWithdrawn(
        uint256 indexed dealId,
        address indexed participant,
        uint256 amount
    );

    // ═══════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════
    
    /// @notice Platform fee percentage (3%)
    uint8 public constant FEE_PERCENTAGE = 3;
    
    /// @notice Minimum deal stake amount (0.01 CELO)
    uint256 public constant MIN_STAKE = 0.01 ether;
    
    /// @notice Maximum deal duration (90 days)
    uint256 public constant MAX_DEAL_DURATION = 90 days;
    
    /// @notice Deal counter
    uint256 private _dealCounter;
    
    /// @notice Mapping of deal ID to Deal struct
    mapping(uint256 => Deal) private _deals;
    
    /// @notice Mapping of deal ID to participant addresses
    mapping(uint256 => address[]) private _dealParticipants;
    
    /// @notice Mapping of deal ID to participant to has joined
    mapping(uint256 => mapping(address => bool)) private _hasJoined;
    
    /// @notice Mapping of deal ID to participant to stake amount
    mapping(uint256 => mapping(address => uint256)) private _stakes;
    
    /// @notice Admin address
    address public admin;
    
    /// @notice Reentrancy guard
    uint256 private _locked;

    // ═══════════════════════════════════════════════════════════════════
    // STRUCTS
    // ═══════════════════════════════════════════════════════════════════
    
    enum DealStatus {
        Pending,
        Active,
        Resolved,
        Cancelled
    }
    
    struct Deal {
        string name;
        string description;
        address creator;
        uint256 stakeAmount;
        uint8 maxParticipants;
        uint256 deadline;
        uint256 createdAt;
        DealStatus status;
        address winner;
        uint256 totalPool;
        uint8 dealType;
    }

    // ═══════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════
    
    modifier dealExists(uint256 dealId) {
        if (_deals[dealId].createdAt == 0) {
            revert Deal__DealNotActive();
        }
        _;
    }
    
    modifier onlyDealCreator(uint256 dealId) {
        if (msg.sender != _deals[dealId].creator) {
            revert Deal__Unauthorized();
        }
        _;
    }
    
    modifier onlyActiveDeal(uint256 dealId) {
        if (_deals[dealId].status != DealStatus.Active) {
            revert Deal__DealNotActive();
        }
        _;
    }
    
    modifier nonReentrant() {
        require(_locked == 0, "ReentrancyGuard: locked");
        _locked = 1;
        _;
        _locked = 0;
    }

    // ═══════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════
    
    constructor() {
        admin = msg.sender;
        _locked = 0;
    }

    // ═══════════════════════════════════════════════════════════════════
    // EXTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * @notice Create a new deal
     */
    function createDeal(
        string calldata name,
        string calldata description,
        uint256 stakeAmount,
        uint8 maxParticipants,
        uint256 duration,
        uint8 dealType
    ) external returns (uint256) {
        if (stakeAmount < MIN_STAKE) {
            revert Deal__InvalidAmount();
        }
        if (maxParticipants < 2 || maxParticipants > 100) {
            revert Deal__InvalidParticipants();
        }
        if (duration == 0 || duration > MAX_DEAL_DURATION) {
            revert Deal__InvalidAmount();
        }

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
            status: DealStatus.Active,
            winner: address(0),
            totalPool: 0,
            dealType: dealType
        });

        // Creator automatically joins the deal
        _dealParticipants[dealId].push(msg.sender);
        _hasJoined[dealId][msg.sender] = true;

        emit DealCreated(
            dealId,
            msg.sender,
            name,
            stakeAmount,
            maxParticipants,
            deadline
        );

        return dealId;
    }

    /**
     * @notice Join an active deal
     */
    function joinDeal(uint256 dealId) 
        external 
        payable 
        dealExists(dealId) 
        onlyActiveDeal(dealId) 
        nonReentrant 
    {
        Deal storage deal = _deals[dealId];
        
        if (_hasJoined[dealId][msg.sender]) {
            revert Deal__AlreadyJoined();
        }
        
        if (_dealParticipants[dealId].length >= deal.maxParticipants) {
            revert Deal__DealFull();
        }
        
        if (msg.value < deal.stakeAmount) {
            revert Deal__InvalidAmount();
        }

        _hasJoined[dealId][msg.sender] = true;
        _dealParticipants[dealId].push(msg.sender);
        _stakes[dealId][msg.sender] = msg.value;
        deal.totalPool += msg.value;

        emit DealJoined(dealId, msg.sender, msg.value);
    }

    /**
     * @notice Verify deal result and distribute prizes
     */
    function verifyDeal(uint256 dealId, address winner) 
        external 
        dealExists(dealId) 
        onlyActiveDeal(dealId) 
        nonReentrant 
    {
        Deal storage deal = _deals[dealId];
        
        if (block.timestamp < deal.deadline) {
            revert Deal__DeadlineNotReached();
        }
        
        if (!_hasJoined[dealId][winner]) {
            revert Deal__InvalidVerification();
        }

        // Calculate fees and prize
        uint256 platformFee = (deal.totalPool * FEE_PERCENTAGE) / 100;
        uint256 prizeAmount = deal.totalPool - platformFee;

        // Update deal status
        deal.status = DealStatus.Resolved;
        deal.winner = winner;

        // Transfer prize to winner
        (bool success, ) = payable(winner).call{value: prizeAmount}("");
        if (!success) {
            revert Deal__TransferFailed();
        }

        emit DealVerified(dealId, winner, prizeAmount);
    }

    /**
     * @notice Cancel a deal and refund all participants
     */
    function cancelDeal(uint256 dealId) 
        external 
        dealExists(dealId) 
        onlyDealCreator(dealId) 
        nonReentrant 
    {
        Deal storage deal = _deals[dealId];
        
        if (deal.status != DealStatus.Active) {
            revert Deal__DealAlreadyResolved();
        }

        deal.status = DealStatus.Cancelled;
        
        // Refund all participants
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

        emit DealCancelled(dealId, msg.sender);
    }

    /**
     * @notice Withdraw stake if deal was cancelled
     */
    function withdrawStake(uint256 dealId) 
        external 
        dealExists(dealId) 
        nonReentrant 
    {
        Deal storage deal = _deals[dealId];
        
        if (deal.status != DealStatus.Cancelled) {
            revert Deal__DealNotActive();
        }
        
        uint256 stake = _stakes[dealId][msg.sender];
        if (stake == 0) {
            revert Deal__InvalidAmount();
        }
        
        _stakes[dealId][msg.sender] = 0;
        (bool success, ) = payable(msg.sender).call{value: stake}("");
        if (!success) {
            revert Deal__TransferFailed();
        }
        
        emit StakeWithdrawn(dealId, msg.sender, stake);
    }

    // ═══════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════
    
    function getDeal(uint256 dealId) 
        external 
        view 
        dealExists(dealId) 
        returns (Deal memory) 
    {
        return _deals[dealId];
    }

    function getDealParticipants(uint256 dealId) 
        external 
        view 
        dealExists(dealId) 
        returns (address[] memory) 
    {
        return _dealParticipants[dealId];
    }

    function getStake(uint256 dealId, address participant) 
        external 
        view 
        returns (uint256) 
    {
        return _stakes[dealId][participant];
    }

    function hasJoined(uint256 dealId, address participant) 
        external 
        view 
        returns (bool) 
    {
        return _hasJoined[dealId][participant];
    }

    function getDealCount() external view returns (uint256) {
        return _dealCounter;
    }

    // ═══════════════════════════════════════════════════════════════════
    // RECEIVE FUNCTION
    // ═══════════════════════════════════════════════════════════════════
    
    receive() external payable {}
}
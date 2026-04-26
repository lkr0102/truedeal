// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title TrueDeal Contract
 * @dev Smart contract for managing digital agreements with stake on Celo network
 * @notice Handles deal creation, stake management, verification and prize distribution
 * 
 * @dev This contract is designed for the Celo network and follows OpenZeppelin best practices
 *      for security and upgradability patterns.
 * 
 * @custom:proofofship True Deal - Proof of Ship Program
 */
contract TrueDeal is AccessControl, ReentrancyGuard {
    
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
    
    /// @notice Role for verifier oracle
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

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
        uint8 dealType; // 0: Social Media, 1: Check-in, 2: Fitness, 3: Free Goal
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

    // ═══════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // ═══════════════════════════════════════════════════════════════════
    // EXTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * @notice Create a new deal
     * @param name Deal name
     * @param description Deal description
     * @param stakeAmount Amount each participant must stake
     * @param maxParticipants Maximum number of participants
     * @param duration Deal duration in seconds
     * @param dealType Type of deal (0-3)
     * @return dealId The ID of the created deal
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
     * @param dealId The deal ID to join
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
     * @param dealId The deal ID to verify
     * @param winner The address of the winner
     */
    function verifyDeal(uint256 dealId, address winner) 
        external 
        dealExists(dealId) 
        onlyActiveDeal(dealId) 
        onlyRole(VERIFIER_ROLE) 
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
     * @param dealId The deal ID to cancel
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
     * @param dealId The deal ID
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
    
    /**
     * @notice Get deal information
     * @param dealId The deal ID
     * @return Deal struct information
     */
    function getDeal(uint256 dealId) 
        external 
        view 
        dealExists(dealId) 
        returns (Deal memory) 
    {
        return _deals[dealId];
    }

    /**
     * @notice Get participants of a deal
     * @param dealId The deal ID
     * @return Array of participant addresses
     */
    function getDealParticipants(uint256 dealId) 
        external 
        view 
        dealExists(dealId) 
        returns (address[] memory) 
    {
        return _dealParticipants[dealId];
    }

    /**
     * @notice Get stake amount for a participant
     * @param dealId The deal ID
     * @param participant The participant address
     * @return Stake amount
     */
    function getStake(uint256 dealId, address participant) 
        external 
        view 
        returns (uint256) 
    {
        return _stakes[dealId][participant];
    }

    /**
     * @notice Check if address has joined a deal
     * @param dealId The deal ID
     * @param participant The participant address
     * @return Boolean indicating if joined
     */
    function hasJoined(uint256 dealId, address participant) 
        external 
        view 
        returns (bool) 
    {
        return _hasJoined[dealId][participant];
    }

    /**
     * @notice Get current deal count
     * @return Current deal counter value
     */
    function getDealCount() external view returns (uint256) {
        return _dealCounter;
    }

    // ═══════════════════════════════════════════════════════════════════
    // RECEIVE FUNCTION
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * @notice Allow contract to receive Celo
     */
    receive() external payable {}
}
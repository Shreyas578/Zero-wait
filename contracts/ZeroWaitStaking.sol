// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ZeroWaitStaking
 * @dev Staking contract with block-accurate eligibility and instant unstaking
 * Allows unstaking immediately when block.timestamp >= unlockTime
 */
contract ZeroWaitStaking is Ownable, ReentrancyGuard {
    IERC20 public immutable stakingToken;
    uint256 public lockDuration; // 3600 seconds for the challenge
    uint256 public nextStakeId;

    struct StakeInfo {
        address staker;
        uint256 amount;
        uint256 startTime;
        uint256 unlockTime;
        bool withdrawn;
    }

    mapping(uint256 => StakeInfo) public stakes;
    mapping(address => uint256[]) public userStakeIds;

    event Staked(address indexed user, uint256 indexed stakeId, uint256 amount, uint256 unlockTime);
    event Unstaked(address indexed user, uint256 indexed stakeId, uint256 amount, uint256 unstakedAt);
    event LockDurationUpdated(uint256 oldDuration, uint256 newDuration);

    constructor(address _token, uint256 _lockDuration) Ownable(msg.sender) {
        require(_token != address(0), "Invalid token");
        require(_lockDuration > 0, "Invalid lock duration");
        stakingToken = IERC20(_token);
        lockDuration = _lockDuration;
        nextStakeId = 1;
    }

    /**
     * @dev Stake tokens with lock period
     * @param amount Amount of tokens to stake
     * @return stakeId The ID of the created stake
     */
    function stake(uint256 amount) external nonReentrant returns (uint256) {
        require(amount > 0, "Amount must be > 0");
        
        // Transfer tokens from staker to contract
        require(
            stakingToken.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        
        uint256 stakeId = nextStakeId++;
        uint256 startTime = block.timestamp;
        uint256 unlockTime = startTime + lockDuration;
        
        stakes[stakeId] = StakeInfo({
            staker: msg.sender,
            amount: amount,
            startTime: startTime,
            unlockTime: unlockTime,
            withdrawn: false
        });
        
        userStakeIds[msg.sender].push(stakeId);
        
        emit Staked(msg.sender, stakeId, amount, unlockTime);
        return stakeId;
    }

    /**
     * @dev Unstake tokens - INSTANT when eligible
     * @param stakeId ID of the stake to unstake
     */
    function unstake(uint256 stakeId) external nonReentrant {
        StakeInfo storage stakeInfo = stakes[stakeId];
        
        require(stakeInfo.staker == msg.sender, "Not stake owner");
        require(!stakeInfo.withdrawn, "Already withdrawn");
        
        // CRITICAL: Block-accurate check - unstake allowed at EXACTLY unlockTime
        require(
            block.timestamp >= stakeInfo.unlockTime,
            "Stake still locked"
        );
        
        stakeInfo.withdrawn = true;
        uint256 amount = stakeInfo.amount;
        
        // Transfer tokens back to staker
        require(
            stakingToken.transfer(msg.sender, amount),
            "Transfer failed"
        );
        
        emit Unstaked(msg.sender, stakeId, amount, block.timestamp);
    }

    /**
     * @dev Check if a stake can be unstaked
     * @param stakeId ID of the stake to check
     * @return canUnstakeNow True if unstaking is allowed
     */
    function canUnstake(uint256 stakeId) external view returns (bool) {
        StakeInfo storage stakeInfo = stakes[stakeId];
        
        if (stakeInfo.withdrawn || stakeInfo.amount == 0) {
            return false;
        }
        
        return block.timestamp >= stakeInfo.unlockTime;
    }

    /**
     * @dev Get stake information
     * @param stakeId ID of the stake
     * @return stakeInfo The stake information
     */
    function getStake(uint256 stakeId) external view returns (StakeInfo memory) {
        return stakes[stakeId];
    }

    /**
     * @dev Get all stake IDs for a user
     * @param user Address of the user
     * @return stakeIds Array of stake IDs
     */
    function getUserStakeIds(address user) external view returns (uint256[] memory) {
        return userStakeIds[user];
    }

    /**
     * @dev Get time remaining until unlock
     * @param stakeId ID of the stake
     * @return remaining Seconds remaining (0 if already unlocked)
     */
    function getTimeRemaining(uint256 stakeId) external view returns (uint256) {
        StakeInfo storage stakeInfo = stakes[stakeId];
        
        if (block.timestamp >= stakeInfo.unlockTime) {
            return 0;
        }
        
        return stakeInfo.unlockTime - block.timestamp;
    }

    /**
     * @dev Update lock duration for future stakes (owner only)
     * @param newDuration New lock duration in seconds
     */
    function setLockDuration(uint256 newDuration) external onlyOwner {
        require(newDuration > 0, "Invalid duration");
        uint256 oldDuration = lockDuration;
        lockDuration = newDuration;
        emit LockDurationUpdated(oldDuration, newDuration);
    }

    /**
     * @dev Emergency token rescue (owner only)
     * @param tokenAddress Token to rescue
     * @param to Recipient address
     * @param amount Amount to rescue
     */
    function rescueTokens(
        address tokenAddress,
        address to,
        uint256 amount
    ) external onlyOwner nonReentrant {
        require(to != address(0), "Invalid recipient");
        require(tokenAddress != address(0), "Invalid token");
        IERC20(tokenAddress).transfer(to, amount);
    }
}

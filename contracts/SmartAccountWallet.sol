// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SmartAccountWallet
 * @dev EIP-7702-inspired smart account wallet with delegated execution capabilities
 * Enables atomic unstaking via authorized delegates (e.g., auto-unstake bot)
 */
contract SmartAccountWallet {
    address public owner;
    mapping(address => bool) public authorizedDelegates;
    bool public paused;

    event Executed(address indexed target, bytes data, bytes result);
    event BatchExecuted(uint256 count);
    event DelegateAuthorized(address indexed delegate, bool status);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Paused(bool status);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyAuthorized() {
        require(msg.sender == owner || authorizedDelegates[msg.sender], "Not authorized");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Paused");
        _;
    }

    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    /**
     * @dev Execute a single call to a target contract
     * @param target The contract to call
     * @param data The call data
     */
    function execute(
        address target,
        bytes calldata data
    ) external onlyAuthorized whenNotPaused returns (bytes memory) {
        require(target != address(0), "Invalid target");
        
        (bool success, bytes memory result) = target.call(data);
        require(success, "Execution failed");
        
        emit Executed(target, data, result);
        return result;
    }

    /**
     * @dev Execute multiple calls atomically
     * @param targets Array of contract addresses to call
     * @param datas Array of call data
     */
    function executeBatch(
        address[] calldata targets,
        bytes[] calldata datas
    ) external onlyAuthorized whenNotPaused returns (bytes[] memory) {
        require(targets.length == datas.length, "Length mismatch");
        require(targets.length > 0, "Empty batch");
        
        bytes[] memory results = new bytes[](targets.length);
        
        for (uint256 i = 0; i < targets.length; i++) {
            require(targets[i] != address(0), "Invalid target");
            (bool success, bytes memory result) = targets[i].call(datas[i]);
            require(success, "Batch execution failed");
            results[i] = result;
            emit Executed(targets[i], datas[i], result);
        }
        
        emit BatchExecuted(targets.length);
        return results;
    }

    /**
     * @dev Authorize or deauthorize a delegate
     * @param delegate Address to authorize/deauthorize
     * @param status True to authorize, false to deauthorize
     */
    function authorize(address delegate, bool status) external onlyOwner {
        require(delegate != address(0), "Invalid delegate");
        authorizedDelegates[delegate] = status;
        emit DelegateAuthorized(delegate, status);
    }

    /**
     * @dev Transfer ownership
     * @param newOwner New owner address
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid new owner");
        address oldOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }

    /**
     * @dev Pause/unpause the contract
     * @param status True to pause, false to unpause
     */
    function setPaused(bool status) external onlyOwner {
        paused = status;
        emit Paused(status);
    }

    /**
     * @dev Check if an address is authorized
     * @param delegate Address to check
     */
    function isAuthorized(address delegate) external view returns (bool) {
        return delegate == owner || authorizedDelegates[delegate];
    }

    /**
     * @dev Receive ETH
     */
    receive() external payable {}
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title SubscriptionRegistry
 * @notice Pay-with-MNT monthly subscriptions to LeapVault agents.
 *
 *         Each agent slug can have a Plan with a per-month price (in wei) and
 *         a recipient address (the agent owner). When a user calls
 *         `subscribe(slug, months)` with attached MNT, the contract:
 *           - pays `marketplaceFeeBps` of the total to the treasury,
 *           - forwards the rest to the agent owner,
 *           - extends the user's `subscribedUntil[slug][user]` by `months * 30 days`
 *             (from now if expired, or from current expiry if still active).
 *
 *         Off-chain (server) reads `isActive(slug, user)` before allowing
 *         agent runs for paid agents. Free agents have no Plan and are
 *         unrestricted.
 *
 *         Designed for low-cost writes on Mantle Sepolia first; the same
 *         contract works on Mantle mainnet without changes.
 */
contract SubscriptionRegistry {
    struct Plan {
        uint128 pricePerMonth; // wei
        address recipient;     // agent owner, paid 100% - fee on each subscribe
        bool active;
    }

    address public immutable deployer;
    address public treasury;
    uint16 public marketplaceFeeBps; // basis points, e.g. 1500 = 15%

    mapping(bytes32 => Plan) public plans;
    mapping(bytes32 => mapping(address => uint64)) public subscribedUntil;

    event PlanSet(bytes32 indexed agentSlug, uint128 pricePerMonth, address recipient);
    event Subscribed(
        address indexed user,
        bytes32 indexed agentSlug,
        uint8 months,
        uint64 expiresAt,
        uint256 amountPaid,
        uint256 marketplaceFee
    );
    event TreasuryRotated(address indexed previous, address indexed current);
    event FeeBpsChanged(uint16 previous, uint16 current);

    error NotDeployer();
    error PlanInactive();
    error InsufficientPayment();
    error TransferFailed();
    error InvalidMonths();
    error FeeTooHigh();
    error ZeroAddress();

    uint64 private constant SECONDS_PER_MONTH = 30 days;
    uint8 private constant MAX_MONTHS = 36;
    uint16 private constant MAX_FEE_BPS = 5000; // 50% absolute ceiling

    modifier onlyDeployer() {
        if (msg.sender != deployer) revert NotDeployer();
        _;
    }

    constructor(address initialTreasury, uint16 initialFeeBps) {
        if (initialTreasury == address(0)) revert ZeroAddress();
        if (initialFeeBps > MAX_FEE_BPS) revert FeeTooHigh();
        deployer = msg.sender;
        treasury = initialTreasury;
        marketplaceFeeBps = initialFeeBps;
        emit TreasuryRotated(address(0), initialTreasury);
        emit FeeBpsChanged(0, initialFeeBps);
    }

    /// @notice Set the plan for an agent. Deployer only.
    /// @param agentSlug keccak256 of the agent slug (e.g. "rwa-yield-risk")
    /// @param pricePerMonth wei charged per month subscribed. Set 0 to disable.
    /// @param recipient agent owner address that receives the post-fee payout
    function setPlan(
        bytes32 agentSlug,
        uint128 pricePerMonth,
        address recipient
    ) external onlyDeployer {
        if (pricePerMonth > 0 && recipient == address(0)) revert ZeroAddress();
        plans[agentSlug] = Plan({
            pricePerMonth: pricePerMonth,
            recipient: recipient,
            active: pricePerMonth > 0
        });
        emit PlanSet(agentSlug, pricePerMonth, recipient);
    }

    /// @notice Subscribe (or extend) to an agent for `months` months. Send the
    ///         exact total in MNT; overpayment is refunded.
    function subscribe(bytes32 agentSlug, uint8 months) external payable {
        if (months == 0 || months > MAX_MONTHS) revert InvalidMonths();
        Plan memory p = plans[agentSlug];
        if (!p.active) revert PlanInactive();

        uint256 total = uint256(p.pricePerMonth) * months;
        if (msg.value < total) revert InsufficientPayment();

        uint256 fee = (total * marketplaceFeeBps) / 10_000;
        uint256 payout = total - fee;

        uint64 current = subscribedUntil[agentSlug][msg.sender];
        uint64 base = current > block.timestamp ? current : uint64(block.timestamp);
        uint64 newExpiry = base + uint64(months) * SECONDS_PER_MONTH;
        subscribedUntil[agentSlug][msg.sender] = newExpiry;

        if (fee > 0) {
            (bool ok1, ) = treasury.call{value: fee}("");
            if (!ok1) revert TransferFailed();
        }
        if (payout > 0) {
            (bool ok2, ) = p.recipient.call{value: payout}("");
            if (!ok2) revert TransferFailed();
        }
        if (msg.value > total) {
            (bool ok3, ) = msg.sender.call{value: msg.value - total}("");
            if (!ok3) revert TransferFailed();
        }

        emit Subscribed(msg.sender, agentSlug, months, newExpiry, total, fee);
    }

    function isActive(bytes32 agentSlug, address user) external view returns (bool) {
        return subscribedUntil[agentSlug][user] > block.timestamp;
    }

    function expiresAt(bytes32 agentSlug, address user) external view returns (uint64) {
        return subscribedUntil[agentSlug][user];
    }

    function getPlan(bytes32 agentSlug) external view returns (Plan memory) {
        return plans[agentSlug];
    }

    function setTreasury(address newTreasury) external onlyDeployer {
        if (newTreasury == address(0)) revert ZeroAddress();
        emit TreasuryRotated(treasury, newTreasury);
        treasury = newTreasury;
    }

    function setFeeBps(uint16 newBps) external onlyDeployer {
        if (newBps > MAX_FEE_BPS) revert FeeTooHigh();
        emit FeeBpsChanged(marketplaceFeeBps, newBps);
        marketplaceFeeBps = newBps;
    }
}

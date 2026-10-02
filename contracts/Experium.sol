// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract DIDRegistry {
    mapping(address => string) public didOf;
    event DIDCreated(address indexed owner, string did, uint256 time);

    function createDID() external {
        require(bytes(didOf[msg.sender]).length == 0, "DID exists");
        string memory d = string.concat("did:ethr:", Strings.toHexString(uint160(msg.sender), 20));
        didOf[msg.sender] = d;
        emit DIDCreated(msg.sender, d, block.timestamp);
    }

    function hasDID(address a) external view returns (bool) {
        return bytes(didOf[a]).length > 0;
    }
}

contract AssetNFT is ERC721URIStorage, AccessControl {
    bytes32 public constant MANAGER = keccak256("MANAGER");
    bytes32 public constant AUDITOR = keccak256("AUDITOR");
    
    DIDRegistry public registry;
    uint256 public nextId = 1;
    
    mapping(uint256 => address) public issuerOf;
    mapping(uint256 => bool) public soulbound;
    
    event AssetMinted(uint256 indexed tokenId, address indexed to, address indexed issuer, string uri);

    modifier onlyManagerOrAdmin() {
        require(hasRole(MANAGER, msg.sender) || hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Caller is not a manager or admin");
        _;
    }

    modifier onlyAuditorOrAdmin() {
        require(hasRole(AUDITOR, msg.sender) || hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Caller is not an auditor or admin");
        _;
    }

    constructor(address reg) ERC721("Experium Asset", "EXP") {
        registry = DIDRegistry(reg);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function mint(address to, string calldata uri, bool sb) external onlyManagerOrAdmin returns (uint256 id) {
        require(registry.hasDID(to), "recipient has no DID");
        id = nextId++;
        _mint(to, id);
        _setTokenURI(id, uri);
        issuerOf[id] = msg.sender;
        soulbound[id] = sb;
        emit AssetMinted(id, to, msg.sender, uri);
    }

    // Auditors get an exclusive function to read detailed full asset data
    function getAuditDetails(uint256 id) external view onlyAuditorOrAdmin returns (address owner, address issuer, string memory uri, bool isSoulbound) {
        require(_ownerOf(id) != address(0), "Token does not exist");
        return (ownerOf(id), issuerOf[id], tokenURI(id), soulbound[id]);
    }

    // Block transfers of soulbound tokens (mint and burn are allowed)
    function _update(address to, uint256 id, address auth) internal override returns (address) {
        address currentOwner = _ownerOf(id);
        // If it's a transfer (not a mint and not a burn), check soulbound
        if (currentOwner != address(0) && to != address(0)) {
            require(!soulbound[id], "soulbound");
        }
        return super._update(to, id, auth);
    }

    function supportsInterface(bytes4 i) public view override(ERC721URIStorage, AccessControl) returns (bool) {
        return super.supportsInterface(i);
    }
}

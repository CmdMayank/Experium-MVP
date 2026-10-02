<p align="center">
  <img src="./assets/banner.svg" alt="Experium Banner" width="100%">
</p>


<div align="center">

<img src="assets/banner.svg" alt="Experium banner" width="100%"/>

<br/>

![Solidity](https://img.shields.io/badge/Solidity-0.8.20-363636?style=for-the-badge&logo=solidity&logoColor=white)
![OpenZeppelin](https://img.shields.io/badge/OpenZeppelin-v5-4E5EE4?style=for-the-badge&logo=openzeppelin&logoColor=white)
![Ethereum](https://img.shields.io/badge/Sepolia-Testnet-627EEA?style=for-the-badge&logo=ethereum&logoColor=white)
![ERC-721](https://img.shields.io/badge/Standard-ERC--721-2dd4bf?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**One platform where _who you are_, _what you may do_ and _what you own_ are enforced by smart contracts and open to audit.**

[🚀 Live Demo](#-quick-start) · [🎬 Demo Video](#-demo-walkthrough) · [📜 Contracts](#-smart-contracts) · [🗺️ Roadmap](#%EF%B8%8F-roadmap)

</div>

---

## 📑 Table of Contents

1. [The Problem](#-the-problem)
2. [Our Solution](#-our-solution)
3. [Core Features](#-core-features)
4. [How It Works](#-how-it-works)
5. [Role-Based Access Control](#-role-based-access-control)
6. [Architecture](#%EF%B8%8F-architecture)
7. [Smart Contracts](#-smart-contracts)
8. [Tech Stack](#%EF%B8%8F-tech-stack)
9. [Quick Start](#-quick-start)
10. [Demo Walkthrough](#-demo-walkthrough)
11. [Security and Trade-offs](#-security-and-trade-offs)
12. [Use Cases](#-use-cases)
13. [Roadmap](#%EF%B8%8F-roadmap)
14. [Team](#-team)

---

## 🔥 The Problem

Institutions issue credentials, grant permissions and record ownership in **separate, centralized systems**.

| | Pain point | Impact |
|---|---|---|
| 📄 | Forged degrees, licenses and ownership papers | Hard to detect, slow to verify |
| 🗄️ | Central databases are single points of failure | Records can be edited without a trace |
| 🧩 | Identity, permissions and assets are disconnected | Systems that don't trust each other |
| 🔑 | Users don't control their own identity | Platforms hold, lock or leak it |
| 🕵️ | Weak audit trails | Insider tampering is hard to prove |

## 💡 Our Solution

Experium gives every user a **decentralized identifier (DID)**, represents assets as **ERC-721 NFTs** bound to that identity, and governs every action through **role-based smart contracts**.

| ❌ Problem | ✅ Experium response |
|---|---|
| Forged documents | Unique NFTs verifiable by anyone on-chain |
| Slow verification | Instant owner + issuer check using the token ID |
| Central point of failure | Decentralized ledger, no single owner of records |
| Unauthorized actions | Smart-contract RBAC rejects calls outside a role |
| Disputed ownership | One NFT, one owner, full transfer history |
| Weak audit trail | Every action logged as an immutable on-chain event |

---

## ✨ Core Features

<table>
<tr>
<td width="33%" valign="top">

### 🪪 Decentralized Identity
One self-owned `did:ethr` identifier per wallet. No password, no central login server.

`DIDCreated(owner, did, time)`

</td>
<td width="33%" valign="top">

### 🎟️ Controlled NFT Minting
Only an **admin** can mint, and only to a wallet that **already holds a DID**.

`AssetMinted(tokenId, to, issuer, uri)`

</td>
<td width="33%" valign="top">

### 🔒 Soulbound Ownership
Credential NFTs can be **non-transferable**. A degree stays with the person it was issued to.

`Transfer reverts after mint`

</td>
</tr>
<tr>
<td width="33%" valign="top">

### 🛡️ Role-Based Access
Admin, Manager, Auditor and User roles via OpenZeppelin `AccessControl`.

`RoleGranted / RoleRevoked`

</td>
<td width="33%" valign="top">

### 🔍 Instant Public Verification
Enter a token ID and see owner, issuer and metadata. No login, no call to the issuer.

`ownerOf · issuerOf · tokenURI`

</td>
<td width="33%" valign="top">

### 📜 Tamper-Proof Audit Trail
Every action is stored as an on-chain event, in block order, and cannot be edited.

`Audit view reads queryFilter`

</td>
</tr>
</table>

---

## 🔄 How It Works

### The big picture

```mermaid
flowchart LR
    A(["👛 Wallet"]) -->|"createDID()"| B["🪪 DIDRegistry"]
    B --> C{"👑 Admin mints NFT"}
    C -->|"recipient has DID"| D["🎓 NFT bound to DID"]
    C -.->|"no DID"| X["❌ Reverted"]
    D --> E(["🔍 Anyone verifies by token ID"])
    D --> F[("📜 Immutable event log")]
    F --> G(["🧾 Auditor reviews history"])

    classDef good fill:#d1fae5,stroke:#059669,color:#064e3b;
    classDef bad fill:#ffe4e6,stroke:#e11d48,color:#881337;
    classDef core fill:#e0e7ff,stroke:#5b5bf0,color:#1e1b4b;
    class D,E,G good;
    class X bad;
    class B,C,F core;
```

### The golden path, step by step

```mermaid
sequenceDiagram
    autonumber
    actor S as 🎓 Student
    actor A as 👑 Admin
    actor R as 🕵️ Random wallet
    actor E as 💼 Employer
    actor U as 🧾 Auditor
    participant D as DIDRegistry
    participant N as AssetNFT
    participant L as Event Log

    S->>D: createDID()
    D-->>L: DIDCreated
    A->>N: grantRole(AUDITOR, auditor)
    N-->>L: RoleGranted
    A->>N: mint(student, uri, soulbound)
    N->>D: hasDID(student)?
    D-->>N: true
    N-->>L: AssetMinted
    R->>N: mint(...)
    N--xR: ❌ Revert: only ADMIN
    E->>N: ownerOf(1), issuerOf(1), tokenURI(1)
    N-->>E: ✅ Owner, issuer, metadata
    U->>L: queryFilter(all events)
    L-->>U: Full ordered history
```

### Soulbound token lifecycle

```mermaid
stateDiagram-v2
    [*] --> Minted: admin mint() to a DID holder
    Minted --> Soulbound: soulbound = true
    Minted --> Transferable: soulbound = false
    Soulbound --> Soulbound: transfer() ❌ reverts
    Transferable --> Transferable: transfer() ✅ to another DID holder
```

---

## 🛡️ Role-Based Access Control

Every protected function checks the caller's role **inside the contract** before it executes. The UI only hides buttons; it is never the enforcement layer.

```mermaid
flowchart TD
    C(["📞 Incoming call"]) --> R{"Caller has the required role?"}
    R -->|"No"| X["❌ Revert, nothing changes"]
    R -->|"Yes"| P{"Extra rule: recipient has DID?"}
    P -->|"No"| X
    P -->|"Yes"| OK["✅ State updated"]
    OK --> EV[("📜 Event emitted")]

    classDef good fill:#d1fae5,stroke:#059669,color:#064e3b;
    classDef bad fill:#ffe4e6,stroke:#e11d48,color:#881337;
    class OK,EV good;
    class X bad;
```

| Role | 🪙 Mint NFT | 🔑 Grant roles | 🔍 Verify assets | 📜 View audit log |
|---|:---:|:---:|:---:|:---:|
| 👑 **Admin** | ✅ | ✅ | ✅ | ✅ |
| 🧑‍💼 **Manager** | ❌ | ❌ | ✅ | ✅ |
| 🧾 **Auditor** | ❌ | ❌ | ✅ | ✅ |
| 👤 **User** | ❌ | ❌ | ✅ (any asset) | ❌ |

> **Core rules enforced on-chain:** only an admin can mint · a recipient must hold a DID · every call is role-checked · identity, minting, role changes and transfers are all logged.

---

## 🏗️ Architecture

> **No custom backend.** The blockchain is the database, MetaMask is the authentication layer, and on-chain events are the audit log.

```mermaid
flowchart TB
    U(["👤 User<br/>MetaMask wallet login"]) --> F["🖥️ Frontend dApp<br/>React + ethers.js on Vercel"]
    F --> P["🌐 RPC Provider<br/>Alchemy / Infura"]

    subgraph CHAIN ["⛓️ Sepolia Testnet: Smart Contract Layer"]
        direction LR
        D["🪪 DIDRegistry<br/>decentralized identities"]
        N["🎟️ AssetNFT<br/>ERC-721 + AccessControl"]
        L[("📜 Event Log<br/>immutable audit trail")]
        N -->|"hasDID()"| D
        D -.-> L
        N -.-> L
    end

    P --> CHAIN
    N -.->|"hash on-chain"| I["📁 IPFS / Pinata<br/>optional certificate files"]

    classDef ui fill:#e0e7ff,stroke:#5b5bf0,color:#1e1b4b;
    classDef sc fill:#ccfbf1,stroke:#14b8a6,color:#134e4a;
    class U,F,P ui;
    class D,N,L sc;
```

---

## 📜 Smart Contracts

Source: [`contracts/Experium.sol`](contracts/Experium.sol)

```mermaid
classDiagram
    class DIDRegistry {
        +mapping didOf
        +createDID()
        +hasDID(address) bool
        event DIDCreated
    }
    class AssetNFT {
        +bytes32 MANAGER
        +bytes32 AUDITOR
        +uint256 nextId
        +mapping issuerOf
        +mapping soulbound
        +mint(to, uri, soulbound) uint256
        event AssetMinted
    }
    class ERC721URIStorage
    class AccessControl
    AssetNFT --|> ERC721URIStorage
    AssetNFT --|> AccessControl
    AssetNFT --> DIDRegistry : checks hasDID
```

| Function | Who can call | Reverts when |
|---|---|---|
| `createDID()` | Any wallet | The wallet already has a DID |
| `mint(to, uri, soulbound)` | Admin only | Caller is not admin · recipient has no DID |
| `transfer*` | Token owner | Token is soulbound |
| `grantRole / revokeRole` | Admin only | Caller is not admin |
| `ownerOf · issuerOf · tokenURI` | Anyone | Token does not exist |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| ⛓️ Smart contracts | ![Solidity](https://img.shields.io/badge/Solidity-363636?logo=solidity&logoColor=white) ![OpenZeppelin](https://img.shields.io/badge/OpenZeppelin-4E5EE4?logo=openzeppelin&logoColor=white) |
| 🧪 Dev and network | ![Hardhat](https://img.shields.io/badge/Hardhat-F7DF1E?logo=ethereum&logoColor=black) ![Remix](https://img.shields.io/badge/Remix-000?logo=ethereum&logoColor=white) ![Sepolia](https://img.shields.io/badge/Sepolia-627EEA?logo=ethereum&logoColor=white) |
| 🖥️ Frontend | ![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white) ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black) ![ethers.js](https://img.shields.io/badge/ethers.js-2535A0?logo=ethereum&logoColor=white) |
| 👛 Wallet and RPC | ![MetaMask](https://img.shields.io/badge/MetaMask-F6851B?logo=metamask&logoColor=white) ![Alchemy](https://img.shields.io/badge/Alchemy-0C0C0E?logo=alchemy&logoColor=white) |
| 📁 Storage (optional) | ![IPFS](https://img.shields.io/badge/IPFS-65C2CB?logo=ipfs&logoColor=white) Pinata |
| 🚀 Hosting | ![Vercel](https://img.shields.io/badge/Vercel-000?logo=vercel&logoColor=white) ![GitHub](https://img.shields.io/badge/GitHub-181717?logo=github&logoColor=white) |

---

## 🚀 Quick Start

### ▶️ Run the demo (no wallet needed)

The MVP front-end runs the full Experium flow on a **simulated in-browser chain** that mirrors the contract rules, so it works instantly for demos.

```bash
git clone https://github.com/<your-username>/experium.git
cd experium
# just open index.html in your browser, or serve it:
npx serve .
```

🔗 **Live demo:** `[Vercel link]`  ·  🎬 **Backup video:** `[video link]`

### ⛓️ Deploy the contracts to Sepolia

1. Open [Remix](https://remix.ethereum.org) and paste `contracts/Experium.sol`.
2. Compile with Solidity `0.8.20` or newer.
3. Connect MetaMask to **Sepolia** (get test ETH from a faucet).
4. Deploy `DIDRegistry`.
5. Deploy `AssetNFT`, passing the `DIDRegistry` address to the constructor.
6. Save both addresses here:

| Contract | Address |
|---|---|
| DIDRegistry | `[explorer link]` |
| AssetNFT | `[explorer link]` |

---

## 🎬 Demo Walkthrough

A three-minute walkthrough using three pre-funded wallets: **Admin**, **Student** and **Auditor**.

```mermaid
flowchart LR
    S1["1️⃣ Connect<br/>wallet"] --> S2["2️⃣ Create<br/>DID"] --> S3["3️⃣ Admin<br/>assigns role"] --> S4["4️⃣ Mint NFT<br/>to DID"] --> S5["5️⃣ Anyone<br/>verifies"] --> S6["6️⃣ Auditor<br/>reviews log"]
```

| Step | Actor | Action and result |
|:---:|---|---|
| 1 | 🎓 Student | Connects wallet and creates a DID; identity appears on screen |
| 2 | 👑 Admin | Grants Manager and Auditor roles; `RoleGranted` event logged |
| 3 | 👑 Admin | Mints a degree NFT to the student's DID |
| 4 | 🕵️ Random wallet | Tries to mint and is **rejected**: only admins can issue |
| 5 | 💼 Employer | Enters the token ID and sees owner, issuer and metadata instantly |
| 6 | 🧾 Auditor | Opens the audit view and sees every action in order |

> ✅ **Success criteria:** a new user can create a DID, receive an NFT from an admin and have it verified by a third party in seconds. Any unauthorized attempt is rejected on-chain and visible in the audit log.

---

## 🔐 Security and Trade-offs

| Concern | Approach |
|---|---|
| 🛡️ Enforcement | Permissions are checked inside the contract; the UI only hides buttons |
| 🕶️ Privacy | Sensitive files stay off-chain (IPFS); only hashes are stored on-chain |
| 🔑 Key loss | Social recovery planned as a post-MVP milestone |
| 💸 Cost | Testnet for the MVP; Layer-2 or permissioned chain for production |

> ⚠️ **MVP note:** this is a hackathon prototype. The contracts have not been professionally audited and should not be used with real assets.

---

## 🌍 Use Cases

| | Domain | Example |
|---|---|---|
| 🎓 | **Education** | Degree and certificate verification |
| 🏠 | **Land and property** | Records and duplicate-sale prevention |
| 🏥 | **Healthcare** | Patient-owned records shared by permission |
| 🏛️ | **Government** | Licenses and permits |
| 📦 | **Supply chain** | Product authenticity and traceability |

The same core engine powers all of them; only the NFT metadata changes.

### Who benefits

| Stakeholder | Benefit |
|---|---|
| 🏫 Institutions | Lower fraud and verification workload; one trusted record of issuance |
| 👤 Individuals | Own and prove identity and credentials without a middleman |
| 💼 Employers / verifiers | Instant, independent trust with no call to the issuer |
| 🧾 Regulators / auditors | Ready-made, tamper-proof audit trail |

---

## 🗺️ Roadmap

- [x] DIDRegistry and AssetNFT with OpenZeppelin
- [x] Role-based access control (Admin, Manager, Auditor, User)
- [x] Soulbound credential NFTs
- [x] Interactive demo front-end (simulated chain)
- [x] Audit log view
- [ ] Live Sepolia mode with MetaMask + ethers.js
- [ ] Hardhat test suite and deployment scripts
- [ ] IPFS / Pinata storage for certificate files
- [ ] Shareable verification links and QR codes
- [ ] Social recovery for lost keys
- [ ] Layer-2 or permissioned-chain deployment

---

## 📂 Project Structure

```
experium/
├── assets/
│   └── banner.svg
├── contracts/
│   └── Experium.sol      # DIDRegistry + AssetNFT
├── index.html            # Demo front-end
└── README.md
```

---



---

<div align="center">

**Experium** · Making identity, access and ownership verifiable for everyone.

⭐ If you like this project, give it a star!

</div>

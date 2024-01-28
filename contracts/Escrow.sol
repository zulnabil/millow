//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IERC721 {
    function transferFrom(address _from, address _to, uint256 _id) external;
}

contract Escrow {
    address public nftAddress;
    address payable public seller;
    address public inspector;
    address public lender;

    mapping(uint256 => bool) public isListed;
    mapping(uint256 => uint256) public purchasePrice;
    mapping(uint256 => uint256) public escrowAmount;
    mapping(uint256 => address) public buyer;
    mapping(uint256 => bool) public inspectionPassed;
    mapping(uint256 => mapping(address => bool)) public approval;

    modifier onlySeller() {
        require(
            msg.sender == seller,
            "Only the seller can call this function."
        );
        _;
    }

    modifier onlyBuyer(uint256 _nftID) {
        require(
            msg.sender == buyer[_nftID],
            "Only the buyer can call this function."
        );
        _;
    }

    modifier onlyInspector() {
        require(
            msg.sender == inspector,
            "Only the inspector can call this function."
        );
        _;
    }

    modifier onlyLender() {
        require(
            msg.sender == lender,
            "Only the lender can call this function."
        );
        _;
    }

    modifier enoughBalance(uint256 _nftID) {
        require(
            msg.value >= escrowAmount[_nftID],
            "Deposit amount does not match escrow amount."
        );
        _;
    }

    modifier isNFTListed(uint256 _nftID) {
        require(isListed[_nftID], "NFT is not listed.");
        _;
    }

    constructor(
        address _nftAddress,
        address payable _seller,
        address _inspector,
        address _lender
    ) {
        nftAddress = _nftAddress;
        seller = _seller;
        inspector = _inspector;
        lender = _lender;
    }

    function list(
        uint256 _nftID,
        address _buyer,
        uint256 _purchasePrice,
        uint256 _escrowAmount
    ) public payable onlySeller {
        // Transfer the NFT to this contract
        IERC721(nftAddress).transferFrom(msg.sender, address(this), _nftID);

        // Mark the NFT as listed
        isListed[_nftID] = true;
        buyer[_nftID] = _buyer;
        purchasePrice[_nftID] = _purchasePrice;
        escrowAmount[_nftID] = _escrowAmount;
    }

    function depositEarnest(
        uint256 _nftID
    )
        public
        payable
        onlyBuyer(_nftID)
        enoughBalance(_nftID)
        isNFTListed(_nftID)
    {}

    function updateInspectionStatus(
        uint256 _nftID,
        bool _passed
    ) public onlyInspector {
        inspectionPassed[_nftID] = _passed;
    }

    function approveSale(uint256 _nftID) public {
        approval[_nftID][msg.sender] = true;
    }

    receive() external payable {}

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }

    function finalizeSale(uint256 _nftID) public {
        require(inspectionPassed[_nftID], "Inspection has not passed.");
        require(
            approval[_nftID][seller] &&
                approval[_nftID][buyer[_nftID]] &&
                approval[_nftID][lender],
            "Not all parties have approved the sale."
        );
        require(
            address(this).balance >= purchasePrice[_nftID],
            "Not enough balance to finalize sale."
        );
    }
}
